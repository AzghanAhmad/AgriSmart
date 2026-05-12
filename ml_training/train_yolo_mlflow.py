#!/usr/bin/env python3
"""
Train Ultralytics YOLO with optional MLflow logging to DagsHub.

Run from repo root (recommended):
  pip install -r ml_training/requirements.txt
  set MLFLOW_TRACKING_ENABLED=1
  set DAGSHUB_USERNAME=...
  set DAGSHUB_REPO_NAME=...
  set DAGSHUB_TOKEN=...

  # Use a real path to your Ultralytics dataset YAML. Do not use angle brackets
  # in PowerShell — they are redirection operators, not placeholders.
  python ml_training/train_yolo_mlflow.py --crop wheat --data datasets/wheat/data.yaml --epochs 50

  # PowerShell example with a Windows path:
  python ml_training/train_yolo_mlflow.py --crop wheat --data C:\\data\\wheat\\data.yaml --epochs 20

Does not start MLflow model serving.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from importlib.metadata import version as _pkg_version
except ImportError:
    _pkg_version = None  # type: ignore


def _pkg_ver(name: str) -> str:
    if not _pkg_version:
        return "unknown"
    try:
        return _pkg_version(name)
    except Exception:
        return "unknown"

# Repo root on path for `common.*`
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def _read_results_csv_last_row(csv_path: Path) -> Dict[str, float]:
    try:
        import pandas as pd
    except ImportError:
        return {}
    if not csv_path.is_file():
        return {}
    try:
        df = pd.read_csv(csv_path)
        if df.empty:
            return {}
        last = df.iloc[-1]
        out: Dict[str, float] = {}
        for col in df.columns:
            val = last[col]
            try:
                out[str(col).replace("/", "_")] = float(val)
            except (TypeError, ValueError):
                pass
        return out
    except Exception:
        return {}


def _find_train_dirs(project: Path, name: str) -> Path:
    # Ultralytics: project/name/
    return project / name


def resolve_dataset_config(raw: str, repo_root: Path) -> str:
    """
    Resolve --data to an absolute YAML path, or pass through Ultralytics shorthands
    (e.g. coco8.yaml) unchanged.
    """
    raw_s = raw.strip()
    p = Path(raw_s).expanduser()
    if p.is_file():
        return str(p.resolve())
    q = repo_root / raw_s
    if q.is_file():
        return str(q.resolve())
    # Bare *.yaml names are resolved by Ultralytics (downloads / package data).
    name_only = Path(raw_s.replace("\\", "/")).name
    is_bare = raw_s.replace("\\", "/") == name_only
    if is_bare and Path(name_only).suffix.lower() in (".yaml", ".yml"):
        return raw_s
    tried_cwd = str(p.resolve())
    tried_repo = str((repo_root / raw_s).resolve())
    raise FileNotFoundError(
        f"Dataset config not found: {raw!r}\n"
        f"  Tried: {tried_cwd}\n"
        f"  Tried: {tried_repo}\n"
        "Put a data.yaml on disk (see datasets/wheat/ in this repo) or smoke-test with:\n"
        "  python ml_training/train_yolo_mlflow.py --crop wheat --data coco8.yaml --epochs 1"
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="YOLO training with optional MLflow tracking",
        epilog=(
            "PowerShell: do not use angle brackets in paths. Example: "
            "--data datasets/wheat/data.yaml (after you add images/labels). "
            "Quick MLflow smoke test without your data: --data coco8.yaml --epochs 1"
        ),
    )
    parser.add_argument("--crop", required=True, choices=("wheat", "rice", "cotton"))
    parser.add_argument(
        "--data",
        required=True,
        help="Dataset YAML (absolute, cwd-relative, or repo-relative). Shorthand: coco8.yaml",
    )
    parser.add_argument("--weights", default="yolov8n.pt", help="Initial weights")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--optimizer", default="auto")
    parser.add_argument("--lr0", type=float, default=None, help="Override initial lr if set")
    parser.add_argument("--project", default=str(_ROOT / "runs" / "yolo_train"))
    parser.add_argument("--name", default="train", help="Ultralytics run name / subfolder")
    parser.add_argument("--model-version", default=os.getenv("AGRISMART_MODEL_VERSION", ""))
    parser.add_argument("--dataset-version", default=os.getenv("DVC_DATASET_REV", ""))
    parser.add_argument("--dvc-artifact-ref", default=os.getenv("DVC_ARTIFACT_REF", ""))
    parser.add_argument("--experiment", default="agrismart-yolo")
    args = parser.parse_args()

    try:
        data_yaml = resolve_dataset_config(args.data, _ROOT)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 2

    from ultralytics import YOLO

    from common.mlflow_utils import (
        get_active_run_id,
        init_dagshub_mlflow,
        log_artifact_safe,
        log_metrics_safe,
        log_params_safe,
        start_run_safe,
    )
    from common.model_metadata import update_crop_entry

    t0 = time.perf_counter()
    model = YOLO(args.weights)

    train_kwargs: Dict[str, Any] = {
        "data": data_yaml,
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "device": args.device,
        "project": args.project,
        "name": args.name,
        "exist_ok": True,
    }
    if args.optimizer and args.optimizer != "auto":
        train_kwargs["optimizer"] = args.optimizer
    if args.lr0 is not None:
        train_kwargs["lr0"] = args.lr0

    version = args.model_version or time.strftime("%Y%m%d-%H%M%S", time.gmtime())

    run_name = f"{args.crop}-{args.name}-{version}"
    tags = {"crop": args.crop, "component": "yolo_train"}

    run_id: Optional[str] = None
    with start_run_safe(experiment_name=args.experiment, run_name=run_name, tags=tags) as _:
        if init_dagshub_mlflow():
            log_params_safe(
                {
                    "crop": args.crop,
                    "weights": args.weights,
                    "epochs": args.epochs,
                    "imgsz": args.imgsz,
                    "batch": args.batch,
                    "device": args.device,
                    "optimizer": train_kwargs.get("optimizer", args.optimizer),
                    "lr0": train_kwargs.get("lr0", "auto"),
                    "dataset_yaml": data_yaml,
                    "dataset_version": args.dataset_version or "unspecified",
                    "model_version": version,
                    "ultralytics": _pkg_ver("ultralytics"),
                }
            )

        results = model.train(**train_kwargs)
        run_id = get_active_run_id()

        train_dir = _find_train_dirs(Path(args.project), args.name)
        weights_best = train_dir / "weights" / "best.pt"
        results_csv = train_dir / "results.csv"
        confusion = train_dir / "confusion_matrix.png"
        confusion_norm = train_dir / "confusion_matrix_normalized.png"
        results_png = train_dir / "results.png"

        metrics_row = _read_results_csv_last_row(results_csv)
        # Promote common YOLO column names if present
        duration = time.perf_counter() - t0
        metrics_row["training_duration_sec"] = duration

        # Pull validation metrics from results object when available
        try:
            rdict = results.results_dict if hasattr(results, "results_dict") else {}
            for k, v in (rdict or {}).items():
                if isinstance(v, (int, float)):
                    metrics_row.setdefault(str(k).replace("/", "_"), float(v))
        except Exception:
            pass

        log_metrics_safe(metrics_row)

        if weights_best.is_file():
            log_artifact_safe(str(weights_best), artifact_path="weights")
        for p in (confusion, confusion_norm, results_png):
            if p.is_file():
                log_artifact_safe(str(p), artifact_path="plots")

    # Metadata file (always update best-effort, even if MLflow off)
    extra: Dict[str, Any] = {
        "train_project": args.project,
        "train_name": args.name,
        "data_yaml": data_yaml,
    }
    try:
        extra["trainer_args"] = {k: str(v) for k, v in train_kwargs.items()}
    except Exception:
        pass

    update_crop_entry(
        args.crop,
        model_name=Path(args.weights).stem,
        version=version,
        framework="ultralytics-yolo",
        dataset_version=args.dataset_version or None,
        mlflow_run_id=run_id,
        dvc_artifact_ref=args.dvc_artifact_ref or None,
        weights_path=str(weights_best.resolve()) if weights_best.is_file() else None,
        extra=extra,
    )

    print(json.dumps({"status": "ok", "crop": args.crop, "weights": str(weights_best), "mlflow_run_id": run_id}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

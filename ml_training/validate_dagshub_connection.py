#!/usr/bin/env python3
"""
Quick check: DagsHub repo + MLflow tracking URI + optional DVC remote (read-only).

Requires the same env as training:
  MLFLOW_TRACKING_ENABLED=1
  DAGSHUB_USERNAME (or DAGSHUB_REPO_OWNER)
  DAGSHUB_REPO_NAME
  DAGSHUB_TOKEN

Run from repo root: python ml_training/validate_dagshub_connection.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def main() -> int:
    os.environ.setdefault("MLFLOW_TRACKING_ENABLED", "1")
    from common import mlflow_utils

    ok = mlflow_utils.init_dagshub_mlflow(force=True)
    print("dagshub_mlflow_init:", ok)
    if not ok:
        print("Set MLFLOW_TRACKING_ENABLED=1, DAGSHUB_USERNAME, DAGSHUB_REPO_NAME, DAGSHUB_TOKEN.")
        return 1

    try:
        import mlflow

        exp = mlflow.set_experiment(os.getenv("MLFLOW_VALIDATION_EXPERIMENT", "agrismart-connectivity"))
        print("experiment_id:", exp.experiment_id if exp else None)
        with mlflow.start_run(run_name="connectivity-check") as run:
            mlflow.log_param("check", "dagshub_mlflow")
            mlflow.log_metric("ok", 1.0)
            print("run_id:", run.info.run_id)
        print("MLflow: logged test run OK")
    except Exception as exc:
        print("MLflow error:", exc)
        return 2

    # DVC: optional, does not fail validation if absent
    try:
        import subprocess

        r = subprocess.run(
            ["dvc", "status"],
            cwd=_ROOT,
            capture_output=True,
            text=True,
            timeout=60,
        )
        print("dvc status exit:", r.returncode)
        if r.stdout:
            print(r.stdout[:2000])
    except FileNotFoundError:
        print("dvc: not installed (optional)")
    except Exception as exc:
        print("dvc check skipped:", exc)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

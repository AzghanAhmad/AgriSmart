"""
Read/write models/metadata.json for lightweight model governance (no serving).
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _repo_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def default_metadata_path() -> str:
    return os.path.join(_repo_root(), "models", "metadata.json")


def load_metadata(path: Optional[str] = None) -> Dict[str, Any]:
    p = path or default_metadata_path()
    if not os.path.isfile(p):
        return {"schema_version": 1, "models": {}}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _atomic_write_json(path: str, data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix="metadata_", suffix=".json", dir=os.path.dirname(path))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass


def update_crop_entry(
    crop: str,
    *,
    model_name: str,
    version: str,
    framework: str,
    dataset_version: Optional[str] = None,
    training_timestamp_iso: Optional[str] = None,
    mlflow_run_id: Optional[str] = None,
    dvc_artifact_ref: Optional[str] = None,
    weights_path: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
    path: Optional[str] = None,
) -> Dict[str, Any]:
    """Merge one crop entry into models/metadata.json and return the full document."""
    meta_path = path or default_metadata_path()
    doc = load_metadata(meta_path)
    doc.setdefault("schema_version", 1)
    models = doc.setdefault("models", {})
    ts = training_timestamp_iso or datetime.now(timezone.utc).isoformat()
    entry: Dict[str, Any] = {
        "model_name": model_name,
        "version": version,
        "framework": framework,
        "dataset_version": dataset_version,
        "training_timestamp": ts,
        "mlflow_run_id": mlflow_run_id,
        "dvc_artifact_ref": dvc_artifact_ref,
        "weights_path": weights_path,
    }
    if extra:
        entry["extra"] = extra
    models[crop] = {k: v for k, v in entry.items() if v is not None}
    _atomic_write_json(meta_path, doc)
    return doc

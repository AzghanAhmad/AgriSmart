"""
Optional DagsHub + MLflow helpers for experiment tracking.

- No credentials in code; use DAGSHUB_TOKEN, DAGSHUB_USERNAME (and repo name).
- Safe for inference / production paths: failures are logged and swallowed.
- Inference services should not require mlflow/dagshub installed.
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import contextmanager
from typing import Any, Iterator, Mapping, Optional

logger = logging.getLogger(__name__)

_INIT_OK: Optional[bool] = None


def _env_truthy(name: str, default: str = "") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


def is_mlflow_tracking_enabled() -> bool:
    """Gate all tracking; default off so deployments stay stable."""
    return _env_truthy("MLFLOW_TRACKING_ENABLED")


def _repo_owner() -> Optional[str]:
    return (os.getenv("DAGSHUB_REPO_OWNER") or os.getenv("DAGSHUB_USERNAME") or "").strip() or None


def _repo_name() -> Optional[str]:
    return (os.getenv("DAGSHUB_REPO_NAME") or "").strip() or None


def _apply_mlflow_http_timeout() -> None:
    # mlflow uses requests; this caps hang time on remote tracking
    os.environ.setdefault("MLFLOW_HTTP_REQUEST_TIMEOUT", os.getenv("MLFLOW_HTTP_REQUEST_TIMEOUT", "45"))


def init_dagshub_mlflow(*, force: bool = False) -> bool:
    """
    Initialize dagshub + MLflow tracking URI. Idempotent; safe on repeated calls.
    Returns True if tracking client should be used.
    """
    global _INIT_OK
    if not is_mlflow_tracking_enabled():
        _INIT_OK = False
        return False
    if _INIT_OK is True and not force:
        return True

    owner = _repo_owner()
    repo = _repo_name()
    if not owner or not repo:
        logger.warning(
            "MLflow tracking enabled but DAGSHUB_REPO_OWNER (or DAGSHUB_USERNAME) "
            "and DAGSHUB_REPO_NAME are not both set; skipping init."
        )
        _INIT_OK = False
        return False

    token = (os.getenv("DAGSHUB_TOKEN") or "").strip()
    if token:
        os.environ.setdefault("MLFLOW_TRACKING_USERNAME", owner)
        os.environ.setdefault("MLFLOW_TRACKING_PASSWORD", token)

    _apply_mlflow_http_timeout()

    try:
        import dagshub  # type: ignore

        dagshub.init(repo_owner=owner, repo_name=repo, mlflow=True)
        _INIT_OK = True
        return True
    except ImportError:
        logger.warning("mlflow/dagshub not installed; tracking disabled for this process.")
        _INIT_OK = False
        return False
    except Exception as exc:
        logger.warning("DagsHub/MLflow init failed (non-fatal): %s", exc)
        _INIT_OK = False
        return False


def set_experiment(name: str) -> None:
    if not init_dagshub_mlflow():
        return
    try:
        import mlflow

        mlflow.set_experiment(name)
    except Exception as exc:
        logger.warning("mlflow.set_experiment failed (non-fatal): %s", exc)


@contextmanager
def start_run_safe(
    *,
    experiment_name: str,
    run_name: Optional[str] = None,
    tags: Optional[Mapping[str, str]] = None,
) -> Iterator[Any]:
    """
    Context manager yielding an mlflow.ActiveRun or None if tracking unavailable.
    """
    if not init_dagshub_mlflow():
        yield None
        return

    try:
        import mlflow
    except ImportError:
        logger.warning("mlflow not installed; skipping run.")
        yield None
        return

    set_experiment(experiment_name)
    last_exc: Optional[BaseException] = None
    for attempt in range(1, 4):
        try:
            with mlflow.start_run(run_name=run_name) as run:
                if tags:
                    for k, v in tags.items():
                        try:
                            mlflow.set_tag(k, str(v))
                        except Exception:
                            pass
                yield run
            return
        except Exception as exc:
            last_exc = exc
            logger.warning("mlflow.start_run attempt %s/3 failed: %s", attempt, exc)
            time.sleep(min(2**attempt, 8))
    logger.warning("mlflow.start_run abandoned after retries: %s", last_exc)
    yield None


def log_params_safe(params: Mapping[str, Any]) -> None:
    if not _INIT_OK:
        return
    try:
        import mlflow

        for k, v in params.items():
            if v is None:
                continue
            mlflow.log_param(str(k), v)
    except Exception as exc:
        logger.warning("mlflow log_param failed (non-fatal): %s", exc)


def log_metrics_safe(metrics: Mapping[str, Any], *, step: Optional[int] = None) -> None:
    if not _INIT_OK:
        return
    try:
        import mlflow

        for k, v in metrics.items():
            if v is None:
                continue
            try:
                fv = float(v)
            except (TypeError, ValueError):
                continue
            mlflow.log_metric(str(k), fv, step=step)
    except Exception as exc:
        logger.warning("mlflow log_metric failed (non-fatal): %s", exc)


def log_artifact_safe(path: str, *, artifact_path: Optional[str] = None) -> None:
    if not _INIT_OK or not path:
        return
    try:
        import mlflow

        if os.path.isfile(path):
            mlflow.log_artifact(path, artifact_path=artifact_path)
        elif os.path.isdir(path):
            mlflow.log_artifacts(path, artifact_path=artifact_path)
    except Exception as exc:
        logger.warning("mlflow log_artifact failed (non-fatal): %s", exc)


def end_run_safe(status: str = "FINISHED") -> None:
    if not _INIT_OK:
        return
    try:
        import mlflow

        mlflow.end_run(status=status)
    except Exception:
        pass


def get_active_run_id() -> Optional[str]:
    if not _INIT_OK:
        return None
    try:
        import mlflow

        run = mlflow.active_run()
        if run is None:
            return None
        return run.info.run_id
    except Exception:
        return None


def log_chatbot_ingest_run(
    *,
    experiment_name: str,
    num_documents: int,
    num_chunks: int,
    duration_sec: float,
    extra_params: Optional[Mapping[str, Any]] = None,
) -> None:
    """Lightweight optional run for vector store rebuilds (host/CI only)."""
    if not _env_truthy("MLFLOW_TRACK_CHATBOT_INGEST"):
        return
    if not is_mlflow_tracking_enabled():
        return

    try:
        import chromadb
    except ImportError:
        chromadb_version = "unknown"
    else:
        chromadb_version = getattr(chromadb, "__version__", "unknown")

    tags = {
        "pipeline": "chatbot_ingest",
        "embedding_model": os.getenv("AGRISMART_EMBEDDING_MODEL", ""),
    }
    params = {
        "embedding_model": os.getenv("AGRISMART_EMBEDDING_MODEL", ""),
        "chunk_size_tokens": int(os.getenv("AGRISMART_CHUNK_SIZE_TOKENS", "500")),
        "chunk_overlap_tokens": int(os.getenv("AGRISMART_CHUNK_OVERLAP_TOKENS", "100")),
        "vector_db": "chromadb",
        "chromadb_version": chromadb_version,
        "collection": os.getenv("AGRISMART_CHROMA_COLLECTION", "agrismart_docs"),
        "num_pdf_documents": num_documents,
        "num_chunks": num_chunks,
    }
    if extra_params:
        params.update(dict(extra_params))

    with start_run_safe(experiment_name=experiment_name, run_name="ingest", tags=tags) as _:
        log_params_safe(params)
        log_metrics_safe({"ingest_duration_sec": duration_sec, "num_chunks": float(num_chunks)})

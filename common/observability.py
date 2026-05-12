"""
Production-oriented observability for Flask services: correlation IDs, structured logs, Prometheus /metrics.
Enable JSON logs: AGRISMART_LOG_FORMAT=json
"""
from __future__ import annotations

import contextvars
import json
import logging
import os
import signal
import time
import uuid
from typing import TYPE_CHECKING

_request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)

if TYPE_CHECKING:
    from flask import Flask

try:
    from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

    _PROM = True
except ImportError:
    _PROM = False


def get_request_id() -> str | None:
    return _request_id_ctx.get()


def set_request_id(rid: str | None) -> None:
    _request_id_ctx.set(rid)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        rid = get_request_id()
        record.request_id = rid if rid else "-"
        return True


class JsonLogFormatter(logging.Formatter):
    """One JSON object per line for log aggregators (Loki, CloudWatch, etc.)."""

    def __init__(self, service_name: str) -> None:
        super().__init__()
        self._service = service_name

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "service": self._service,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


_METRICS_REGISTERED: dict[str, object] = {}


def _metrics_for_service(service_name: str):
    key = service_name.replace("-", "_")
    if key in _METRICS_REGISTERED:
        return _METRICS_REGISTERED[key]

    if not _PROM:
        _METRICS_REGISTERED[key] = False
        return False

    http_requests = Counter(
        "http_requests_total",
        "HTTP requests",
        ["service", "method", "handler", "status"],
    )
    http_latency = Histogram(
        "http_request_duration_seconds",
        "HTTP request latency",
        ["service", "method", "handler"],
        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0),
    )
    _METRICS_REGISTERED[key] = (http_requests, http_latency)
    return _METRICS_REGISTERED[key]


def register_signal_logging(logger: logging.Logger) -> None:
    def _on_term(signum: int, _frame) -> None:
        logger.info("shutdown_signal received signum=%s", signum)

    signal.signal(signal.SIGTERM, _on_term)
    signal.signal(signal.SIGINT, _on_term)


def register_flask_observability(app: "Flask", service_name: str, logger: logging.Logger) -> None:
    """Correlation ID, request timing logs, optional Prometheus /metrics."""
    app.logger.addFilter(RequestIdFilter())

    m = _metrics_for_service(service_name)

    @app.before_request
    def _obs_before():
        from flask import g, request

        hdr = (request.headers.get("X-Request-ID") or "").strip()
        rid = hdr if hdr else str(uuid.uuid4())
        set_request_id(rid)
        g.request_id = rid
        g._obs_start = time.perf_counter()

    @app.after_request
    def _obs_after(response):
        from flask import g, request

        rid = getattr(g, "request_id", None) or get_request_id() or "-"
        response.headers["X-Request-ID"] = rid

        elapsed = 0.0
        if hasattr(g, "_obs_start"):
            elapsed = time.perf_counter() - g._obs_start

        probe_paths = ("/health", "/ready", "/metrics", "/warmup")
        log_fn = logger.debug if request.path in probe_paths else logger.info
        log_fn(
            "http_request method=%s path=%s status=%s duration_ms=%.2f request_id=%s",
            request.method,
            request.path,
            response.status_code,
            elapsed * 1000.0,
            rid,
        )

        if isinstance(m, tuple) and request.path != "/metrics":
            http_requests, http_latency = m
            handler = (request.endpoint or "unknown").replace(".", "_")
            try:
                status_code = str(response.status_code)
                http_requests.labels(service_name, request.method, handler, status_code).inc()
                http_latency.labels(service_name, request.method, handler).observe(elapsed)
            except Exception:
                pass

        return response

    @app.route("/metrics")
    def metrics():
        if not _PROM:
            from flask import jsonify

            return jsonify({"error": "prometheus_client not installed"}), 501
        from flask import Response

        return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

    register_signal_logging(logger)
    logger.info("observability enabled service=%s prometheus=%s", service_name, bool(_PROM))

import logging
import os
import sys

from common.observability import JsonLogFormatter, RequestIdFilter


def configure_logging(service_name: str) -> logging.Logger:
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    log_format = (os.getenv("AGRISMART_LOG_FORMAT") or "text").strip().lower()
    use_json = log_format in ("json", "structured")

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.addFilter(RequestIdFilter())

    if use_json:
        handler.setFormatter(JsonLogFormatter(service_name))
    else:
        handler.setFormatter(
            logging.Formatter(
                f"%(asctime)s | %(levelname)s | {service_name} | %(name)s | "
                f"%(request_id)s | %(message)s"
            )
        )

    root.addHandler(handler)

    # Avoid duplicate logs from werkzeug if root already captures
    logging.getLogger("werkzeug").setLevel(logging.WARNING)

    logger = logging.getLogger(service_name)
    logger.setLevel(level)
    return logger

import datetime
import io
import logging
from typing import Optional

import requests
from PIL import Image

try:
    from ..config import (
        get_enable_local_yolo_fallback,
        get_internal_http_timeout,
        get_yolo_service_url,
    )
except ImportError:
    from config import (
        get_enable_local_yolo_fallback,
        get_internal_http_timeout,
        get_yolo_service_url,
    )

logger = logging.getLogger(__name__)


class UpstreamUnavailableError(Exception):
    pass


class UpstreamServiceError(Exception):
    def __init__(self, status_code: int, payload: dict):
        super().__init__(payload.get("error", "upstream service error"))
        self.status_code = status_code
        self.payload = payload


def _local_predict_from_bytes(image_bytes: bytes, crop_type: str) -> dict:
    # Lazy import so strict microservice deployments don't require ultralytics/torch in backend image
    try:
        from ..core.yolo import get_model_for_crop  # type: ignore
    except Exception:
        from core.yolo import get_model_for_crop  # type: ignore

    model = get_model_for_crop(crop_type)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    detections = model.predict(image)[0]

    prediction_list = []
    for box in detections.boxes:
        cls_id = int(box.cls)
        conf = float(box.conf)
        label = detections.names[cls_id]
        prediction_list.append({"label": label, "confidence": round(conf * 100, 2)})

    if not prediction_list:
        return {
            "cropType": crop_type,
            "disease": "Healthy Crop",
            "confidence": 100,
            "severity": "Low",
            "treatment": "No visible disease detected. Maintain proper irrigation and fertilizer balance.",
            "symptoms": ["Leaves appear normal", "No fungal or pest activity detected"],
            "prevention": ["Continue routine crop monitoring", "Use disease-resistant seeds"],
            "timestamp": datetime.datetime.now().isoformat(),
        }

    top_pred = prediction_list[0]
    severity = "High" if top_pred["confidence"] > 80 else "Medium"
    return {
        "cropType": crop_type,
        "disease": top_pred["label"],
        "confidence": top_pred["confidence"],
        "severity": severity,
        "treatment": "Apply recommended pesticide/fungicide as per NARC or FAO guidelines.",
        "symptoms": ["Lesions or discoloration detected on leaves", "Possible fungal or bacterial infection"],
        "prevention": ["Use resistant crop variety", "Avoid overwatering", "Ensure balanced fertilization"],
        "timestamp": datetime.datetime.now().isoformat(),
    }


def predict_from_bytes(image_bytes: bytes, crop_type: str) -> dict:
    crop_type = (crop_type or "").strip().lower()
    yolo_service_url = get_yolo_service_url().rstrip("/")
    timeout = get_internal_http_timeout()
    enable_local_fallback = get_enable_local_yolo_fallback()

    if yolo_service_url:
        files = {"file": ("image.jpg", io.BytesIO(image_bytes), "application/octet-stream")}
        try:
            resp = requests.post(
                f"{yolo_service_url}/predict",
                data={"cropType": crop_type},
                files=files,
                timeout=timeout,
            )
            payload = resp.json()
            if resp.status_code >= 400:
                raise UpstreamServiceError(resp.status_code, payload if isinstance(payload, dict) else {"error": "yolo-service error"})
            return payload
        except requests.RequestException as exc:
            if not enable_local_fallback:
                logger.error("yolo-service unavailable and local fallback disabled: %s", exc)
                raise UpstreamUnavailableError("yolo-service unavailable")
            logger.warning("yolo-service request failed, triggering local fallback: %s", exc)

    if not yolo_service_url and not enable_local_fallback:
        logger.error("YOLO_SERVICE_URL is not set and local fallback is disabled")
        raise UpstreamUnavailableError("yolo-service unavailable")

    return _local_predict_from_bytes(image_bytes, crop_type)


def predict_from_filestorage(file_obj, crop_type: str) -> tuple[Optional[dict], Optional[dict], int]:
    """
    Returns (prediction, error_payload, status_code).
    """
    try:
        image_bytes = file_obj.read()
        prediction = predict_from_bytes(image_bytes=image_bytes, crop_type=crop_type)
        return prediction, None, 200
    except (ValueError, FileNotFoundError) as exc:
        return None, {"error": str(exc)}, 400
    except UpstreamServiceError as exc:
        return None, exc.payload, exc.status_code
    except UpstreamUnavailableError:
        return (
            None,
            {
                "status": "degraded",
                "service": "backend",
                "upstream": "yolo-service",
                "error": "yolo-service unavailable",
            },
            503,
        )
    except Exception as exc:
        logger.exception("YOLO prediction failed: %s", exc)
        return None, {"error": "Internal server error"}, 500

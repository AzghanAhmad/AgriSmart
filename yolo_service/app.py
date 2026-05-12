import datetime
import io
import logging
import os
import time

from flask import Flask, jsonify, request
from PIL import Image

try:
    from .core.yolo import get_model_for_crop, validate_dvc_model_paths
    from .config import get_service_port
    from common.logging_utils import configure_logging
except ImportError:
    from yolo_service.core.yolo import get_model_for_crop, validate_dvc_model_paths
    from yolo_service.config import get_service_port
    from common.logging_utils import configure_logging

app = Flask(__name__)
logger = configure_logging("yolo-service")

try:
    from common.observability import register_flask_observability

    register_flask_observability(app, "yolo-service", logger)
except Exception as obs_exc:
    logger.warning("Observability not fully enabled: %s", obs_exc)

try:
    from prometheus_client import Histogram

    yolo_inference_seconds = Histogram(
        "yolo_inference_duration_seconds",
        "YOLO model.predict wall time (seconds)",
        ["crop"],
        buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0),
    )
except ImportError:
    yolo_inference_seconds = None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "yolo-service"})


@app.route("/ready", methods=["GET"])
def ready():
    missing_models = validate_dvc_model_paths()
    if missing_models:
        return jsonify({
            "status": "initializing",
            "service": "yolo-service",
            "error": "model artifacts not ready",
        }), 503
    return jsonify({"status": "ready", "service": "yolo-service"}), 200


@app.route("/predict", methods=["POST"])
@app.route("/predict/<path_crop>", methods=["POST"])
def predict(path_crop=None):
    try:
        logger.info("Incoming request: /predict")
        crop_type = path_crop or request.form.get("cropType") or request.args.get("cropType")
        if not crop_type:
            body = request.get_json(silent=True) or {}
            crop_type = body.get("cropType") or request.headers.get("X-Crop-Type")

        if "file" not in request.files:
            return jsonify({"error": "Missing file field (expected key: file)"}), 400
        if not crop_type:
            return jsonify(
                {
                    "error": "Missing cropType (provide via form field, query, JSON, "
                    "header X-Crop-Type, or URL /predict/<crop>)"
                }
            ), 400

        crop_type = str(crop_type).lower().strip()
        file = request.files["file"]
        model = get_model_for_crop(crop_type)
        image = Image.open(io.BytesIO(file.read())).convert("RGB")
        _t0 = time.perf_counter()
        detections = model.predict(image)[0]
        if yolo_inference_seconds is not None:
            try:
                yolo_inference_seconds.labels(crop_type).observe(time.perf_counter() - _t0)
            except Exception:
                pass

        prediction_list = []
        for box in detections.boxes:
            cls_id = int(box.cls)
            conf = float(box.conf)
            label = detections.names[cls_id]
            prediction_list.append({"label": label, "confidence": round(conf * 100, 2)})

        if not prediction_list:
            response = {
                "cropType": crop_type,
                "disease": "Healthy Crop",
                "confidence": 100,
                "severity": "Low",
                "treatment": "No visible disease detected. Maintain proper irrigation and fertilizer balance.",
                "symptoms": ["Leaves appear normal", "No fungal or pest activity detected"],
                "prevention": ["Continue routine crop monitoring", "Use disease-resistant seeds"],
                "timestamp": datetime.datetime.now().isoformat(),
            }
        else:
            top_pred = prediction_list[0]
            severity = "High" if top_pred["confidence"] > 80 else "Medium"
            response = {
                "cropType": crop_type,
                "disease": top_pred["label"],
                "confidence": top_pred["confidence"],
                "severity": severity,
                "treatment": "Apply recommended pesticide/fungicide as per NARC or FAO guidelines.",
                "symptoms": ["Lesions or discoloration detected on leaves", "Possible fungal or bacterial infection"],
                "prevention": ["Use resistant crop variety", "Avoid overwatering", "Ensure balanced fertilization"],
                "timestamp": datetime.datetime.now().isoformat(),
            }

        model_version = (os.getenv("YOLO_MODEL_VERSION") or "unspecified").strip()
        response["model_version"] = model_version
        out = jsonify(response)
        out.headers["X-Model-Version"] = model_version
        return out
    except (ValueError, FileNotFoundError) as exc:
        logger.warning("Predict client error: %s", exc)
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        logger.exception("Predict server error: %s", exc)
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    missing_models = validate_dvc_model_paths()
    if missing_models:
        logger.warning(
            "yolo-service startup validation failed. Run DVC pull and ensure MODEL_DIR is mounted correctly."
        )
    logger.info("Starting yolo-service on port %s", get_service_port())
    app.run(host="0.0.0.0", port=get_service_port(), debug=False)

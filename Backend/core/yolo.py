import os
import logging
from ultralytics import YOLO
try:
  from ..config import get_backend_model_root
except ImportError:
  from config import get_backend_model_root

_loaded_models: dict[str, YOLO] = {}
logger = logging.getLogger(__name__)

def expected_model_path(crop_type: str) -> str:
  model_root = os.path.abspath(get_backend_model_root())
  model_path = os.path.join(model_root, crop_type, "best.pt")
  return os.path.normpath(model_path)

def validate_dvc_model_paths(required_crops=None) -> list[str]:
  crops = required_crops or ["wheat", "rice", "cotton"]
  missing = []
  for crop in crops:
    model_path = expected_model_path(crop)
    if not os.path.exists(model_path):
      missing.append(model_path)
  if missing:
    logger.error("DVC-managed model files missing: %s", missing)
  else:
    logger.info("All DVC-managed local model files are present under MODEL_DIR")
  return missing

def get_model_for_crop(crop_type: str) -> YOLO:
  """
  Load YOLO model for the specified crop type.
  Models are expected to be in Backend/models/{crop_type}/best.pt
  """
  ct = (crop_type or '').lower().strip()
  if ct not in ['wheat', 'rice', 'cotton']:
    raise ValueError(f"Invalid crop type: {crop_type}")

  if ct in _loaded_models:
    return _loaded_models[ct]

  model_root = os.path.abspath(get_backend_model_root())
  model_path = expected_model_path(ct)
  
  if not os.path.exists(model_path):
    raise FileNotFoundError(
      f"Model not found for {ct} at {model_path}\n"
      f"Expected location: {model_root}/{ct}/best.pt"
    )

  print(f"⚙️ Loading model for {ct} from {model_path} ...")
  model = YOLO(model_path)
  _loaded_models[ct] = model
  print(f"✅ {ct.capitalize()} model loaded and cached.")
  return model



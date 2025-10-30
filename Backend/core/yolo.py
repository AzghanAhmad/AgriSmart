import os
from ultralytics import YOLO

_loaded_models: dict[str, YOLO] = {}

def get_model_for_crop(crop_type: str) -> YOLO:
  ct = (crop_type or '').lower().strip()
  if ct not in ['wheat', 'rice', 'cotton']:
    raise ValueError(f"Invalid crop type: {crop_type}")

  if ct in _loaded_models:
    return _loaded_models[ct]

  model_path = os.path.join("models", ct, "best.pt")
  if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model not found for {ct} at {model_path}")

  print(f"⚙️ Loading model for {ct} from {model_path} ...")
  model = YOLO(model_path)
  _loaded_models[ct] = model
  print(f"✅ {ct.capitalize()} model loaded and cached.")
  return model



import os
from ultralytics import YOLO

_loaded_models: dict[str, YOLO] = {}

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

  # Get absolute path to models directory (relative to this file's location)
  # This ensures models are found regardless of working directory
  current_dir = os.path.dirname(os.path.abspath(__file__))  # Backend/core/
  backend_dir = os.path.dirname(current_dir)  # Backend/
  model_path = os.path.join(backend_dir, "models", ct, "best.pt")
  
  # Normalize path for cross-platform compatibility
  model_path = os.path.normpath(model_path)
  
  if not os.path.exists(model_path):
    raise FileNotFoundError(
      f"Model not found for {ct} at {model_path}\n"
      f"Expected location: Backend/models/{ct}/best.pt"
    )

  print(f"⚙️ Loading model for {ct} from {model_path} ...")
  model = YOLO(model_path)
  _loaded_models[ct] = model
  print(f"✅ {ct.capitalize()} model loaded and cached.")
  return model



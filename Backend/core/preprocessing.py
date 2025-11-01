"""
Unified Image Preprocessing for Crop Disease Detection
Routes images to crop-specific preprocessing pipelines
"""

import cv2
import numpy as np
import io
from PIL import Image

try:
    from ..preprocess.preprocess_for_wheat import WheatImagePreprocessor
    from ..preprocess.preprocess_for_rice import preprocess_from_array as rice_preprocess_from_array
    from ..preprocess.preprocess_for_cotton import preprocess_from_array as cotton_preprocess_from_array
except ImportError:
    # Fallback when running as a script
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from preprocess.preprocess_for_wheat import WheatImagePreprocessor
    from preprocess.preprocess_for_rice import preprocess_from_array as rice_preprocess_from_array
    from preprocess.preprocess_for_cotton import preprocess_from_array as cotton_preprocess_from_array


def preprocess_image_for_crop(image, crop_type: str):
    """
    Preprocess an image using the crop-specific preprocessing pipeline
    
    Args:
        image: Can be one of:
            - PIL Image object
            - numpy array (BGR or RGB)
            - bytes (image file bytes)
            - file path (string)
        crop_type: One of 'wheat', 'rice', or 'cotton'
        
    Returns:
        Preprocessed numpy array (BGR format, ready for YOLO model)
        Returns None if preprocessing fails
    """
    crop_type = crop_type.lower().strip()
    
    if crop_type not in ['wheat', 'rice', 'cotton']:
        raise ValueError(f"Invalid crop type: {crop_type}. Must be 'wheat', 'rice', or 'cotton'")
    
    # Convert input to numpy array (BGR format)
    img_array = None
    
    if isinstance(image, Image.Image):
        # PIL Image -> numpy array (convert RGB to BGR)
        img_array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    elif isinstance(image, np.ndarray):
        # Already numpy array
        img_array = image.copy()
        # If RGB, convert to BGR
        if len(img_array.shape) == 3 and img_array.shape[2] == 3:
            # Check if it's RGB (common) or BGR
            # PIL uses RGB, OpenCV uses BGR
            # For safety, assume it's RGB if we got it from PIL context
            pass  # Keep as is for now, preprocessors handle both
    elif isinstance(image, bytes):
        # Bytes -> numpy array
        nparr = np.frombuffer(image, np.uint8)
        img_array = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif isinstance(image, str):
        # File path -> numpy array
        img_array = cv2.imread(image)
    else:
        raise TypeError(f"Unsupported image type: {type(image)}")
    
    if img_array is None:
        print(f"❌ Error: Failed to load image for preprocessing")
        return None
    
    # Apply crop-specific preprocessing
    print(f"🔧 Preprocessing {crop_type} image...")
    
    try:
        if crop_type == 'wheat':
            # Wheat uses WheatImagePreprocessor class
            preprocessor = WheatImagePreprocessor()
            preprocessed = preprocessor.preprocess_numpy(img_array)
        elif crop_type == 'rice':
            # Rice uses preprocess_from_array function
            preprocessed = rice_preprocess_from_array(img_array)
        elif crop_type == 'cotton':
            # Cotton uses preprocess_from_array function
            preprocessed = cotton_preprocess_from_array(img_array)
        else:
            raise ValueError(f"Unknown crop type: {crop_type}")
        
        if preprocessed is None:
            print(f"❌ Warning: Preprocessing returned None for {crop_type}")
            return None
        
        print(f"✅ {crop_type.capitalize()} image preprocessed successfully")
        return preprocessed
        
    except Exception as e:
        print(f"❌ Error preprocessing {crop_type} image: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def preprocess_from_pil_image(pil_image: Image.Image, crop_type: str):
    """
    Convenience function to preprocess a PIL Image
    
    Args:
        pil_image: PIL Image object (RGB format)
        crop_type: Crop type ('wheat', 'rice', or 'cotton')
        
    Returns:
        Preprocessed numpy array (BGR format)
    """
    return preprocess_image_for_crop(pil_image, crop_type)


def preprocess_from_bytes(image_bytes: bytes, crop_type: str):
    """
    Convenience function to preprocess image from bytes
    
    Args:
        image_bytes: Image file bytes
        crop_type: Crop type ('wheat', 'rice', or 'cotton')
        
    Returns:
        Preprocessed numpy array (BGR format)
    """
    return preprocess_image_for_crop(image_bytes, crop_type)


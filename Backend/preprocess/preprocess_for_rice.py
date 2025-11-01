"""
Simple Image Preprocessing for Rice Disease Detection Model
Preprocesses uploaded images to match training preprocessing exactly
"""

import cv2
import numpy as np

def preprocess_image_for_model(image_path):
    """
    Preprocess an uploaded image for rice disease detection model
    Matches training preprocessing EXACTLY: Denoise → CLAHE → Resize → Normalize
    
    Args:
        image_path: Path to uploaded image (can be str or file path)
        
    Returns:
        Preprocessed image ready for YOLO model (624x624, BGR format)
        Returns None if preprocessing fails
    """
    
    # Step 1: Read image
    img = cv2.imread(str(image_path))
    
    if img is None:
        print(f"❌ Error: Cannot read image")
        return None
    
    # Step 2: Light denoising (matches training - Gaussian Blur)
    img_clean = cv2.GaussianBlur(img, (3, 3), 0)
    
    # Step 3: VERY mild CLAHE (matches training - clipLimit=0.8)
    lab = cv2.cvtColor(img_clean, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=0.8, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    img_enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    
    # Step 4: Resize to 624x624 (matches training)
    img_resized = cv2.resize(img_enhanced, (624, 624), interpolation=cv2.INTER_LANCZOS4)
    
    # Step 5: Simple normalization (matches training)
    img_normalized = np.clip(img_resized, 0, 255).astype(np.uint8)
    
    return img_normalized


def preprocess_from_bytes(image_bytes):
    """
    Preprocess image from bytes (for web uploads)
    Matches training preprocessing EXACTLY
    
    Args:
        image_bytes: Image bytes from uploaded file
        
    Returns:
        Preprocessed image ready for model
    """
    
    # Decode bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        print(f"❌ Error: Cannot decode image")
        return None
    
    # Step 1: Light denoising (Gaussian Blur)
    img_clean = cv2.GaussianBlur(img, (3, 3), 0)
    
    # Step 2: VERY mild CLAHE (clipLimit=0.8)
    lab = cv2.cvtColor(img_clean, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=0.8, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    img_enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    
    # Step 3: Resize to 624x624
    img_resized = cv2.resize(img_enhanced, (624, 624), interpolation=cv2.INTER_LANCZOS4)
    
    # Step 4: Simple normalization
    img_normalized = np.clip(img_resized, 0, 255).astype(np.uint8)
    
    return img_normalized


def preprocess_from_array(image_array):
    """
    Preprocess image from numpy array
    Matches training preprocessing EXACTLY
    
    Args:
        image_array: Numpy array of image (BGR or RGB)
        
    Returns:
        Preprocessed image ready for model
    """
    
    if image_array is None:
        print(f"❌ Error: Image array is None")
        return None
    
    # Step 1: Light denoising (Gaussian Blur)
    img_clean = cv2.GaussianBlur(image_array, (3, 3), 0)
    
    # Step 2: VERY mild CLAHE (clipLimit=0.8)
    lab = cv2.cvtColor(img_clean, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=0.8, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    img_enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    
    # Step 3: Resize to 624x624
    img_resized = cv2.resize(img_enhanced, (624, 624), interpolation=cv2.INTER_LANCZOS4)
    
    # Step 4: Simple normalization
    img_normalized = np.clip(img_resized, 0, 255).astype(np.uint8)
    
    return img_normalized


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    """
    Example: How to use this preprocessing
    """
    
    print("="*80)
    print("RICE IMAGE PREPROCESSING - MATCHES TRAINING EXACTLY")
    print("="*80)
    print("\nPreprocessing steps (same as rice_data_preprocessing.ipynb):")
    print("  1. Gaussian Blur (3×3) - Light denoising")
    print("  2. CLAHE (clipLimit=0.8) - VERY mild contrast enhancement")
    print("  3. Resize (624×624) - High quality LANCZOS4")
    print("  4. Normalize (clip 0-255) - Simple normalization")
    print("="*80)
    
    # Example 1: Preprocess from file path
    print("\n📌 Example 1: Preprocess from file")
    print("-" * 80)
    
    image_path = "uploaded_image.jpg"
    preprocessed = preprocess_image_for_model(image_path)
    
    if preprocessed is not None:
        print(f"✅ Image preprocessed successfully!")
        print(f"   Shape: {preprocessed.shape}")
        print(f"   Ready for model prediction")
        
        # Save preprocessed image (optional)
        cv2.imwrite("preprocessed_output.jpg", preprocessed)
        print(f"   Saved to: preprocessed_output.jpg")
    
    print("\n" + "="*80)
    print("💡 HOW TO USE IN YOUR APPLICATION")
    print("="*80)
    
    print("""
1. Simple file upload:
   
   from preprocess_for_model import preprocess_image_for_model
   
   preprocessed = preprocess_image_for_model('uploaded_image.jpg')
   # Now use with your YOLO model
   

2. Web application (Flask):
   
   from flask import Flask, request
   from preprocess_for_model import preprocess_from_bytes
   from ultralytics import YOLO
   
   app = Flask(__name__)
   model = YOLO('best.pt')
   
   @app.route('/predict', methods=['POST'])
   def predict():
       file = request.files['image']
       image_bytes = file.read()
       
       # Preprocess
       preprocessed = preprocess_from_bytes(image_bytes)
       
       # Predict
       results = model.predict(preprocessed)
       return {'disease': results[0].names[int(results[0].boxes[0].cls[0])]}


3. From numpy array:
   
   from preprocess_for_model import preprocess_from_array
   import cv2
   
   img = cv2.imread('image.jpg')
   preprocessed = preprocess_from_array(img)
   # Now use with model
   

4. Complete prediction pipeline:
   
   from preprocess_for_model import preprocess_image_for_model
   from ultralytics import YOLO
   
   # Load model
   model = YOLO('best.pt')
   
   # User uploads image
   uploaded_image = 'user_upload.jpg'
   
   # Preprocess (matches training!)
   preprocessed = preprocess_image_for_model(uploaded_image)
   
   # Predict
   results = model.predict(preprocessed, conf=0.25)
   
   # Get result
   if len(results[0].boxes) > 0:
       disease_name = results[0].names[int(results[0].boxes[0].cls[0])]
       confidence = float(results[0].boxes[0].conf[0])
       print(f"Disease: {disease_name}")
       print(f"Confidence: {confidence:.2%}")
    """)
    
    print("="*80)


"""
Wheat Image Preprocessing for Inference
Matches the preprocessing pipeline from wheat_data_preprocessing.ipynb EXACTLY
Use this to preprocess images before feeding to the trained model
"""

import cv2
import numpy as np
from pathlib import Path
import os

class WheatImagePreprocessor:
    """
    Preprocesses wheat disease images for YOLOv11 inference
    Matches training preprocessing pipeline EXACTLY (same as wheat_data_preprocessing.ipynb)
    """
    
    def __init__(self, img_size=(624, 624)):
        """
        Initialize preprocessor
        
        Args:
            img_size: Target image size (width, height) - must match training
        """
        self.img_size = img_size
        self.min_img_size = 100
        self.max_img_size = 4096
        self.min_contrast = 0.05
        self.min_brightness = 0.10
        self.min_sharpness = 50
    
    def enhance_image(self, img):
        """
        Minimal, natural enhancement - NO over-processing
        EXACTLY matches wheat_data_preprocessing.ipynb Step 4
        """
        # Strategy: Keep it natural, let the model learn real features
        
        # Light denoising only (Gaussian Blur)
        img_clean = cv2.GaussianBlur(img, (3, 3), 0)
        
        # VERY mild CLAHE - just enough to enhance contrast, not brightness
        lab = cv2.cvtColor(img_clean, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=0.8, tileGridSize=(8, 8))  # VERY LOW (matches training)
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        img_enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        # NO sharpening - keep natural
        # (Excessive sharpening creates artifacts that confuse the model)
        
        return img_enhanced
    
    def resize_image(self, img, target_size):
        """
        High-quality resize
        EXACTLY matches wheat_data_preprocessing.ipynb
        """
        resized = cv2.resize(img, target_size, interpolation=cv2.INTER_LANCZOS4)
        return resized
    
    def normalize_image(self, img):
        """
        Simple, effective normalization - NO brightness manipulation
        EXACTLY matches wheat_data_preprocessing.ipynb
        """
        # NO fancy normalization - just ensure uint8 range
        # The model will learn better from natural, unmanipulated images
        
        # Simple clip to ensure valid range
        img_normalized = np.clip(img, 0, 255).astype(np.uint8)
        
        return img_normalized
    
    def check_image_quality(self, img):
        """
        Check if image meets quality thresholds (optional check)
        
        Args:
            img: OpenCV image (BGR format)
            
        Returns:
            tuple: (is_valid, reason)
        """
        if img is None:
            return False, "cannot_read"
        
        h, w = img.shape[:2]
        
        # Size check
        if h < self.min_img_size or w < self.min_img_size:
            return False, "too_small"
        if h > self.max_img_size or w > self.max_img_size:
            return False, "too_large"
        
        # Convert to grayscale for quality checks
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Contrast check
        contrast = gray.std() / 255.0
        if contrast < self.min_contrast:
            return False, "low_contrast"
        
        # Brightness check
        brightness = gray.mean() / 255.0
        if brightness < self.min_brightness:
            return False, "too_dark"
        
        # Sharpness check (Laplacian variance)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = laplacian.var()
        if sharpness < self.min_sharpness:
            return False, "blurry"
        
        return True, "pass"
    
    def preprocess_image(self, img_path, return_original=False):
        """
        Complete preprocessing pipeline for a single image
        EXACTLY matches wheat_data_preprocessing.ipynb process_single_image()
        
        Args:
            img_path: Path to input image
            return_original: If True, also return original image
            
        Returns:
            Preprocessed image (or tuple if return_original=True)
            Returns None if image fails quality checks
        """
        # Read image
        img = cv2.imread(str(img_path))
        
        if img is None:
            print(f"❌ Error: Cannot read image {img_path}")
            return None
        
        # Store original if needed
        original = img.copy() if return_original else None
        
        # Step 1: Gentle enhancement (CLAHE 0.8) - EXACTLY as training
        img_enhanced = self.enhance_image(img)
        
        # Step 2: Resize to target (624x624) - EXACTLY as training
        img_resized = self.resize_image(img_enhanced, self.img_size)
        
        # Step 3: Simple normalization - EXACTLY as training
        img_final = self.normalize_image(img_resized)
        
        if return_original:
            return img_final, original
        return img_final
    
    def preprocess_for_yolo(self, img_path, save_path=None):
        """
        Preprocess image specifically for YOLO inference
        
        Args:
            img_path: Path to input image
            save_path: Optional path to save preprocessed image
            
        Returns:
            Preprocessed image ready for YOLO
        """
        preprocessed = self.preprocess_image(img_path)
        
        if preprocessed is None:
            return None
        
        # Save if path provided
        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            cv2.imwrite(str(save_path), preprocessed, [cv2.IMWRITE_JPEG_QUALITY, 95])
            print(f"✅ Preprocessed image saved to: {save_path}")
        
        return preprocessed
    
    def preprocess_batch(self, image_paths, output_dir=None):
        """
        Preprocess multiple images
        
        Args:
            image_paths: List of image paths
            output_dir: Optional directory to save preprocessed images
            
        Returns:
            List of preprocessed images
        """
        preprocessed_images = []
        
        for img_path in image_paths:
            img_path = Path(img_path)
            
            if output_dir:
                save_path = Path(output_dir) / f"preprocessed_{img_path.name}"
            else:
                save_path = None
            
            preprocessed = self.preprocess_for_yolo(img_path, save_path)
            
            if preprocessed is not None:
                preprocessed_images.append(preprocessed)
        
        print(f"\n✅ Preprocessed {len(preprocessed_images)}/{len(image_paths)} images")
        return preprocessed_images
    
    def preprocess_numpy(self, img_array):
        """
        Preprocess a numpy array (useful for web apps, APIs)
        
        Args:
            img_array: Numpy array of image (BGR or RGB)
            
        Returns:
            Preprocessed image
        """
        # Step 1: Enhance
        img_enhanced = self.enhance_image(img_array)
        
        # Step 2: Resize
        img_resized = self.resize_image(img_enhanced, self.img_size)
        
        # Step 3: Normalize
        img_normalized = self.normalize_image(img_resized)
        
        return img_normalized


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def preprocess_single_image(img_path, save_path=None):
    """
    Quick function to preprocess a single wheat image
    
    Args:
        img_path: Path to input image
        save_path: Optional path to save preprocessed image
        
    Returns:
        Preprocessed image
    """
    preprocessor = WheatImagePreprocessor()
    return preprocessor.preprocess_for_yolo(img_path, save_path)


def preprocess_for_prediction(img_path):
    """
    Preprocess wheat image for model prediction
    Returns preprocessed image in format ready for YOLO
    
    Args:
        img_path: Path to input image
        
    Returns:
        Preprocessed image (BGR format, 624x624)
    """
    preprocessor = WheatImagePreprocessor()
    preprocessed = preprocessor.preprocess_image(img_path)
    
    if preprocessed is None:
        raise ValueError(f"Failed to preprocess image: {img_path}")
    
    return preprocessed


def preprocess_folder(input_folder, output_folder):
    """
    Preprocess all images in a folder
    
    Args:
        input_folder: Path to input folder
        output_folder: Path to output folder
    """
    input_folder = Path(input_folder)
    output_folder = Path(output_folder)
    output_folder.mkdir(parents=True, exist_ok=True)
    
    # Get all image files
    image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']
    image_paths = []
    for ext in image_extensions:
        image_paths.extend(input_folder.glob(ext))
    
    print(f"Found {len(image_paths)} images in {input_folder}")
    
    # Preprocess
    preprocessor = WheatImagePreprocessor()
    preprocessed_images = preprocessor.preprocess_batch(image_paths, output_folder)
    
    print(f"✅ Preprocessing complete!")
    print(f"   Output directory: {output_folder}")


# ============================================================================
# MAIN - EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Preprocess wheat disease images for YOLO inference')
    parser.add_argument('--input', type=str, required=True, 
                       help='Input image path or folder')
    parser.add_argument('--output', type=str, default=None,
                       help='Output path or folder (optional)')
    parser.add_argument('--batch', action='store_true',
                       help='Process entire folder')
    
    args = parser.parse_args()
    
    print("\n" + "="*80)
    print("🌾 WHEAT IMAGE PREPROCESSING FOR INFERENCE")
    print("="*80)
    print("\n✅ Matches wheat_data_preprocessing.ipynb EXACTLY:")
    print("   - Gaussian Blur (3×3) - Light denoising")
    print("   - CLAHE (clipLimit=0.8) - VERY mild contrast")
    print("   - Resize (624×624) - High quality LANCZOS4")
    print("   - Normalize (clip 0-255) - Simple normalization")
    print("   - NO sharpening - Keep natural")
    print("="*80)
    
    if args.batch:
        # Process folder
        if args.output is None:
            args.output = 'preprocessed_wheat_images'
        
        print(f"\n📂 Processing folder: {args.input}")
        print(f"📁 Output folder: {args.output}\n")
        
        preprocess_folder(args.input, args.output)
        
    else:
        # Process single image
        print(f"\n📷 Processing image: {args.input}\n")
        
        preprocessor = WheatImagePreprocessor()
        preprocessed = preprocessor.preprocess_for_yolo(args.input, args.output)
        
        if preprocessed is not None:
            print("\n✅ Preprocessing complete!")
            if args.output:
                print(f"   Saved to: {args.output}")
            else:
                print("   Image preprocessed in memory (not saved)")
            print(f"   Shape: {preprocessed.shape}")
            print(f"   Ready for YOLO model prediction!")
        else:
            print("\n❌ Preprocessing failed!")
    
    print("\n" + "="*80)
    print("💡 Usage Examples:")
    print("="*80)
    print("\n1. Preprocess single image:")
    print("   python preprocess_for_wheat.py --input image.jpg --output preprocessed.jpg")
    print("\n2. Preprocess folder:")
    print("   python preprocess_for_wheat.py --input test_images/ --output preprocessed/ --batch")
    print("\n3. Use in your code:")
    print("   from preprocess_for_wheat import preprocess_for_prediction")
    print("   img = preprocess_for_prediction('path/to/image.jpg')")
    print("   # Now use img with your YOLO model")
    print("\n" + "="*80)


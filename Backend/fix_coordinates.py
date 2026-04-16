"""
Script to fix detection coordinates that are outside Pakistan
Updates them to use user's saved location or default to Lahore, Pakistan
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from db import SessionLocal
    from schemas.detection import Detection
    from schemas.user import User
except ImportError:
    from Backend.db import SessionLocal
    from Backend.schemas.detection import Detection
    from Backend.schemas.user import User

def is_in_pakistan(lat, lng):
    """Check if coordinates are within Pakistan bounds"""
    return lat >= 23.5 and lat <= 37.0 and lng >= 60.0 and lng <= 77.0

def fix_detection_coordinates():
    """Fix detection coordinates that are outside Pakistan"""
    db = SessionLocal()
    try:
        # Get all detections with coordinates
        detections = db.query(Detection).filter(
            Detection.latitude.isnot(None),
            Detection.longitude.isnot(None)
        ).all()
        
        updated_count = 0
        for det in detections:
            lat = det.latitude
            lng = det.longitude
            
            # Check if coordinates are outside Pakistan
            if not is_in_pakistan(lat, lng):
                print(f"⚠️ Detection {det.detection_id} has coordinates outside Pakistan: ({lat}, {lng})")
                
                # Try to get farmer's saved location
                farmer = db.query(User).filter(User.user_id == det.farmer_id).first()
                
                if farmer and hasattr(farmer, 'latitude') and hasattr(farmer, 'longitude'):
                    farmer_lat = getattr(farmer, 'latitude', None)
                    farmer_lng = getattr(farmer, 'longitude', None)
                    
                    if farmer_lat and farmer_lng and is_in_pakistan(farmer_lat, farmer_lng):
                        det.latitude = farmer_lat
                        det.longitude = farmer_lng
                        print(f"   ✅ Updated to farmer's location: ({farmer_lat}, {farmer_lng})")
                        updated_count += 1
                        continue
                
                # Default to Lahore, Pakistan
                det.latitude = 31.5204
                det.longitude = 74.3587
                print(f"   ✅ Updated to default location (Lahore): (31.5204, 74.3587)")
                updated_count += 1
        
        if updated_count > 0:
            db.commit()
            print(f"\n✅ Successfully updated {updated_count} detection(s)")
        else:
            print("\n✅ No detections needed updating")
            
    except Exception as e:
        print(f"❌ Error fixing coordinates: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    print("🔧 Fixing detection coordinates outside Pakistan...\n")
    fix_detection_coordinates()
    print("\n✅ Done!")


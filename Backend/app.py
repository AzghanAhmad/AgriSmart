from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import os
import datetime
try:
    from .db import Base, engine
    from .routes.farmer import farmer_bp
    from .routes.admin import admin_bp
    from .routes.auth import auth_bp
    from .routes.guidance import guidance_bp
    from .routes.schedule import schedule_bp
    from .core.yolo import get_model_for_crop
    from .config import get_allowed_origins, get_upload_root, get_secret_key
    from .core.seed_guidance import seed_guidance_if_needed
    from .core.seed_schedules import seed_schedules_if_needed
except ImportError:
    # Fallback for running as a script: python Backend/app.py
    from db import Base, engine
    from routes.farmer import farmer_bp
    from routes.admin import admin_bp
    from routes.auth import auth_bp
    from routes.guidance import guidance_bp
    from routes.schedule import schedule_bp
    from core.yolo import get_model_for_crop
    from config import get_allowed_origins, get_upload_root, get_secret_key
    from core.seed_guidance import seed_guidance_if_needed
    from core.seed_schedules import seed_schedules_if_needed

app = Flask(__name__)
# Configure CORS via env; default to permissive in dev
allowed_origins = get_allowed_origins()
if allowed_origins == '*':
    CORS(app)
else:
    CORS(app, resources={r"/*": {"origins": [o.strip() for o in allowed_origins.split(',') if o.strip()]}})

# Static uploads (served under /static/uploads/...)
app.static_folder = 'static'
uploads_root = get_upload_root()
if not os.path.isabs(uploads_root):
    uploads_root = os.path.join(app.static_folder, 'uploads')
os.makedirs(uploads_root, exist_ok=True)
app.config['UPLOAD_FOLDER'] = uploads_root
app.config['SECRET_KEY'] = get_secret_key()

# Initialize DB
with app.app_context():
    # First create all tables (this creates the database file if it doesn't exist)
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Run database migration to add new columns/tables
    try:
        print("🔄 Running database migrations...")
        try:
            from .migrate_db import run_migrations
        except ImportError:
            from migrate_db import run_migrations
        run_migrations(engine)
        print("✅ Database migrations completed")
    except Exception as me:
        print(f'⚠️ Database migration error: {me}')
    
    # Seed disease guidance table (idempotent)
    try:
        print("🌱 Seeding disease guidance data...")
        seed_guidance_if_needed()
        print("✅ Guidance data seeded")
    except Exception as se:
        print(f'⚠️ Guidance seeding error: {se}')
    
    # Seed disease schedules table (idempotent)
    try:
        print("📅 Seeding disease schedules data...")
        seed_schedules_if_needed()
        print("✅ Schedules data seeded")
    except Exception as se:
        print(f'⚠️ Schedules seeding error: {se}')

# Register blueprints
app.register_blueprint(farmer_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(guidance_bp)
app.register_blueprint(schedule_bp)

# ✅ Cache loaded models to avoid reloading every time
loaded_models = {}

def get_model_for_crop(crop_type: str):
    """Load and return YOLOv11 model for the given crop type."""
    crop_type = crop_type.lower()
    if crop_type not in ['wheat', 'rice', 'cotton']:
        raise ValueError(f"Invalid crop type: {crop_type}")

    if crop_type in loaded_models:
        return loaded_models[crop_type]

    model_path = os.path.join("models", crop_type, "best.pt")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found for {crop_type} at {model_path}")

    print(f"⚙️ Loading model for {crop_type} from {model_path} ...")
    model = YOLO(model_path)
    loaded_models[crop_type] = model
    print(f"✅ {crop_type.capitalize()} model loaded and cached.")
    return model


@app.route('/')
def home():
    return jsonify({
        "message": "🌾 AgriSmart Backend is Running",
        "status": "online",
        "version": "1.0",
        "endpoints": {
            "auth": "/api/auth/*",
            "farmer": "/api/farmer/*",
            "admin": "/api/admin/*",
            "guidance": "/api/guidance",
            "schedule": "/api/farmer/schedule/*",
            "predict": "/predict"
        }
    })

@app.route('/health')
def health():
    """Health check endpoint for mobile app connection testing"""
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    return jsonify({
        "status": "healthy",
        "server": {
            "hostname": hostname,
            "ip": local_ip,
            "port": 5000
        },
        "database": "connected",
        "message": "Backend is fully operational"
    })


@app.route('/predict', methods=['POST'])
@app.route('/predict/<path_crop>', methods=['POST'])
def predict(path_crop: str | None = None):
    try:
        print("\n📥 Incoming POST /predict")
        print("🔹 Form keys:", list(request.form.keys()))
        print("🔹 Args:", dict(request.args))
        print("🔹 Headers crop:", request.headers.get('X-Crop-Type'))
        print("🔹 File keys:", list(request.files.keys()))

        # Attempt to resolve crop type from multiple sources for robustness with different clients
        crop_type = None
        # 1) URL path param
        if path_crop:
            crop_type = path_crop
        # 2) Multipart form field
        if not crop_type:
            crop_type = request.form.get('cropType')
        # 3) Query string
        if not crop_type:
            crop_type = request.args.get('cropType')
        # 4) JSON body
        if not crop_type:
            try:
                json_body = request.get_json(silent=True) or {}
                crop_type = json_body.get('cropType')
            except Exception:
                pass
        # 5) Header
        if not crop_type:
            crop_type = request.headers.get('X-Crop-Type')

        # Validate file
        if 'file' not in request.files:
            print("❌ Missing file field")
            return jsonify({'error': 'Missing file field (expected key: file)'}), 400
        if not crop_type:
            print("❌ Missing cropType (form/query/json/header/path)")
            return jsonify({'error': 'Missing cropType (provide via form field, query, JSON, header X-Crop-Type, or URL /predict/<crop>)'}), 400

        crop_type = str(crop_type).lower().strip()
        file = request.files['file']

        print(f"✅ Received crop type: {crop_type}")

        # Load corresponding model
        model = get_model_for_crop(crop_type)

        # Read image from request
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        print(f"🔍 Running inference on {crop_type} image...")
        results = model.predict(image)
        detections = results[0]

        # Extract predictions
        prediction_list = []
        for box in detections.boxes:
            cls_id = int(box.cls)
            conf = float(box.conf)
            label = detections.names[cls_id]
            prediction_list.append({
                'label': label,
                'confidence': round(conf * 100, 2)
            })

        # Handle case: no detections
        if not prediction_list:
            response = {
                'cropType': crop_type,
                'disease': 'Healthy Crop',
                'confidence': 100,
                'severity': 'Low',
                'treatment': 'No visible disease detected. Maintain proper irrigation and fertilizer balance.',
                'symptoms': ['Leaves appear normal', 'No fungal or pest activity detected'],
                'prevention': ['Continue routine crop monitoring', 'Use disease-resistant seeds'],
                'timestamp': datetime.datetime.now().isoformat()
            }
            print("🌱 Healthy crop detected.")
        else:
            top_pred = prediction_list[0]
            severity = 'High' if top_pred['confidence'] > 80 else 'Medium'

            response = {
                'cropType': crop_type,
                'disease': top_pred['label'],
                'confidence': top_pred['confidence'],
                'severity': severity,
                'treatment': 'Apply recommended pesticide/fungicide as per NARC or FAO guidelines.',
                'symptoms': ['Lesions or discoloration detected on leaves', 'Possible fungal or bacterial infection'],
                'prevention': ['Use resistant crop variety', 'Avoid overwatering', 'Ensure balanced fertilization'],
                'timestamp': datetime.datetime.now().isoformat()
            }

            print(f"✅ Detected {top_pred['label']} ({top_pred['confidence']}%) on {crop_type} crop.")

        return jsonify(response)

    except (ValueError, FileNotFoundError) as e:
        # Bad request or model missing
        print("❌ Client Error:", str(e))
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print("❌ Server Error:", str(e))
        return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # ⚠️ For production, use gunicorn or waitress
    app.run(host='0.0.0.0', port=5000, debug=False)

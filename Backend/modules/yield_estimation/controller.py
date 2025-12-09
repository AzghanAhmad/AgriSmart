"""
Yield Estimation Controller
===========================

Flask Blueprint providing REST API endpoints for crop yield estimation.

Endpoints:
    POST /api/yield/estimate - Calculate yield estimation from input parameters

This controller:
1. Receives and parses JSON requests
2. Validates input using validators.py
3. Delegates calculation to service.py
4. Returns structured JSON responses

Error handling follows existing app patterns with meaningful error messages.
"""

from flask import Blueprint, request, jsonify
from .validators import validate_yield_request, sanitize_crop_type
from .service import estimate_yield, get_supported_crops

# Create Blueprint with /api/yield prefix
yield_estimation_bp = Blueprint('yield_estimation', __name__, url_prefix='/api/yield')


@yield_estimation_bp.route('/estimate', methods=['POST'])
def estimate():
    """
    Calculate crop yield estimation.
    
    Request Body (JSON):
        {
            "cropType": "wheat",           # Required: crop type
            "farmSizeAcres": 3.5,          # Required: farm size in acres
            "weatherScore": 0.78,          # Required: weather score (0-1)
            "soilQualityScore": 0.66,      # Required: soil quality (0-1)
            "sensorGrowthIndex": 0.72,     # Required: growth index (0-1)
            "healthRatio": 0.83,           # Required: plant health ratio (0-1)
            "diseaseRatio": 0.21           # Required: disease risk ratio (0-1)
        }
    
    Response (JSON):
        {
            "estimatedYieldKg": 5421,
            "expectedYieldRangeKg": {"min": 4608, "max": 6234},
            "healthRatio": 0.83,
            "diseaseRiskRatio": 0.21,
            "finalYieldScore": 0.71
        }
    
    Error Response:
        {"errors": ["Missing required field: cropType"]}
    """
    try:
        # --- Parse JSON body ---
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                'error': 'Invalid or missing JSON body'
            }), 400
        
        # --- Get supported crops for validation ---
        supported_crops = get_supported_crops()
        
        # --- Validate input ---
        validation_errors = validate_yield_request(data, supported_crops)
        if validation_errors:
            return jsonify({
                'errors': validation_errors
            }), 400
        
        # --- Extract and sanitize inputs ---
        crop_type = sanitize_crop_type(data['cropType'])
        farm_size_acres = float(data['farmSizeAcres'])
        weather_score = float(data['weatherScore'])
        soil_quality_score = float(data['soilQualityScore'])
        sensor_growth_index = float(data['sensorGrowthIndex'])
        health_ratio = float(data['healthRatio'])
        disease_ratio = float(data['diseaseRatio'])
        
        # --- Calculate yield estimation ---
        result = estimate_yield(
            crop_type=crop_type,
            farm_size_acres=farm_size_acres,
            weather_score=weather_score,
            soil_quality_score=soil_quality_score,
            sensor_growth_index=sensor_growth_index,
            health_ratio=health_ratio,
            disease_ratio=disease_ratio
        )
        
        # Log successful estimation
        print(f"✅ Yield estimated for {crop_type}: {result['estimatedYieldKg']} kg")
        
        return jsonify(result), 200
        
    except KeyError as e:
        # Handle missing benchmark data
        print(f"❌ Yield estimation error - missing key: {e}")
        return jsonify({
            'error': f'Configuration error: missing data for {e}'
        }), 500
        
    except Exception as e:
        # Handle unexpected errors
        print(f"❌ Yield estimation error: {str(e)}")
        return jsonify({
            'error': 'Internal server error during yield estimation'
        }), 500


@yield_estimation_bp.route('/crops', methods=['GET'])
def list_supported_crops():
    """
    Get list of supported crops for yield estimation.
    
    Response (JSON):
        {
            "crops": ["wheat", "rice", "maize", "cotton", "sugarcane"]
        }
    """
    try:
        crops = get_supported_crops()
        return jsonify({'crops': crops}), 200
    except Exception as e:
        print(f"❌ Error fetching supported crops: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch supported crops'
        }), 500



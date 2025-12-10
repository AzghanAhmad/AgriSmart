"""
Validators for Yield Estimation Module
======================================

Provides input validation for yield estimation requests.
Ensures all required fields are present and within valid ranges.

Usage:
    from validators import validate_yield_request
    errors = validate_yield_request(payload)
    if errors:
        return jsonify({'errors': errors}), 400
"""

from typing import Dict, List, Any, Optional


def validate_yield_request(data: Dict[str, Any], supported_crops: List[str]) -> Optional[List[str]]:
    """
    Validate the yield estimation request payload.
    
    Args:
        data: Request payload dictionary
        supported_crops: List of supported crop types from benchmarks
    
    Returns:
        List of error messages if validation fails, None if valid
    """
    errors: List[str] = []
    
    # --- Required field checks ---
    required_fields = [
        'cropType',
        'farmSizeAcres',
        'weatherScore',
        'soilQualityScore',
        'sensorGrowthIndex',
        'healthRatio',
        'diseaseRatio'
    ]
    
    for field in required_fields:
        if field not in data or data[field] is None:
            errors.append(f"Missing required field: {field}")
    
    # If required fields are missing, return early
    if errors:
        return errors
    
    # --- Type and value validation ---
    
    # Crop type must be a supported crop
    crop_type = str(data.get('cropType', '')).lower().strip()
    if crop_type not in supported_crops:
        errors.append(
            f"Unsupported cropType: '{crop_type}'. "
            f"Supported crops: {', '.join(supported_crops)}"
        )
    
    # Farm size must be positive
    farm_size = _parse_float(data.get('farmSizeAcres'))
    if farm_size is None or farm_size <= 0:
        errors.append("farmSizeAcres must be a positive number")
    elif farm_size > 10000:
        errors.append("farmSizeAcres exceeds maximum allowed (10,000 acres)")
    
    # Score validations (must be between 0 and 1)
    score_fields = [
        ('weatherScore', data.get('weatherScore')),
        ('soilQualityScore', data.get('soilQualityScore')),
        ('sensorGrowthIndex', data.get('sensorGrowthIndex')),
        ('healthRatio', data.get('healthRatio')),
        ('diseaseRatio', data.get('diseaseRatio')),
    ]
    
    for field_name, value in score_fields:
        parsed = _parse_float(value)
        if parsed is None:
            errors.append(f"{field_name} must be a valid number")
        elif not (0.0 <= parsed <= 1.0):
            errors.append(f"{field_name} must be between 0.0 and 1.0 (got {parsed})")
    
    return errors if errors else None


def _parse_float(value: Any) -> Optional[float]:
    """
    Safely parse a value to float.
    
    Args:
        value: Any value to parse
    
    Returns:
        Float value if parseable, None otherwise
    """
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def sanitize_crop_type(crop_type: str) -> str:
    """
    Sanitize and normalize crop type string.
    
    Args:
        crop_type: Raw crop type input
    
    Returns:
        Normalized lowercase crop type
    """
    return str(crop_type).lower().strip()



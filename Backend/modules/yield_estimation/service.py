"""
Yield Estimation Service
========================

Contains the core business logic for calculating crop yield estimates.
Uses environmental factors, health metrics, and crop-specific benchmarks.

Formula:
    environmentalFactor = (weatherScore * 0.4) + (soilQualityScore * 0.3) + (sensorGrowthIndex * 0.3)
    correctionFactor = (healthRatio * 0.7) - (diseaseRatio * 0.3)
    yieldFactor = clamp(environmentalFactor + correctionFactor, 0, 1)
    
    estimatedYieldKg = yieldFactor * maxYieldPerAcre * farmSizeAcres
    expectedYieldRangeKg = [estimatedYieldKg * 0.85, estimatedYieldKg * 1.15]
    finalYieldScore = yieldFactor

This module is designed for future extension:
- Support for ML-based yield predictions
- Dynamic weather API integration
- Seasonal adjustment factors
"""

import json
import os
from typing import Dict, Any, Tuple


# --- Helper Functions ---

def clamp(value: float, min_val: float, max_val: float) -> float:
    """
    Clamp a value within the specified range.
    
    Args:
        value: The value to clamp
        min_val: Minimum allowed value
        max_val: Maximum allowed value
    
    Returns:
        Value clamped between min_val and max_val
    """
    return max(min_val, min(value, max_val))


def load_benchmarks() -> Dict[str, Dict[str, Any]]:
    """
    Load crop yield benchmarks from JSON file.
    
    Returns:
        Dictionary mapping crop types to their benchmark data
    
    Raises:
        FileNotFoundError: If benchmarks.json is missing
        json.JSONDecodeError: If JSON is malformed
    """
    benchmarks_path = os.path.join(os.path.dirname(__file__), 'benchmarks.json')
    with open(benchmarks_path, 'r') as f:
        return json.load(f)


def get_supported_crops() -> list:
    """
    Get list of crops supported for yield estimation.
    
    Returns:
        List of crop type strings
    """
    benchmarks = load_benchmarks()
    return list(benchmarks.keys())


def get_max_yield_per_acre(crop_type: str) -> float:
    """
    Get the maximum yield per acre for a specific crop.
    
    Args:
        crop_type: Normalized crop type string
    
    Returns:
        Maximum yield in kg per acre
    
    Raises:
        KeyError: If crop type is not in benchmarks
    """
    benchmarks = load_benchmarks()
    return benchmarks[crop_type]['maxYieldPerAcre']


# --- Core Calculation Functions ---

def calculate_environmental_factor(
    weather_score: float,
    soil_quality_score: float,
    sensor_growth_index: float
) -> float:
    """
    Calculate the environmental factor from weather, soil, and growth data.
    
    Formula: (weatherScore * 0.4) + (soilQualityScore * 0.3) + (sensorGrowthIndex * 0.3)
    
    Args:
        weather_score: Weather condition score (0-1)
        soil_quality_score: Soil quality score (0-1)
        sensor_growth_index: Growth index from sensors (0-1)
    
    Returns:
        Combined environmental factor (0-1 range)
    """
    # Weight distribution: Weather 40%, Soil 30%, Growth 30%
    environmental_factor = (
        (weather_score * 0.4) +
        (soil_quality_score * 0.3) +
        (sensor_growth_index * 0.3)
    )
    return environmental_factor


def calculate_correction_factor(
    health_ratio: float,
    disease_ratio: float
) -> float:
    """
    Calculate the health-based correction factor.
    
    Formula: (healthRatio * 0.7) - (diseaseRatio * 0.3)
    
    This factor adjusts the yield based on crop health status:
    - High health ratio increases yield
    - High disease ratio decreases yield
    
    Args:
        health_ratio: Plant health ratio from Feature 1 (0-1)
        disease_ratio: Disease risk ratio from Feature 1 (0-1)
    
    Returns:
        Correction factor (can be negative if disease is severe)
    """
    # Health contributes positively, disease negatively
    correction_factor = (health_ratio * 0.7) - (disease_ratio * 0.3)
    return correction_factor


def calculate_yield_factor(
    environmental_factor: float,
    correction_factor: float
) -> float:
    """
    Calculate the final yield factor by combining environmental and correction factors.
    
    Formula: clamp(environmentalFactor + correctionFactor, 0, 1)
    
    Args:
        environmental_factor: Combined environmental score
        correction_factor: Health-based correction
    
    Returns:
        Final yield factor clamped between 0 and 1
    """
    # Combine factors and clamp to valid range
    raw_yield_factor = environmental_factor + correction_factor
    return clamp(raw_yield_factor, 0.0, 1.0)


def calculate_estimated_yield(
    yield_factor: float,
    max_yield_per_acre: float,
    farm_size_acres: float
) -> float:
    """
    Calculate the estimated total yield in kilograms.
    
    Formula: yieldFactor * maxYieldPerAcre * farmSizeAcres
    
    Args:
        yield_factor: Final yield efficiency factor (0-1)
        max_yield_per_acre: Maximum possible yield per acre for the crop
        farm_size_acres: Total farm size in acres
    
    Returns:
        Estimated yield in kilograms
    """
    return yield_factor * max_yield_per_acre * farm_size_acres


def calculate_yield_range(estimated_yield: float) -> Tuple[float, float]:
    """
    Calculate the expected yield range based on estimation uncertainty.
    
    Uses ±15% margin to account for:
    - Natural variation in crop production
    - Unforeseen weather events
    - Market/harvest timing factors
    
    Args:
        estimated_yield: Base yield estimate in kg
    
    Returns:
        Tuple of (min_yield, max_yield) in kg
    """
    # 15% confidence margin
    min_yield = estimated_yield * 0.85
    max_yield = estimated_yield * 1.15
    return (min_yield, max_yield)


# --- Main Service Function ---

def estimate_yield(
    crop_type: str,
    farm_size_acres: float,
    weather_score: float,
    soil_quality_score: float,
    sensor_growth_index: float,
    health_ratio: float,
    disease_ratio: float
) -> Dict[str, Any]:
    """
    Main function to estimate crop yield.
    
    Combines all calculation steps to produce a complete yield estimation.
    
    Args:
        crop_type: Type of crop (normalized, lowercase)
        farm_size_acres: Farm size in acres
        weather_score: Weather condition score (0-1)
        soil_quality_score: Soil quality score (0-1)
        sensor_growth_index: Sensor-based growth index (0-1)
        health_ratio: Plant health ratio from disease detection (0-1)
        disease_ratio: Disease risk ratio from disease detection (0-1)
    
    Returns:
        Dictionary containing:
        - estimatedYieldKg: Total estimated yield
        - expectedYieldRangeKg: {min, max} yield range
        - healthRatio: Input health ratio (echoed back)
        - diseaseRiskRatio: Input disease ratio (echoed back)
        - finalYieldScore: Yield efficiency factor (0-1)
    """
    # Step 1: Get crop-specific benchmark
    max_yield_per_acre = get_max_yield_per_acre(crop_type)
    
    # Step 2: Calculate environmental factor from weather/soil/growth
    environmental_factor = calculate_environmental_factor(
        weather_score,
        soil_quality_score,
        sensor_growth_index
    )
    
    # Step 3: Calculate health-based correction factor
    correction_factor = calculate_correction_factor(
        health_ratio,
        disease_ratio
    )
    
    # Step 4: Combine into final yield factor (0-1)
    yield_factor = calculate_yield_factor(
        environmental_factor,
        correction_factor
    )
    
    # Step 5: Calculate estimated yield in kg
    estimated_yield = calculate_estimated_yield(
        yield_factor,
        max_yield_per_acre,
        farm_size_acres
    )
    
    # Step 6: Calculate yield range (±15% margin)
    min_yield, max_yield = calculate_yield_range(estimated_yield)
    
    # Return formatted response
    return {
        'estimatedYieldKg': round(estimated_yield),
        'expectedYieldRangeKg': {
            'min': round(min_yield),
            'max': round(max_yield)
        },
        'healthRatio': health_ratio,
        'diseaseRiskRatio': disease_ratio,
        'finalYieldScore': round(yield_factor, 2)
    }



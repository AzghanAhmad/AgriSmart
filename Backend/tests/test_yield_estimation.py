"""
Unit Tests for Yield Estimation Module
======================================

Tests cover:
- Valid input scenarios
- Missing required fields
- Out-of-range values
- Unsupported crop types
- Formula output sanity checks

Run with: pytest tests/test_yield_estimation.py -v
"""

import pytest
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.yield_estimation.service import (
    clamp,
    calculate_environmental_factor,
    calculate_correction_factor,
    calculate_yield_factor,
    calculate_estimated_yield,
    calculate_yield_range,
    estimate_yield,
    get_supported_crops,
    get_max_yield_per_acre
)
from modules.yield_estimation.validators import (
    validate_yield_request,
    sanitize_crop_type
)


class TestHelperFunctions:
    """Test helper functions in service.py"""
    
    def test_clamp_within_range(self):
        """Value within range should remain unchanged"""
        assert clamp(0.5, 0.0, 1.0) == 0.5
    
    def test_clamp_below_min(self):
        """Value below min should return min"""
        assert clamp(-0.5, 0.0, 1.0) == 0.0
    
    def test_clamp_above_max(self):
        """Value above max should return max"""
        assert clamp(1.5, 0.0, 1.0) == 1.0
    
    def test_clamp_at_boundaries(self):
        """Values at boundaries should be unchanged"""
        assert clamp(0.0, 0.0, 1.0) == 0.0
        assert clamp(1.0, 0.0, 1.0) == 1.0
    
    def test_sanitize_crop_type(self):
        """Crop type should be normalized to lowercase and trimmed"""
        assert sanitize_crop_type('  Wheat  ') == 'wheat'
        assert sanitize_crop_type('RICE') == 'rice'
        assert sanitize_crop_type('Maize') == 'maize'


class TestBenchmarks:
    """Test benchmark data loading"""
    
    def test_get_supported_crops(self):
        """Should return list of supported crops"""
        crops = get_supported_crops()
        assert isinstance(crops, list)
        assert 'wheat' in crops
        assert 'rice' in crops
        assert 'maize' in crops
    
    def test_get_max_yield_per_acre(self):
        """Should return correct max yield for each crop"""
        assert get_max_yield_per_acre('wheat') == 3200
        assert get_max_yield_per_acre('rice') == 2900
        assert get_max_yield_per_acre('maize') == 2800
    
    def test_get_max_yield_invalid_crop(self):
        """Should raise KeyError for unsupported crop"""
        with pytest.raises(KeyError):
            get_max_yield_per_acre('banana')


class TestEnvironmentalFactor:
    """Test environmental factor calculation"""
    
    def test_perfect_conditions(self):
        """All scores at 1.0 should give factor of 1.0"""
        result = calculate_environmental_factor(1.0, 1.0, 1.0)
        assert result == 1.0
    
    def test_zero_conditions(self):
        """All scores at 0.0 should give factor of 0.0"""
        result = calculate_environmental_factor(0.0, 0.0, 0.0)
        assert result == 0.0
    
    def test_weighted_calculation(self):
        """Verify correct weight distribution (40%, 30%, 30%)"""
        # Weather only
        assert calculate_environmental_factor(1.0, 0.0, 0.0) == 0.4
        # Soil only
        assert calculate_environmental_factor(0.0, 1.0, 0.0) == 0.3
        # Growth only
        assert calculate_environmental_factor(0.0, 0.0, 1.0) == 0.3
    
    def test_mixed_conditions(self):
        """Mixed scores should give weighted average"""
        result = calculate_environmental_factor(0.8, 0.6, 0.7)
        expected = (0.8 * 0.4) + (0.6 * 0.3) + (0.7 * 0.3)
        assert abs(result - expected) < 0.001


class TestCorrectionFactor:
    """Test health-based correction factor calculation"""
    
    def test_perfect_health_no_disease(self):
        """Perfect health with no disease should give max positive correction"""
        result = calculate_correction_factor(1.0, 0.0)
        assert result == 0.7  # 1.0 * 0.7 - 0.0 * 0.3
    
    def test_no_health_full_disease(self):
        """No health with full disease should give max negative correction"""
        result = calculate_correction_factor(0.0, 1.0)
        assert result == -0.3  # 0.0 * 0.7 - 1.0 * 0.3
    
    def test_balanced_health_disease(self):
        """Balanced health and disease"""
        result = calculate_correction_factor(0.5, 0.5)
        expected = (0.5 * 0.7) - (0.5 * 0.3)
        assert abs(result - expected) < 0.001


class TestYieldFactor:
    """Test yield factor calculation and clamping"""
    
    def test_normal_calculation(self):
        """Normal values should combine correctly"""
        result = calculate_yield_factor(0.5, 0.2)
        assert result == 0.7
    
    def test_clamping_at_max(self):
        """Result exceeding 1.0 should be clamped"""
        result = calculate_yield_factor(0.9, 0.5)
        assert result == 1.0
    
    def test_clamping_at_min(self):
        """Result below 0.0 should be clamped"""
        result = calculate_yield_factor(0.1, -0.5)
        # 0.1 + (-0.5) = -0.4, should clamp to 0
        assert result == 0.0


class TestEstimatedYield:
    """Test yield calculation in kg"""
    
    def test_full_yield(self):
        """100% yield factor should give max yield"""
        result = calculate_estimated_yield(1.0, 3200, 1.0)
        assert result == 3200
    
    def test_half_yield(self):
        """50% yield factor should give half max yield"""
        result = calculate_estimated_yield(0.5, 3200, 1.0)
        assert result == 1600
    
    def test_multiple_acres(self):
        """Yield should scale with farm size"""
        result = calculate_estimated_yield(1.0, 3200, 5.0)
        assert result == 16000


class TestYieldRange:
    """Test yield range calculation (±15%)"""
    
    def test_range_calculation(self):
        """Range should be ±15% of estimated yield"""
        min_yield, max_yield = calculate_yield_range(1000)
        assert min_yield == 850  # 1000 * 0.85
        assert max_yield == 1150  # 1000 * 1.15
    
    def test_range_zero(self):
        """Zero yield should give zero range"""
        min_yield, max_yield = calculate_yield_range(0)
        assert min_yield == 0
        assert max_yield == 0


class TestFullEstimation:
    """Test complete yield estimation"""
    
    def test_valid_estimation(self):
        """Complete estimation with valid inputs"""
        result = estimate_yield(
            crop_type='wheat',
            farm_size_acres=3.5,
            weather_score=0.78,
            soil_quality_score=0.66,
            sensor_growth_index=0.72,
            health_ratio=0.83,
            disease_ratio=0.21
        )
        
        # Check response structure
        assert 'estimatedYieldKg' in result
        assert 'expectedYieldRangeKg' in result
        assert 'healthRatio' in result
        assert 'diseaseRiskRatio' in result
        assert 'finalYieldScore' in result
        
        # Check value types
        assert isinstance(result['estimatedYieldKg'], int)
        assert isinstance(result['expectedYieldRangeKg']['min'], int)
        assert isinstance(result['expectedYieldRangeKg']['max'], int)
        
        # Check echoed values
        assert result['healthRatio'] == 0.83
        assert result['diseaseRiskRatio'] == 0.21
        
        # Check yield score is valid (0-1)
        assert 0 <= result['finalYieldScore'] <= 1
    
    def test_optimal_conditions(self):
        """Optimal conditions should give high yield"""
        result = estimate_yield(
            crop_type='wheat',
            farm_size_acres=1.0,
            weather_score=1.0,
            soil_quality_score=1.0,
            sensor_growth_index=1.0,
            health_ratio=1.0,
            disease_ratio=0.0
        )
        
        # Max yield for wheat is 3200 kg/acre
        # With perfect conditions, should be close to max
        assert result['estimatedYieldKg'] >= 3000
    
    def test_poor_conditions(self):
        """Poor conditions should give low yield"""
        result = estimate_yield(
            crop_type='wheat',
            farm_size_acres=1.0,
            weather_score=0.2,
            soil_quality_score=0.2,
            sensor_growth_index=0.2,
            health_ratio=0.2,
            disease_ratio=0.8
        )
        
        # Should have very low yield
        assert result['estimatedYieldKg'] < 1000


class TestValidation:
    """Test input validation"""
    
    def test_valid_input(self):
        """Valid input should return None (no errors)"""
        data = {
            'cropType': 'wheat',
            'farmSizeAcres': 3.5,
            'weatherScore': 0.78,
            'soilQualityScore': 0.66,
            'sensorGrowthIndex': 0.72,
            'healthRatio': 0.83,
            'diseaseRatio': 0.21
        }
        errors = validate_yield_request(data, ['wheat', 'rice', 'maize'])
        assert errors is None
    
    def test_missing_required_field(self):
        """Missing required field should return error"""
        data = {
            'farmSizeAcres': 3.5,
            'weatherScore': 0.78,
            'soilQualityScore': 0.66,
            'sensorGrowthIndex': 0.72,
            'healthRatio': 0.83,
            'diseaseRatio': 0.21
        }
        errors = validate_yield_request(data, ['wheat', 'rice', 'maize'])
        assert errors is not None
        assert any('cropType' in e for e in errors)
    
    def test_unsupported_crop(self):
        """Unsupported crop type should return error"""
        data = {
            'cropType': 'banana',
            'farmSizeAcres': 3.5,
            'weatherScore': 0.78,
            'soilQualityScore': 0.66,
            'sensorGrowthIndex': 0.72,
            'healthRatio': 0.83,
            'diseaseRatio': 0.21
        }
        errors = validate_yield_request(data, ['wheat', 'rice', 'maize'])
        assert errors is not None
        assert any('Unsupported cropType' in e for e in errors)
    
    def test_negative_farm_size(self):
        """Negative farm size should return error"""
        data = {
            'cropType': 'wheat',
            'farmSizeAcres': -1.0,
            'weatherScore': 0.78,
            'soilQualityScore': 0.66,
            'sensorGrowthIndex': 0.72,
            'healthRatio': 0.83,
            'diseaseRatio': 0.21
        }
        errors = validate_yield_request(data, ['wheat', 'rice', 'maize'])
        assert errors is not None
        assert any('farmSizeAcres' in e for e in errors)
    
    def test_score_out_of_range(self):
        """Score > 1.0 should return error"""
        data = {
            'cropType': 'wheat',
            'farmSizeAcres': 3.5,
            'weatherScore': 1.5,  # Invalid
            'soilQualityScore': 0.66,
            'sensorGrowthIndex': 0.72,
            'healthRatio': 0.83,
            'diseaseRatio': 0.21
        }
        errors = validate_yield_request(data, ['wheat', 'rice', 'maize'])
        assert errors is not None
        assert any('weatherScore' in e for e in errors)
    
    def test_multiple_errors(self):
        """Multiple invalid fields should return multiple errors"""
        data = {
            'cropType': 'banana',
            'farmSizeAcres': -1.0,
            'weatherScore': 1.5,
            'soilQualityScore': 0.66,
            'sensorGrowthIndex': 0.72,
            'healthRatio': 0.83,
            'diseaseRatio': 0.21
        }
        errors = validate_yield_request(data, ['wheat', 'rice', 'maize'])
        assert errors is not None
        assert len(errors) >= 3


class TestFormulaSanity:
    """Sanity checks for formula outputs"""
    
    def test_yield_increases_with_farm_size(self):
        """Larger farm should produce more yield"""
        small_farm = estimate_yield('wheat', 1.0, 0.7, 0.7, 0.7, 0.7, 0.3)
        large_farm = estimate_yield('wheat', 10.0, 0.7, 0.7, 0.7, 0.7, 0.3)
        
        assert large_farm['estimatedYieldKg'] > small_farm['estimatedYieldKg']
        assert large_farm['estimatedYieldKg'] == small_farm['estimatedYieldKg'] * 10
    
    def test_yield_decreases_with_disease(self):
        """Higher disease ratio should decrease yield"""
        healthy = estimate_yield('wheat', 1.0, 0.7, 0.7, 0.7, 0.8, 0.1)
        diseased = estimate_yield('wheat', 1.0, 0.7, 0.7, 0.7, 0.8, 0.9)
        
        assert healthy['estimatedYieldKg'] > diseased['estimatedYieldKg']
    
    def test_yield_range_contains_estimate(self):
        """Yield range should contain the estimated yield"""
        result = estimate_yield('wheat', 5.0, 0.7, 0.7, 0.7, 0.7, 0.3)
        
        min_yield = result['expectedYieldRangeKg']['min']
        max_yield = result['expectedYieldRangeKg']['max']
        estimated = result['estimatedYieldKg']
        
        assert min_yield < estimated < max_yield


if __name__ == '__main__':
    pytest.main([__file__, '-v'])



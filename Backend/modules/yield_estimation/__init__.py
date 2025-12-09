"""
Yield Estimation Module
=======================

This module provides crop yield estimation functionality based on:
- Environmental factors (weather, soil quality, sensor growth index)
- Health metrics from disease detection (Feature 1)
- Crop-specific benchmark data

Data Flow:
1. Frontend sends payload with crop info and health metrics
2. Controller validates input via validators.py
3. Service calculates yield using business logic from service.py
4. Response includes estimated yield, range, and final score

Endpoints:
- POST /api/yield/estimate - Calculate crop yield estimation
"""

from .controller import yield_estimation_bp

__all__ = ['yield_estimation_bp']



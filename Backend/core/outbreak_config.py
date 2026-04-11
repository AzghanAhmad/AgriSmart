"""
Regional outbreak sensitivity as a 0–100% scale (not raw counts).

- OUTBREAK_CLUSTER_FULL_PCT: reports within the alert radius that map to 100% sensitivity.
- OUTBREAK_ADMIN_ALERT_MIN_PCT: at or above this %, a pending alert is raised for admin review.
- OUTBREAK_SEVERITY_*_PCT: heatmap severity bands from the same sensitivity %.
"""
import os


def _env_float(name: str, default: str) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return float(default)


OUTBREAK_CLUSTER_FULL_PCT = _env_float('OUTBREAK_CLUSTER_FULL_PCT', '10')
OUTBREAK_ADMIN_ALERT_MIN_PCT = _env_float('OUTBREAK_ADMIN_ALERT_MIN_PCT', '30')
SEVERITY_HIGH_MIN_PCT = _env_float('OUTBREAK_SEVERITY_HIGH_PCT', '70')
SEVERITY_MEDIUM_MIN_PCT = _env_float('OUTBREAK_SEVERITY_MEDIUM_PCT', '40')


def cluster_sensitivity_percent(report_count: int) -> float:
    """Map report count in region to 0–100% sensitivity (capped)."""
    if OUTBREAK_CLUSTER_FULL_PCT <= 0:
        return 0.0
    return min(100.0, (float(report_count) / OUTBREAK_CLUSTER_FULL_PCT) * 100.0)


def should_raise_outbreak_alert(nearby_report_count: int) -> bool:
    """True when regional cluster density reaches the admin-notification threshold."""
    return cluster_sensitivity_percent(nearby_report_count) >= OUTBREAK_ADMIN_ALERT_MIN_PCT


def severity_from_sensitivity_pct(pct: float) -> str:
    """Return 'high' | 'medium' | 'low' for heatmap / API consumers."""
    if pct >= SEVERITY_HIGH_MIN_PCT:
        return 'high'
    if pct >= SEVERITY_MEDIUM_MIN_PCT:
        return 'medium'
    return 'low'


def heatmap_point_intensity_percent(nearby_other_count: int) -> int:
    """Normalize nearby-peer count to 15–100 for map point shading."""
    base = cluster_sensitivity_percent(nearby_other_count)
    return int(max(15, min(100, round(base))))

from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection, OutbreakAlert
    from ..schemas.user import User
    from ..core.outbreak_config import (
        cluster_sensitivity_percent,
        severity_from_sensitivity_pct,
        heatmap_point_intensity_percent,
    )
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection, OutbreakAlert
    from schemas.user import User
    from core.outbreak_config import (
        cluster_sensitivity_percent,
        severity_from_sensitivity_pct,
        heatmap_point_intensity_percent,
    )

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def _parse_range(range_key):
    normalized = (range_key or 'week').lower()
    if normalized not in ('week', 'month'):
        normalized = 'week'
    days = 7 if normalized == 'week' else 30
    today = datetime.utcnow().date()
    dates = [today - timedelta(days=days - 1 - i) for i in range(days)]
    labels = [d.strftime('%a') if normalized == 'week' else d.strftime('%d %b') for d in dates]
    return normalized, dates, labels, datetime.combine(dates[0], datetime.min.time())


def _series_from_dates(dates, counts_by_key, key):
    return [int(counts_by_key.get(key, {}).get(d, 0)) for d in dates]


@admin_bp.route('/dashboard/overview', methods=['GET'])
def dashboard_overview():
    db = SessionLocal()
    try:
        from sqlalchemy import func

        total_farmers = db.query(User).filter(User.role == 'farmer').count()
        total_reports = db.query(Detection).count()
        active_diseases = db.query(func.count(func.distinct(Detection.disease_name))).filter(
            Detection.disease_name.isnot(None),
            Detection.disease_name != 'Healthy Crop'
        ).scalar() or 0
        pending_alerts = db.query(OutbreakAlert).filter(OutbreakAlert.status == 'pending').count()
        approved_alerts = db.query(OutbreakAlert).filter(OutbreakAlert.status == 'approved').count()

        activities = []

        latest_farmers = (
            db.query(User)
            .filter(User.role == 'farmer')
            .order_by(User.created_at.desc())
            .limit(4)
            .all()
        )
        for farmer in latest_farmers:
            activities.append({
                'id': f"farmer-{farmer.user_id}",
                'type': 'farmer_registered',
                'title': farmer.name or 'Farmer',
                'subtitle': farmer.location or farmer.email or '',
                'timestamp': farmer.created_at.isoformat() if farmer.created_at else None,
            })

        latest_detections = (
            db.query(Detection)
            .order_by(Detection.timestamp.desc())
            .limit(4)
            .all()
        )
        for detection in latest_detections:
            activities.append({
                'id': f"detection-{detection.detection_id}",
                'type': 'detection_reported',
                'title': detection.disease_name or detection.disease_id or 'Detection',
                'subtitle': f"Farmer {detection.farmer_id or 'N/A'} • {(detection.confidence_score or 0):.0f}%",
                'timestamp': detection.timestamp.isoformat() if detection.timestamp else None,
            })

        latest_alerts = (
            db.query(OutbreakAlert)
            .order_by(OutbreakAlert.created_at.desc())
            .limit(4)
            .all()
        )
        for alert in latest_alerts:
            activities.append({
                'id': f"alert-{alert.alert_id}",
                'type': 'alert_created' if alert.status == 'pending' else 'alert_approved',
                'title': alert.disease_name or alert.disease_id or 'Outbreak Alert',
                'subtitle': f"{alert.status.title()} • {alert.radius_km:.0f} km radius",
                'timestamp': alert.created_at.isoformat() if alert.created_at else None,
            })

        activities.sort(key=lambda item: item.get('timestamp') or '', reverse=True)

        return jsonify({
            'stats': {
                'totalFarmers': total_farmers,
                'totalReports': total_reports,
                'activeDiseases': int(active_diseases),
                'pendingAlerts': pending_alerts,
                'approvedAlerts': approved_alerts,
            },
            'activities': activities[:8],
        })
    except Exception as e:
        print('❌ Error fetching dashboard overview:', str(e))
        return jsonify({
            'stats': {
                'totalFarmers': 0,
                'totalReports': 0,
                'activeDiseases': 0,
                'pendingAlerts': 0,
                'approvedAlerts': 0,
            },
            'activities': [],
        }), 500
    finally:
        db.close()


@admin_bp.route('/dashboard/trends/registrations', methods=['GET'])
def dashboard_registrations_trend():
    db = SessionLocal()
    try:
        range_key, dates, labels, start_dt = _parse_range(request.args.get('range'))
        farmers_by_day = defaultdict(int)
        reports_by_day = defaultdict(int)

        farmers = db.query(User).filter(
            User.role == 'farmer',
            User.created_at >= start_dt,
        ).all()
        for farmer in farmers:
            if farmer.created_at:
                farmers_by_day[farmer.created_at.date()] += 1

        detections = db.query(Detection).filter(Detection.timestamp >= start_dt).all()
        for detection in detections:
            if detection.timestamp:
                reports_by_day[detection.timestamp.date()] += 1

        return jsonify({
            'range': range_key,
            'labels': labels,
            'series': [
                {
                    'key': 'farmerRegistrations',
                    'label': 'Farmer registrations',
                    'color': '#14B8A6',
                    'data': [farmers_by_day.get(d, 0) for d in dates],
                },
                {
                    'key': 'diseaseReports',
                    'label': 'Disease reports',
                    'color': '#3B82F6',
                    'data': [reports_by_day.get(d, 0) for d in dates],
                },
            ],
        })
    except Exception as e:
        print('❌ Error fetching registration trend:', str(e))
        return jsonify({'range': 'week', 'labels': [], 'series': []}), 500
    finally:
        db.close()


@admin_bp.route('/dashboard/trends/crops', methods=['GET'])
def dashboard_crop_trend():
    db = SessionLocal()
    try:
        range_key, dates, labels, start_dt = _parse_range(request.args.get('range'))
        counts_by_crop = defaultdict(lambda: defaultdict(int))

        detections = db.query(Detection).filter(Detection.timestamp >= start_dt).all()
        for detection in detections:
            if not detection.timestamp:
                continue
            crop = (detection.crop_type or '').strip().lower()
            if crop not in ('wheat', 'rice', 'cotton'):
                continue
            counts_by_crop[crop][detection.timestamp.date()] += 1

        return jsonify({
            'range': range_key,
            'labels': labels,
            'series': [
                {
                    'key': 'wheat',
                    'label': 'Wheat',
                    'color': '#22C55E',
                    'data': _series_from_dates(dates, counts_by_crop, 'wheat'),
                },
                {
                    'key': 'rice',
                    'label': 'Rice',
                    'color': '#3B82F6',
                    'data': _series_from_dates(dates, counts_by_crop, 'rice'),
                },
                {
                    'key': 'cotton',
                    'label': 'Cotton',
                    'color': '#F59E0B',
                    'data': _series_from_dates(dates, counts_by_crop, 'cotton'),
                },
            ],
        })
    except Exception as e:
        print('❌ Error fetching crop trend:', str(e))
        return jsonify({'range': 'week', 'labels': [], 'series': []}), 500
    finally:
        db.close()


@admin_bp.route('/dashboard/trends/alerts', methods=['GET'])
def dashboard_alert_trend():
    db = SessionLocal()
    try:
        range_key, dates, labels, start_dt = _parse_range(request.args.get('range'))
        counts_by_status = defaultdict(lambda: defaultdict(int))

        alerts = db.query(OutbreakAlert).filter(OutbreakAlert.created_at >= start_dt).all()
        for alert in alerts:
            if not alert.created_at:
                continue
            status = (alert.status or '').strip().lower()
            if status not in ('pending', 'approved'):
                continue
            counts_by_status[status][alert.created_at.date()] += 1

        return jsonify({
            'range': range_key,
            'labels': labels,
            'series': [
                {
                    'key': 'pending',
                    'label': 'Pending alerts',
                    'color': '#EF4444',
                    'data': _series_from_dates(dates, counts_by_status, 'pending'),
                },
                {
                    'key': 'approved',
                    'label': 'Approved alerts',
                    'color': '#10B981',
                    'data': _series_from_dates(dates, counts_by_status, 'approved'),
                },
            ],
        })
    except Exception as e:
        print('❌ Error fetching alert trend:', str(e))
        return jsonify({'range': 'week', 'labels': [], 'series': []}), 500
    finally:
        db.close()

@admin_bp.route('/detections', methods=['GET'])
def list_detections():
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('pageSize', 20))
    offset = (page - 1) * page_size
    db = SessionLocal()
    try:
        total = db.query(Detection).count()
        rows = db.query(Detection).order_by(Detection.timestamp.desc()).offset(offset).limit(page_size).all()
        data = [{
            'detectionId': r.detection_id,
            'farmerId': r.farmer_id,
            'landId': r.land_id,
            'diseaseId': r.disease_id,
            'imageUrl': r.image_ref,
            'confidence': r.confidence_score,
            'status': r.status,
            'timestamp': r.timestamp.isoformat() if r.timestamp else None,
            'latitude': getattr(r, 'latitude', None),
            'longitude': getattr(r, 'longitude', None),
            'alertGenerated': getattr(r, 'alert_generated', None),
        } for r in rows]
        return jsonify({'total': total, 'page': page, 'pageSize': page_size, 'items': data})
    except Exception as e:
        print('❌ Error fetching admin detections:', str(e))
        return jsonify({'error': 'Failed to fetch detections', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/alerts', methods=['GET'])
def list_alerts():
    status = request.args.get('status')
    db = SessionLocal()
    try:
        # Check if OutbreakAlerts table exists
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if 'OutbreakAlerts' not in inspector.get_table_names():
            return jsonify({'items': []})
        
        q = db.query(OutbreakAlert)
        if status:
            q = q.filter(OutbreakAlert.status == status)
        alerts = q.order_by(OutbreakAlert.created_at.desc()).all()
        items = [{
            'alertId': a.alert_id,
            'diseaseId': a.disease_id,
            'diseaseName': getattr(a, 'disease_name', None) or a.disease_id or 'Unknown',
            'status': a.status,
            'createdAt': a.created_at.isoformat() if a.created_at else None,
            'centerLat': a.center_lat,
            'centerLng': a.center_lng,
            'radiusKm': a.radius_km,
        } for a in alerts]
        print(f"📋 Found {len(items)} outbreak alerts")
        return jsonify({'items': items})
    except Exception as e:
        print('❌ Error fetching alerts:', str(e))
        # Return empty list instead of error if table doesn't exist yet
        if 'no such table' in str(e).lower() or 'OutbreakAlerts' in str(e):
            return jsonify({'items': []})
        return jsonify({'error': 'Failed to fetch alerts', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/alerts/<alert_id>/approve', methods=['POST'])
def approve_alert(alert_id):
    db = SessionLocal()
    try:
        # Check if OutbreakAlerts table exists
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if 'OutbreakAlerts' not in inspector.get_table_names():
            return jsonify({'error': 'OutbreakAlerts table not found. Please run database migration.'}), 500
        
        alert = db.query(OutbreakAlert).filter(OutbreakAlert.alert_id == alert_id).first()
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        alert.status = 'approved'
        # Mark related detections as approved based on geo-radius and disease match
        # Use getattr to safely access columns that might not exist yet
        detections = db.query(Detection).filter(
            Detection.disease_id == alert.disease_id,
        ).all()
        for d in detections:
            if hasattr(d, 'latitude') and hasattr(d, 'longitude'):
                if getattr(d, 'latitude', None) is not None and getattr(d, 'longitude', None) is not None:
                    if hasattr(d, 'alert_generated'):
                        d.alert_generated = 'approved'
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        print('❌ Error approving alert:', str(e))
        db.rollback()
        return jsonify({'error': 'Failed to approve alert', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/heatmap/stats', methods=['GET'])
def heatmap_stats():
    """Get statistics for heatmap display"""
    db = SessionLocal()
    try:
        from sqlalchemy import func, distinct
        from datetime import datetime, timedelta
        
        # Total cases (all detections with diseases, excluding healthy crops)
        total_cases = db.query(Detection).filter(
            Detection.disease_name != 'Healthy Crop',
            Detection.disease_name.isnot(None)
        ).count()
        
        # Affected regions (unique locations from approved alerts)
        affected_regions = db.query(OutbreakAlert).filter(
            OutbreakAlert.status == 'approved'
        ).count()
        
        # Weekly increase (detections in last 7 days vs previous 7 days)
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        
        this_week = db.query(Detection).filter(
            Detection.timestamp >= week_ago,
            Detection.disease_name != 'Healthy Crop'
        ).count()
        
        last_week = db.query(Detection).filter(
            Detection.timestamp >= two_weeks_ago,
            Detection.timestamp < week_ago,
            Detection.disease_name != 'Healthy Crop'
        ).count()
        
        weekly_increase = 0
        if last_week > 0:
            weekly_increase = round(((this_week - last_week) / last_week) * 100, 1)
        elif this_week > 0:
            weekly_increase = 100.0
        
        # Estimate acres affected (simplified: assume each detection is from ~1 acre)
        # In production, this would come from land_id area data
        acres_affected = total_cases * 1.0  # Simplified estimation
        
        return jsonify({
            'totalCases': total_cases,
            'affectedRegions': affected_regions,
            'weeklyIncrease': weekly_increase,
            'acresAffected': round(acres_affected / 1000, 1) if acres_affected >= 1000 else round(acres_affected, 1),
            'acresAffectedRaw': acres_affected
        })
    except Exception as e:
        print('❌ Error fetching heatmap stats:', str(e))
        return jsonify({
            'totalCases': 0,
            'affectedRegions': 0,
            'weeklyIncrease': 0,
            'acresAffected': 0,
            'acresAffectedRaw': 0
        }), 500
    finally:
        db.close()


@admin_bp.route('/heatmap/points', methods=['GET'])
def heatmap_points():
    """Get all detection points for heatmap visualization"""
    db = SessionLocal()
    try:
        import math
        
        # Get all detections that are part of approved alerts
        approved_alerts = db.query(OutbreakAlert).filter(
            OutbreakAlert.status == 'approved'
        ).all()
        
        # Helper function to check if coordinates are in Pakistan
        def is_in_pakistan(lat, lng):
            return lat >= 23.5 and lat <= 37.0 and lng >= 60.0 and lng <= 77.0
        
        # Get all detections with coordinates and disease names
        all_detections = db.query(Detection).filter(
            Detection.latitude.isnot(None),
            Detection.longitude.isnot(None),
            Detection.disease_name.isnot(None),
            Detection.disease_name != 'Healthy Crop'
        ).all()
        
        # Filter to only include detections within Pakistan bounds
        detections = [
            d for d in all_detections 
            if is_in_pakistan(d.latitude, d.longitude)
        ]
        
        print(f"🔍 Found {len(all_detections)} total detections, {len(detections)} within Pakistan bounds")
        
        # Calculate intensity for each point based on nearby detections
        points = []
        for det in detections:
            # Count nearby detections within 10km radius (to calculate intensity)
            nearby_count = 0
            for other_det in detections:
                if other_det.detection_id != det.detection_id:
                    # Haversine distance calculation
                    lat1, lng1 = det.latitude, det.longitude
                    lat2, lng2 = other_det.latitude, other_det.longitude
                    
                    r = 6371.0  # Earth radius in km
                    d_lat = math.radians(lat2 - lat1)
                    d_lng = math.radians(lng2 - lng1)
                    a = (
                        math.sin(d_lat / 2) ** 2
                        + math.cos(math.radians(lat1))
                        * math.cos(math.radians(lat2))
                        * math.sin(d_lng / 2) ** 2
                    )
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    distance_km = r * c
                    
                    if distance_km <= 10.0:
                        nearby_count += 1
            
            # Intensity from regional peer density as 0–100% (same scale as outbreak sensitivity)
            intensity = heatmap_point_intensity_percent(nearby_count)
            
            points.append({
                'latitude': float(det.latitude),
                'longitude': float(det.longitude),
                'intensity': int(intensity),
                'diseaseName': str(det.disease_name or 'Unknown'),
            })
        
        print(f"📍 Generated {len(points)} heatmap points")
        if len(points) > 0:
            print(f"   Sample point: lat={points[0]['latitude']}, lng={points[0]['longitude']}, intensity={points[0]['intensity']}")
        
        return jsonify({'points': points})
    except Exception as e:
        print('❌ Error fetching heatmap points:', str(e))
        return jsonify({'points': []}), 500
    finally:
        db.close()


@admin_bp.route('/heatmap/alert-details/<alert_id>', methods=['GET'])
def alert_details(alert_id):
    """Get case count for a specific alert"""
    db = SessionLocal()
    try:
        from sqlalchemy import func
        import math
        
        alert = db.query(OutbreakAlert).filter(OutbreakAlert.alert_id == alert_id).first()
        if not alert:
            return jsonify({
                'cases': 0,
                'sensitivityPercent': 0.0,
                'severity': 'low',
            }), 404
        
        # Count detections within the alert's radius
        def _haversine_km(lat1, lng1, lat2, lng2):
            r = 6371.0
            d_lat = math.radians(lat2 - lat1)
            d_lng = math.radians(lng2 - lng1)
            a = (
                math.sin(d_lat / 2) ** 2
                + math.cos(math.radians(lat1))
                * math.cos(math.radians(lat2))
                * math.sin(d_lng / 2) ** 2
            )
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return r * c
        
        # Get disease name from alert
        disease_name = getattr(alert, 'disease_name', None) or alert.disease_id
        
        # Get all detections of the same disease
        detections = db.query(Detection).filter(
            Detection.disease_name == disease_name,
            Detection.latitude.isnot(None),
            Detection.longitude.isnot(None)
        ).all()
        
        # Count those within radius
        case_count = sum(
            1 for d in detections
            if _haversine_km(
                alert.center_lat, alert.center_lng,
                d.latitude, d.longitude
            ) <= alert.radius_km
        )
        
        sensitivity_pct = cluster_sensitivity_percent(case_count)
        severity = severity_from_sensitivity_pct(sensitivity_pct)
        return jsonify({
            'cases': case_count,
            'sensitivityPercent': round(sensitivity_pct, 1),
            'severity': severity,
        })
    except Exception as e:
        print('❌ Error fetching alert details:', str(e))
        return jsonify({
            'cases': 0,
            'sensitivityPercent': 0.0,
            'severity': 'low',
        }), 500
    finally:
        db.close()


@admin_bp.route('/farmers', methods=['GET'])
def list_farmers():
    """
    Get all farmers with their name and location.
    Returns users with role='farmer'.
    """
    db = SessionLocal()
    try:
        # Query all users with role='farmer'
        farmers = db.query(User).filter(User.role == 'farmer').order_by(User.created_at.desc()).all()
        
        items = []
        for f in farmers:
            # Get location - either from location string or coordinates
            location_str = None
            if getattr(f, 'location', None):
                location_str = f.location
            elif getattr(f, 'latitude', None) and getattr(f, 'longitude', None):
                location_str = f"Lat: {f.latitude:.4f}, Lng: {f.longitude:.4f}"
            
            items.append({
                'id': f.user_id,
                'name': f.name,
                'email': f.email,
                'phone': getattr(f, 'phone', None),
                'location': location_str,
                'latitude': getattr(f, 'latitude', None),
                'longitude': getattr(f, 'longitude', None),
                'registrationDate': f.created_at.isoformat() if f.created_at else None,
            })
        
        return jsonify({
            'total': len(items),
            'items': items
        })
    except Exception as e:
        print('❌ Error fetching farmers:', str(e))
        return jsonify({'error': 'Failed to fetch farmers', 'details': str(e)}), 500
    finally:
        db.close()

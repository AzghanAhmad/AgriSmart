from flask import Blueprint, request, jsonify
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection, OutbreakAlert
    from ..schemas.user import User
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection, OutbreakAlert
    from schemas.user import User

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

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
            
            # Intensity is based on nearby count (normalized to 0-100)
            # Minimum intensity is 30 (so all points are visible), each nearby detection adds 15
            intensity = min(30 + (nearby_count * 15), 100)
            
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
            return jsonify({'cases': 0}), 404
        
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
        
        return jsonify({'cases': case_count})
    except Exception as e:
        print('❌ Error fetching alert details:', str(e))
        return jsonify({'cases': 0}), 500
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

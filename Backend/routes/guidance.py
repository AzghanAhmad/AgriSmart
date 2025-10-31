from flask import Blueprint, request, jsonify
try:
    from ..db import SessionLocal
    from ..schemas.guidance import DiseaseGuidance
except ImportError:
    from db import SessionLocal
    from schemas.guidance import DiseaseGuidance


guidance_bp = Blueprint('guidance', __name__, url_prefix='/api/guidance')


@guidance_bp.route('', methods=['GET'])
def list_or_get_guidance():
    crop = (request.args.get('crop') or '').strip().lower()
    disease = (request.args.get('disease') or '').strip()

    db = SessionLocal()
    try:
        q = db.query(DiseaseGuidance)
        if crop:
            q = q.filter(DiseaseGuidance.crop == crop)
        if disease:
            q = q.filter(DiseaseGuidance.name == disease)
        rows = q.all()
        data = [{
            'id': r.guidance_id,
            'crop': r.crop,
            'name': r.name,
            'type': r.type,
            'symptoms': r.symptoms,
            'culturalControls': r.cultural_controls,
            'chemicalControl': r.chemical_control,
            'brands': r.brands,
            'notes': r.notes,
        } for r in rows]
        return jsonify({'items': data, 'count': len(data)})
    finally:
        db.close()



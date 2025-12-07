from sqlalchemy import Column, String, DateTime, Float, Text
from sqlalchemy.sql import func
try:
    from ..db import Base
except ImportError:
    from db import Base

class Detection(Base):
    __tablename__ = 'Detections'
    detection_id = Column(String(50), primary_key=True)
    farmer_id = Column(String(50), nullable=False)
    land_id = Column(String(50), nullable=True)
    disease_id = Column(String(50), nullable=True)
    image_ref = Column(String(255), nullable=True)
    confidence_score = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, default='pending')
    timestamp = Column(DateTime, server_default=func.current_timestamp())
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    alert_generated = Column(String(10), nullable=False, default='no')


class OutbreakAlert(Base):
    __tablename__ = 'OutbreakAlerts'

    alert_id = Column(String(50), primary_key=True)
    disease_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    status = Column(String(20), nullable=False, default='pending')
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    radius_km = Column(Float, nullable=False, default=10.0)



from sqlalchemy import Column, String, DateTime, Float, Text
from sqlalchemy.sql import func
from ..db import Base

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



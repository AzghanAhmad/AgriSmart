from sqlalchemy import Column, String, DateTime, Float, Text
from sqlalchemy.sql import func
from .db import Base

class Detection(Base):
    __tablename__ = 'Detections'
    detection_id = Column(String(50), primary_key=True)
    farmer_id = Column(String(50), nullable=False)
    land_id = Column(String(50), nullable=True)  # relaxed nullable to simplify integration
    disease_id = Column(String(50), nullable=True)  # relaxed nullable; can be mapped later
    image_ref = Column(String(255), nullable=True)
    confidence_score = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, default='pending')
    timestamp = Column(DateTime, server_default=func.current_timestamp())

class Disease(Base):
    __tablename__ = 'Diseases'
    disease_id = Column(String(50), primary_key=True)
    name_en = Column(String(100), nullable=False)
    name_ur = Column(String(100))
    symptoms = Column(Text)
    crop_id = Column(String(50), nullable=False)
    detection_model = Column(String(100))



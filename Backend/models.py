from sqlalchemy import Column, String, DateTime, Float, Text, Integer, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
try:
    from .db import Base
except ImportError:
    # Fallback for running as a script: python Backend/app.py
    from db import Base

# Note: Detection and Disease models are defined in schemas/detection.py
# This file only contains new models for TimeLapse feature

class Crop(Base):
    """
    Crop model to track individual crops for farmers.
    Each crop can have multiple timelapse entries.
    """
    __tablename__ = 'crops'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    farmer_id = Column(String(50), ForeignKey('Users.user_id'), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "Wheat Field A"
    crop_type = Column(String(50), nullable=False)  # e.g., "wheat", "rice", "cotton"
    start_date = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    
    # Relationship to timelapse entries
    timelapse_entries = relationship('TimelapseEntry', back_populates='crop', cascade='all, delete-orphan')


class TimelapseEntry(Base):
    """
    Timelapse entry model for tracking disease progression over time.
    Stores weekly uploads with AI detection results, weather data, and severity scores.
    """
    __tablename__ = 'timelapse_entries'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    crop_id = Column(Integer, ForeignKey('crops.id'), nullable=False, index=True)
    date = Column(DateTime, nullable=False, server_default=func.current_timestamp(), index=True)
    photo_url = Column(String(500), nullable=False)  # Path to original photo
    highlighted_photo_url = Column(String(500), nullable=True)  # Path to OpenCV highlighted version
    detected_disease = Column(String(120), nullable=True)  # Disease name from AI
    severity = Column(String(20), nullable=True)  # 'None', 'Mild', 'Moderate', 'Severe'
    severity_score = Column(Integer, nullable=True)  # 0-3 (0=None, 1=Mild, 2=Moderate, 3=Severe)
    weather_temp = Column(Float, nullable=True)  # Temperature in Celsius
    weather_humidity = Column(Float, nullable=True)  # Humidity percentage
    notes = Column(Text, nullable=True)  # Optional farmer notes
    ai_confidence = Column(Float, nullable=True)  # AI model confidence (0-1)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    
    # Relationship to crop
    crop = relationship('Crop', back_populates='timelapse_entries')



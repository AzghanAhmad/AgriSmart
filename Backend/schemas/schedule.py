from sqlalchemy import Column, String, DateTime, Text, JSON, Float
from sqlalchemy.sql import func
try:
    from ..db import Base
except ImportError:
    from db import Base

class Schedule(Base):
    __tablename__ = 'Schedules'
    schedule_id = Column(String(50), primary_key=True)
    farmer_id = Column(String(50), nullable=False)
    cultivation_id = Column(String(50), nullable=True)
    period = Column(String(20), nullable=True)  # 'week1', 'week2', etc.
    tasks = Column(JSON, nullable=True)  # Store tasks as JSON
    generated_by = Column(String(50), nullable=True)  # 'ai', 'manual', etc.
    timestamp = Column(DateTime, server_default=func.current_timestamp())

class ScheduleProgress(Base):
    __tablename__ = 'ScheduleProgress'
    progress_id = Column(String(50), primary_key=True)
    schedule_id = Column(String(50), nullable=False)
    week_number = Column(String(10), nullable=False)
    completion_rate = Column(String(10), nullable=True)  # '0.75' for 75%
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.current_timestamp())

class DiseaseSchedule(Base):
    """Stores pre-defined 7-day schedules for specific diseases"""
    __tablename__ = 'DiseaseSchedules'
    schedule_id = Column(String(50), primary_key=True)
    crop = Column(String(50), nullable=False)  # wheat, rice, cotton
    disease = Column(String(120), nullable=False)
    location = Column(String(100), nullable=False)  # e.g., 'Islamabad'
    temperature_min = Column(Float, nullable=True)
    temperature_max = Column(Float, nullable=True)
    day_plans = Column(JSON, nullable=False)  # 7-day plan with tasks for each day
    timestamp = Column(DateTime, server_default=func.current_timestamp())


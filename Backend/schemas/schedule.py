from sqlalchemy import Column, String, DateTime, Text, JSON
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


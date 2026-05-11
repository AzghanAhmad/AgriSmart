from sqlalchemy import Column, String, DateTime, Float, Integer, Text
from sqlalchemy.sql import func

try:
    from ..db import Base
except ImportError:
    from db import Base


class SubsidyProgram(Base):
    __tablename__ = 'SubsidyPrograms'

    subsidy_id = Column(String(50), primary_key=True)
    parent_subsidy_id = Column(String(50), nullable=True)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False, default=0.0)
    max_amount = Column(Float, nullable=True)
    eligibility_criteria = Column(Text, nullable=True)  # JSON array string
    application_deadline = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default='active')  # active|paused|expired
    total_applicants = Column(Integer, nullable=False, default=0)
    approved_applicants = Column(Integer, nullable=False, default=0)
    total_disbursed = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, server_default=func.current_timestamp())

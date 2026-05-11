from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func

try:
    from ..db import Base
except ImportError:
    from db import Base


class SubsidyApplication(Base):
    __tablename__ = 'SubsidyApplications'

    application_id = Column(String(50), primary_key=True)
    subsidy_id = Column(String(50), nullable=False)
    farmer_id = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default='pending')  # pending|accepted|rejected
    apply_note = Column(Text, nullable=True)
    decision_note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    decided_at = Column(DateTime, nullable=True)

from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func

try:
    from ..db import Base
except ImportError:
    from db import Base


class SystemSetting(Base):
    __tablename__ = 'SystemSettings'

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

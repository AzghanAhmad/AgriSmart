from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
try:
    from ..db import Base
except ImportError:
    from db import Base


class User(Base):
    __tablename__ = 'Users'

    user_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    location = Column(String(120), nullable=True)
    role = Column(String(20), nullable=False, default='farmer')
    created_at = Column(DateTime, server_default=func.current_timestamp())



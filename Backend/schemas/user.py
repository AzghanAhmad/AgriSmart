from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean
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
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    role = Column(String(20), nullable=False, default='farmer')
    profile_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    # Invalidate all JWTs when incremented (logout from all devices)
    token_version = Column(Integer, nullable=False, server_default='0')
    privacy_share_location = Column(Boolean, nullable=False, server_default='1')
    privacy_share_crop = Column(Boolean, nullable=False, server_default='0')
    privacy_analytics = Column(Boolean, nullable=False, server_default='1')
    farm_acres = Column(Float, nullable=True)
    farm_crop_types = Column(Integer, nullable=True)
    farm_health_score = Column(Float, nullable=True)
    farm_monthly_revenue = Column(Float, nullable=True)
    restricted_until = Column(DateTime, nullable=True)
    restriction_reason = Column(String(255), nullable=True)



from sqlalchemy import Column, String, Text, UniqueConstraint
try:
    from ..db import Base
except ImportError:
    from db import Base


class DiseaseGuidance(Base):
    __tablename__ = 'DiseaseGuidance'

    guidance_id = Column(String(50), primary_key=True)
    crop = Column(String(50), nullable=False)  # wheat, rice, cotton
    name = Column(String(120), nullable=False)  # disease/pest/beneficial name
    type = Column(String(60), nullable=False)  # Insect pest, Fungal disease, etc.
    symptoms = Column(Text, nullable=True)
    cultural_controls = Column(Text, nullable=True)
    chemical_control = Column(Text, nullable=True)
    brands = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint('crop', 'name', name='uq_guidance_crop_name'),
    )



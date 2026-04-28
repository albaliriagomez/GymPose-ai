import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class Meal(Base):
    __tablename__ = "meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(String, nullable=True)
    hora = Column(Time, nullable=True)
    status = Column(String, default="completed", nullable=False)
    proteina_g = Column(Float, nullable=True)
    carbos_g = Column(Float, nullable=True)
    grasas_g = Column(Float, nullable=True)
    kcal = Column(Float, nullable=True)
    ai_suggested = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="meals")

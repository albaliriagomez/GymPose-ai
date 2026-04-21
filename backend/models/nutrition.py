import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class NutritionProfile(Base):
    #perfil nutricional extendido del usuario. Guarda los datos que no están en User (edad, sexo, actividad) y el objetivo calórico calculado con Mifflin-St Jeor.
    #no duplica weight_kg / height_cm / goal que ya viven en User.
    __tablename__ = "nutrition_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    #datos que no existen en User
    age = Column(Integer, nullable=False)
    sex = Column(String, nullable=False) 
    # "sedentary" | "light" | "moderate" | "active" | "very_active"         
    activity_level = Column(String, nullable=False)  

    #calculado y guardado en cache para no recalcular siempre
    objetivo_kcal = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="nutrition_profile")


class Meal(Base):
    #comida individual registrada por el usuario en un día específico. Agrupa por user_id + date para construir el log diario.
    __tablename__ = "meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    date = Column(Date, nullable=False) 
    name = Column(String, nullable=False)   
    description = Column(String, nullable=True)
    time = Column(String, nullable=True)

    # "completed" | "in_progress" | "pending"
    status = Column(String, default="pending", nullable=False)

    #macros (opcionales al registrar manualmente)
    proteina_g = Column(Float, default=0)
    carbos_g = Column(Float, default=0)
    grasas_g = Column(Float, default=0)
    kcal = Column(Float, default=0)

    ai_suggested = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="meals")
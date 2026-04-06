import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False) # Guardaremos el hash
    
    # Campos que pide el perfil pero pueden ser nulos al registrarse
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    goal = Column(String, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    sessions = relationship("Session", back_populates="user")
    # Dejamos lista la relación para la tarea de Nutrición
    nutritions = relationship("Nutrition", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    date = Column(DateTime, default=datetime.utcnow)
    duration_seconds = Column(Integer, default=0)
    notes = Column(String, nullable=True)
    
    user = relationship("User", back_populates="sessions")
    repetitions = relationship("Repetition", back_populates="session")

class Repetition(Base):
    __tablename__ = "repetitions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    exercise = Column(String) # Coincide con /training y /posture
    score = Column(Float)    # Para el análisis de postura IA
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("Session", back_populates="repetitions")

# Nuevo Modelo para cumplir con la pestaña de Nutrición del Front
class Nutrition(Base):
    __tablename__ = "nutrition_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    daily_calories = Column(Integer)
    protein_g = Column(Integer)
    carbs_g = Column(Integer)
    fats_g = Column(Integer)
    description = Column(String)
    
    user = relationship("User", back_populates="nutritions")
import uuid
from datetime import datetime, date

from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class ProgressPlan(Base):
    __tablename__ = "progress_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    goal = Column(String, nullable=False)
    goal_normalized = Column(String, nullable=False, default="maintain")
    current_weight = Column(Float, nullable=False)
    target_weight = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)
    activity_level = Column(String, nullable=True)
    meals_per_day = Column(Integer, nullable=False, default=4)
    days_per_week = Column(Integer, nullable=False, default=5)
    body_style = Column(String, nullable=True)
    body_reference_id = Column(String, nullable=True)
    equipment_available = Column(JSON, nullable=True)
    weekly_plan = Column(JSON, nullable=False)
    daily_routine = Column(JSON, nullable=False)
    meal_plan = Column(JSON, nullable=False)
    calories_goal = Column(Integer, nullable=True)
    status = Column(String, default="active", nullable=False)
    generated_source = Column(String, nullable=False, default="unknown")
    input_signature = Column(String, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="progress_plan", uselist=False)


class ProgressLog(Base):
    __tablename__ = "progress_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    exercise_type = Column(String, nullable=False)
    sessions = Column(Integer, default=1, nullable=False)
    reps = Column(Integer, default=0, nullable=False)
    duration = Column(Integer, default=0, nullable=False)  # minutos
    weight_kg = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="progress_logs")

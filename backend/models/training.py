from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class TrainingPlanSelection(Base):
    __tablename__ = "training_plan_selections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    plan_variant = Column(String, nullable=False)
    frequency = Column(String, nullable=False, default="media")
    goal = Column(String, nullable=True)
    plan_payload = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    selected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="active_training_plan", uselist=False)
    routines = relationship(
        "TrainingRoutineProgress",
        back_populates="plan",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class TrainingRoutineProgress(Base):
    __tablename__ = "training_routine_progress"
    __table_args__ = (
        UniqueConstraint("training_plan_id", "day_number", name="uq_training_plan_day_number"),
    )

    id = Column(Integer, primary_key=True, index=True)
    training_plan_id = Column(
        Integer,
        ForeignKey("training_plan_selections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    day_name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completed_exercises_count = Column(Integer, nullable=True)
    total_exercises = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    plan = relationship("TrainingPlanSelection", back_populates="routines")
    user = relationship("User", backref="training_routines")


class TrainingExerciseProgress(Base):
    __tablename__ = "training_exercise_progress"
    __table_args__ = (
        UniqueConstraint("training_routine_id", "exercise_order", name="uq_training_routine_exercise_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    training_plan_id = Column(
        Integer,
        ForeignKey("training_plan_selections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    training_routine_id = Column(
        Integer,
        ForeignKey("training_routine_progress.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    exercise_order = Column(Integer, nullable=False)
    exercise_name = Column(String, nullable=False)
    sets_target = Column(Integer, nullable=False)
    reps_target = Column(String, nullable=False)
    reps_target_value = Column(Integer, nullable=True)
    sets_completed = Column(Integer, nullable=False, default=0)
    reps_completed_current_set = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="pending")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    plan = relationship("TrainingPlanSelection", backref="exercise_progress")
    routine = relationship("TrainingRoutineProgress", backref="exercise_progress")
    user = relationship("User", backref="training_exercise_progress")

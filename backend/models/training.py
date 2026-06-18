import uuid
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


class TrainingExerciseEvent(Base):
    __tablename__ = "training_exercise_events"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "day_number",
            "event_type",
            "client_event_id",
            name="uq_training_exercise_event_client_id",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    training_exercise_id = Column(
        Integer,
        ForeignKey("training_exercise_progress.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    client_event_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    reps_delta = Column(Integer, nullable=True)
    sets_delta = Column(Integer, nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plan = relationship("TrainingPlanSelection", backref="exercise_events")
    routine = relationship("TrainingRoutineProgress", backref="exercise_events")
    exercise = relationship("TrainingExerciseProgress", backref="events")
    user = relationship("User", backref="training_exercise_events")

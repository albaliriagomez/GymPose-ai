"""
schemas/training.py — GymPose
"""
from datetime import datetime
from uuid import UUID
from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


class Exercise(BaseModel):
    name: str
    sets: int
    reps: str           # "8-10" | "30 seg" | "12 c/lado"
    rest_seconds: int
    muscle_group: str
    mode: Optional[Literal["reps", "timer", "hold"]] = None
    notes: Optional[str] = None


class WorkoutDay(BaseModel):
    day_number: int
    day_name: str       # "Día 1 — Push (Empuje)"
    focus: str          # "Pecho, Hombros, Tríceps"
    exercises: List[Exercise]


class TrainingPlan(BaseModel):
    goal: str
    frequency_level: str    # "Baja (1-2 días)"
    days_per_week: int
    imc: Optional[float]
    imc_category: Optional[str]
    intensity: str           # "Moderada" | "Alta" | "Moderada-Alta"
    plan_type: str           # "Hipertrofia" | "Metabólico" | "Mantenimiento"
    description: str
    days: List[WorkoutDay]
    variant: Optional[str] = None   # "A" | "B" | "C"


class FrequencyRequest(BaseModel):
    frequency: str  # "baja" | "media" | "alta"


class TrainingPlanSelectRequest(BaseModel):
    plan_variant: Literal["A", "B", "C"]
    frequency: str = Field(default="media", pattern="^(baja|media|alta)$")


class TrainingExerciseRepRequest(BaseModel):
    reps_count: int = Field(1, ge=1, le=100)
    client_event_id: Optional[UUID] = None


class TrainingRoutineProgressItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_number: int
    day_name: str
    status: Literal["pending", "in_progress", "completed"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_exercises_count: Optional[int] = None
    total_exercises: Optional[int] = None


class TrainingExerciseProgressItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    exercise_order: int
    exercise_name: str
    sets_target: int
    reps_target: str
    reps_target_value: Optional[int] = None
    sets_completed: int
    reps_completed_current_set: int
    current_set: int
    rest_seconds: Optional[int] = None
    mode: Literal["reps", "timer", "hold"] = "reps"
    status: Literal["pending", "in_progress", "completed"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TrainingSessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_completed: bool
    day_number: int
    day_name: str
    total_exercises: int
    completed_exercises: int
    time_based_exercises: int = 0
    total_sets: int
    completed_sets: int
    total_reps: int
    total_time_seconds: int = 0
    completed_time_seconds: int = 0
    progress_pct: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None


class TrainingRoutineDayProgressItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_id: int
    routine_id: int
    plan_day_number: int
    day_number: int
    day_name: str
    status: Literal["pending", "in_progress", "completed"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_exercises_count: Optional[int] = None
    total_exercises: Optional[int] = None
    total_sets_target: Optional[int] = None
    total_sets_completed: Optional[int] = None
    total_reps_completed: Optional[int] = None
    progress_pct: float = 0.0
    current_exercise: Optional[TrainingExerciseProgressItem] = None
    exercises: List[TrainingExerciseProgressItem] = Field(default_factory=list)
    session_summary: Optional[TrainingSessionSummary] = None


class TrainingPlanSelectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_variant: str
    frequency: str
    goal: Optional[str] = None
    is_active: bool
    selected_at: datetime
    updated_at: datetime
    plan: TrainingPlan


class TrainingCurrentResponse(BaseModel):
    plan: TrainingPlanSelectionResponse
    current_day: Optional[TrainingRoutineDayProgressItem] = None


class TrainingRoutineProgressResponse(BaseModel):
    plan_id: int
    plan_variant: str
    frequency: str
    routines: List[TrainingRoutineDayProgressItem]
    current_day: Optional[TrainingRoutineDayProgressItem] = None


class TrainingRoutineCompleteRequest(BaseModel):
    completed_exercises_count: Optional[int] = Field(None, ge=0)
    total_exercises: Optional[int] = Field(None, ge=0)
    client_event_id: Optional[UUID] = None
    force: Optional[bool] = Field(False)


class TrainingExerciseEventRequest(BaseModel):
    exercise_id: Optional[int] = None
    exercise_name: Optional[str] = None
    exercise_mode: Optional[Literal["reps", "timer", "hold"]] = None
    tracking_mode: Optional[str] = None
    current_set: Optional[int] = Field(None, ge=1)
    sets_target: Optional[int] = Field(None, ge=1)
    reps_completed_current_set: Optional[int] = Field(None, ge=0)
    reps_target_value: Optional[int] = Field(None, ge=0)
    duration_seconds: Optional[int] = Field(None, ge=0)
    seconds_elapsed: Optional[int] = Field(None, ge=0)
    client_event_id: Optional[UUID] = None

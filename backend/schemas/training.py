"""
schemas/training.py — GymPose
"""
from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


class Exercise(BaseModel):
    name: str
    sets: int
    reps: str           # "8-10" | "30 seg" | "12 c/lado"
    rest_seconds: int
    muscle_group: str
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
    status: Literal["pending", "in_progress", "completed"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TrainingRoutineDayProgressItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_id: int
    day_number: int
    day_name: str
    status: Literal["pending", "in_progress", "completed"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_exercises_count: Optional[int] = None
    total_exercises: Optional[int] = None
    current_exercise: Optional[TrainingExerciseProgressItem] = None
    exercises: List[TrainingExerciseProgressItem] = Field(default_factory=list)


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

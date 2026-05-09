from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExerciseItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    sets: int = Field(..., ge=1, le=10)
    reps: str
    rest_sec: int = Field(..., ge=0, le=600)


class RoutineDay(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_index: int = Field(..., ge=0, le=6)
    day_label: str
    focus: str
    duration_min: int = Field(..., ge=10, le=180)
    exercises: List[ExerciseItem]


class MealItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    description: str
    kcal: int = Field(..., ge=0, le=4000)


class MealDay(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_index: int = Field(..., ge=0, le=6)
    day_label: str
    meals: List[MealItem]


class GeneratedPlanAIResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    goal_normalized: str = Field(..., pattern="^(gain|lose|maintain)$")
    rutina_semanal: List[RoutineDay]
    rutina_diaria_actual: RoutineDay
    plan_comidas: List[MealDay]
    meals_per_day: int = Field(..., ge=1, le=8)
    calories_goal: int = Field(..., ge=800, le=6000)
    updated_at: datetime


class ProgressGenerateRequest(BaseModel):
    goal: Optional[str] = None
    body_reference_id: Optional[str] = None
    body_style: Optional[str] = None
    weight_kg: Optional[float] = Field(None, gt=0)
    height_cm: Optional[float] = Field(None, gt=0)
    age: Optional[int] = Field(None, gt=0, lt=120)
    sex: Optional[str] = Field(None, pattern="^(male|female)$")
    activity_level: Optional[str] = Field(
        None, pattern="^(sedentary|light|moderate|active|very_active)$"
    )
    meals_per_day: Optional[int] = Field(None, ge=1, le=8)
    days_per_week: Optional[int] = Field(None, ge=1, le=7)
    equipment_available: Optional[List[str]] = None


class ProgressPlanResponse(BaseModel):
    goal: str
    goal_normalized: str
    body_reference_id: Optional[str] = None
    body_style: Optional[str] = None
    current_weight: float
    target_weight: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    activity_level: Optional[str] = None
    meals_per_day: int
    days_per_week: int
    equipment_available: Optional[List[str]] = None
    rutina_semanal: List[RoutineDay]
    rutina_diaria_actual: RoutineDay
    plan_comidas: List[MealDay]
    calories_goal: Optional[int] = None
    summary_text: str
    source: str
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True


class ProgressSummaryResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    sessions_completed: int
    repetitions_total: int
    active_days: int
    total_duration_min: int
    progress_pct: float
    weight_change_kg: Optional[float] = None
    logs_count: int


class ProgressLogCreate(BaseModel):
    date: date
    exercise_type: str = Field(..., min_length=1, max_length=100)
    sessions: int = Field(1, ge=1, le=100)
    reps: int = Field(0, ge=0)
    duration: int = Field(0, ge=0, description="Duración en minutos")
    weight_kg: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class ProgressLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    exercise_type: str
    sessions: int
    reps: int
    duration: int
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

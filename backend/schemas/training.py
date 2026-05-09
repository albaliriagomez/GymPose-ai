"""
schemas/training.py — GymPose
"""
from pydantic import BaseModel
from typing import List, Optional


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
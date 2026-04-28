from pydantic import BaseModel
from typing import List, Optional

class Exercise(BaseModel):
    name: str
    sets: int
    reps: str          # "10-12" o "30 seg"
    rest_seconds: int
    muscle_group: str
    notes: Optional[str] = None

class WorkoutDay(BaseModel):
    day_number: int
    day_name: str      # "Día 1 - Empuje"
    focus: str         # "Pecho, Hombros, Tríceps"
    exercises: List[Exercise]

class TrainingPlan(BaseModel):
    goal: str
    frequency_level: str   # "Baja", "Media", "Alta"
    days_per_week: int
    imc: Optional[float]
    imc_category: Optional[str]
    intensity: str         # "Moderada", "Alta"
    plan_type: str         # "Hipertrofia", "Metabólico", "Mantenimiento"
    description: str
    days: List[WorkoutDay]

class FrequencyRequest(BaseModel):
    frequency: str  # "baja", "media", "alta"
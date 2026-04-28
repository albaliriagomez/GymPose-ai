from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MacrosPct(BaseModel):
    proteina: int
    carbos: int
    grasas: int


class NutritionProfileResponse(BaseModel):
    objetivo_kcal: Optional[int] = None
    goal: Optional[str] = None
    macros_pct: Optional[MacrosPct] = None
    incomplete: bool
    message: Optional[str] = None


class MealCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    hora: Optional[str] = None
    kcal: Optional[float] = None
    proteina_g: Optional[float] = None
    carbos_g: Optional[float] = None
    grasas_g: Optional[float] = None
    ai_suggested: bool = False


class MealItem(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    time: Optional[str] = None
    status: str
    macros: dict
    kcal: float
    aiSuggested: bool


class MealsResponse(BaseModel):
    lastUpdated: Optional[str] = None
    meals: List[MealItem]


class TipResponse(BaseModel):
    title: str
    tip: str

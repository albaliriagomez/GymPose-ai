from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID


class NutritionProfileCreate(BaseModel):
    age: int = Field(..., gt=0, lt=120)
    sex: str = Field(..., pattern="^(male|female)$")
    activity_level: str = Field(..., pattern="^(sedentary|light|moderate|active|very_active)$")

class NutritionProfileResponse(BaseModel):
    objetivo_kcal: int
    age: int
    sex: str
    activity_level: str
    #campos de User que devolvemos para que el frontend los tenga juntos
    weight_kg: Optional[float]
    height_cm: Optional[float]
    goal: Optional[str]

    class Config:
        from_attributes = True


class Macros(BaseModel):
    proteina: float
    carbos: float
    grasas: float


class MealCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    time: Optional[str] = None          #"08:00 AM"
    macros: Optional[Macros] = None
    ai_suggested: bool = False

class MealStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(completed|in_progress|pending)$")

class MealResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    time: Optional[str]
    status: str
    macros: Macros
    aiSuggested: bool   #camelCase para que coincida con lo que espera el frontend

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_meal(cls, meal):
        return cls(
            id=meal.id,
            name=meal.name,
            description=meal.description,
            time=meal.time,
            status=meal.status,
            macros=Macros(
                proteina=meal.proteina_g or 0.0,
                carbos=meal.carbos_g or 0.0,
                grasas=meal.grasas_g or 0.0,
            ),
            aiSuggested=meal.ai_suggested,
        )


class MealsResponse(BaseModel):
    lastUpdated: str       #"12:30 PM" — camelCase para el frontend
    meals: List[MealResponse]
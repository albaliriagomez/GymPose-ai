from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user   #mismo helper que usa auth.py
from schemas.nutrition import (
    NutritionProfileCreate,
    NutritionProfileResponse,
    MealCreate,
    MealStatusUpdate,
    MealResponse,
    MealsResponse,
)
from services import nutrition_service

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


@router.get("/profile", response_model=NutritionProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = nutrition_service.get_nutrition_profile(db, current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil nutricional no configurado. Completa tu perfil primero.",
        )
    return NutritionProfileResponse(
        objetivo_kcal=profile.objetivo_kcal,
        age=profile.age,
        sex=profile.sex,
        activity_level=profile.activity_level,
        weight_kg=current_user.weight_kg,
        height_cm=current_user.height_cm,
        goal=current_user.goal,
    )


@router.post("/profile", response_model=NutritionProfileResponse, status_code=status.HTTP_201_CREATED)
def save_profile(
    body: NutritionProfileCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = nutrition_service.create_or_update_profile(
        db,
        user_id=current_user.id,
        age=body.age,
        sex=body.sex,
        activity_level=body.activity_level,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    profile, user = result
    return NutritionProfileResponse(
        objetivo_kcal=profile.objetivo_kcal,
        age=profile.age,
        sex=profile.sex,
        activity_level=profile.activity_level,
        weight_kg=user.weight_kg,
        height_cm=user.height_cm,
        goal=user.goal,
    )


@router.get("/meals", response_model=MealsResponse)
def get_meals(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meals = nutrition_service.get_meals_today(db, current_user.id)
    last_updated = datetime.now().strftime("%I:%M %p")  # "12:30 PM"

    return MealsResponse(
        lastUpdated=last_updated,
        meals=[MealResponse.from_orm_meal(m) for m in meals],
    )


@router.post("/meals", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
def add_meal(
    body: MealCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meal = nutrition_service.create_meal(
        db,
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        time=body.time,
        macros=body.macros,
        ai_suggested=body.ai_suggested,
    )
    return MealResponse.from_orm_meal(meal)


@router.patch("/meals/{meal_id}", response_model=MealResponse)
def update_status(
    meal_id: UUID,
    body: MealStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meal = nutrition_service.update_meal_status(
        db, meal_id=meal_id, user_id=current_user.id, new_status=body.status
    )
    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comida no encontrada o no pertenece a este usuario.",
        )
    return MealResponse.from_orm_meal(meal)
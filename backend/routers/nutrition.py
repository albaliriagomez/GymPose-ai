from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as DBSession

from database import get_db
from routers.auth import get_current_user
from schemas.nutrition import MealCreate, MealStatusUpdate, MealsResponse, NutritionProfileResponse, TipResponse
from services import nutrition_service

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


@router.get("/profile", response_model=NutritionProfileResponse)
def nutrition_profile(
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return nutrition_service.compute_nutrition_profile(current_user)


@router.get("/meals", response_model=MealsResponse)
def get_meals(
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meals = nutrition_service.get_meals_today(db, current_user.id)
    if not meals:
        return {"lastUpdated": None, "meals": []}
    return {
        "lastUpdated": datetime.now().strftime("%I:%M %p"),
        "meals": [nutrition_service.meal_to_item(m) for m in meals],
    }


@router.post("/meals", status_code=status.HTTP_201_CREATED)
def add_meal(
    body: MealCreate,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meal = nutrition_service.create_meal(db, current_user.id, body.model_dump())
    return nutrition_service.meal_to_item(meal)


@router.patch("/meals/{meal_id}")
def patch_meal_status(
    meal_id: UUID,
    body: MealStatusUpdate,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meal = nutrition_service.update_meal_status(db, current_user.id, meal_id, body.status)
    if not meal:
        raise HTTPException(status_code=404, detail="Comida no encontrada")
    return nutrition_service.meal_to_item(meal)


@router.get("/tip", response_model=TipResponse)
def get_tip(
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = nutrition_service.compute_nutrition_profile(current_user)
    consumed = nutrition_service.total_kcal_today(db, current_user.id)
    goal_key = profile.get("goal", nutrition_service.normalize_goal(current_user.goal))
    objetivo = profile.get("objetivo_kcal") or 2200
    return nutrition_service.generate_tip(
        nutrition_service.goal_text(goal_key), consumed, int(objetivo)
    )


@router.get("/suggest-meals")
def suggest_meals(
    force: bool = Query(False),
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = nutrition_service.compute_nutrition_profile(current_user)
    if profile.get("incomplete"):
        raise HTTPException(status_code=400, detail=profile["message"])

    existing = nutrition_service.get_meals_today(db, current_user.id)
    if existing and not force:
        return JSONResponse(
            status_code=409,
            content={"error": "already_exists", "message": "Ya tienes comidas registradas hoy"},
        )
    if existing and force:
        for meal in existing:
            db.delete(meal)
        db.commit()

    try:
        generated = nutrition_service.generate_meal_plan(
            nutrition_service.goal_text(profile["goal"]),
            profile["objetivo_kcal"],
            profile["macros_pct"],
        )
    except Exception:
        raise HTTPException(status_code=502, detail="No se pudo generar el plan de comidas")

    for item in generated:
        payload = {
            "name": item.get("name", "Comida"),
            "description": item.get("description"),
            "hora": item.get("hora"),
            "kcal": item.get("kcal"),
            "proteina_g": item.get("proteina_g"),
            "carbos_g": item.get("carbos_g"),
            "grasas_g": item.get("grasas_g"),
            "ai_suggested": True,
        }
        nutrition_service.create_meal(db, current_user.id, payload)

    meals = nutrition_service.get_meals_today(db, current_user.id)
    return {
        "lastUpdated": datetime.now().strftime("%I:%M %p"),
        "meals": [nutrition_service.meal_to_item(m) for m in meals],
    }

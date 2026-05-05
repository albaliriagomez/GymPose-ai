from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as DBSession

from database import get_db
from routers.auth import get_current_user
from schemas.nutrition import (
    DailySummaryResponse,
    MealCreate,
    MealRegenerateRequest,
    MealStatusUpdate,
    MealsResponse,
    NutritionProfileResponse,
    RecipeResponse,
    TipResponse,
)
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
    meal = nutrition_service.update_meal_fields(
        db,
        current_user.id,
        meal_id,
        status=body.status,
        description=body.description,
        hora=body.hora,
    )
    if not meal:
        raise HTTPException(status_code=404, detail="Comida no encontrada")
    return nutrition_service.meal_to_item(meal)


@router.delete("/meals/{meal_id}")
def delete_meal(
    meal_id: UUID,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ok = nutrition_service.delete_meal(db, current_user.id, meal_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Comida no encontrada")
    return {"ok": True}


@router.post("/meals/regenerate")
def regenerate_meal(
    body: MealRegenerateRequest,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meal = nutrition_service.get_meal_by_id(db, current_user.id, body.meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Comida no encontrada")
    profile = nutrition_service.compute_nutrition_profile(current_user)
    goal_key = profile.get("goal", nutrition_service.normalize_goal(current_user.goal))
    kcal_estimadas = int(round(float(meal.kcal or (profile.get("objetivo_kcal", 2100) / 3))))
    try:
        alt = nutrition_service.regenerate_single_meal(
            original_description=meal.descripcion or meal.nombre,
            goal_value=nutrition_service.goal_text(goal_key),
            kcal_estimadas=kcal_estimadas,
            preferencia_alimentaria=current_user.preferencia_alimentaria,
            alergias=current_user.alergias,
            ingredientes=body.ingredientes,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo regenerar la comida con IA: {exc}")
    meal.descripcion = alt["description"] or meal.descripcion
    meal.kcal = alt["kcal"]
    meal.proteina_g = alt["proteina_g"]
    meal.carbos_g = alt["carbos_g"]
    meal.grasas_g = alt["grasas_g"]
    db.commit()
    db.refresh(meal)
    return nutrition_service.meal_to_item(meal)


@router.get("/meals/{meal_id}/recipe", response_model=RecipeResponse)
def meal_recipe(
    meal_id: UUID,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meal = nutrition_service.get_meal_by_id(db, current_user.id, meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Comida no encontrada")
    try:
        return nutrition_service.get_recipe_for_meal(meal.descripcion or meal.nombre)
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo obtener la receta. Intenta de nuevo.")


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
        nutrition_service.goal_text(goal_key),
        consumed,
        int(objetivo),
        current_user.preferencia_alimentaria,
        current_user.alergias,
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
            current_user.preferencia_alimentaria,
            current_user.alergias,
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


@router.get("/daily-summary", response_model=DailySummaryResponse)
def daily_summary(
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    meals = nutrition_service.get_meals_today(db, current_user.id)
    if not meals:
        raise HTTPException(status_code=400, detail="Registra tus comidas primero para obtener un análisis.")
    profile = nutrition_service.compute_nutrition_profile(current_user)
    goal_key = profile.get("goal", nutrition_service.normalize_goal(current_user.goal))
    objetivo = int(profile.get("objetivo_kcal") or 2200)
    try:
        return nutrition_service.generate_daily_summary(
            meals=meals,
            goal_value=nutrition_service.goal_text(goal_key),
            objetivo_kcal=objetivo,
            macros_pct=profile.get("macros_pct") or {"proteina": 30, "carbos": 40, "grasas": 30},
        )
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo generar el análisis del día. Intenta de nuevo.")

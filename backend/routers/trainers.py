from collections import defaultdict
from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DBSession

from database import get_db
from models import Session as TrainingSession
from models import User
from models.nutrition import Meal
from routers.auth import get_current_user
from services import nutrition_service

router = APIRouter(tags=["Trainers"])
trainer_router = APIRouter(prefix="/trainer", tags=["Trainer Dashboard"])


def _require_trainer(current_user: User) -> None:
    if (current_user.role or "user") != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para entrenadores",
        )


def _objective_kcal(user: User) -> int:
    profile = nutrition_service.compute_nutrition_profile(user)
    return int(profile.get("objetivo_kcal") or 2000)


def _completed_meals_query(db: DBSession, user_id):
    return db.query(Meal).filter(Meal.user_id == user_id, Meal.status == "completed")


def _macros_from_meals(meals: list[Meal]) -> dict:
    return {
        "proteina": round(sum(float(m.proteina_g or 0) for m in meals), 2),
        "carbos": round(sum(float(m.carbos_g or 0) for m in meals), 2),
        "grasas": round(sum(float(m.grasas_g or 0) for m in meals), 2),
    }


def _client_state(kcal_hoy: float, objetivo_kcal: int, ultima_actividad: datetime | None) -> str:
    if kcal_hoy >= objetivo_kcal * 0.9:
        return "objetivo_cumplido"
    if ultima_actividad is None or datetime.utcnow() - ultima_actividad > timedelta(hours=24):
        return "necesita_atencion"
    return "en_progreso"


def _daily_completed_meals(db: DBSession, user_id, start_day: date, end_day: date) -> list[Meal]:
    return (
        _completed_meals_query(db, user_id)
        .filter(Meal.fecha >= start_day, Meal.fecha <= end_day)
        .order_by(Meal.fecha.asc(), Meal.created_at.asc())
        .all()
    )


def _group_completed_totals(meals: list[Meal]) -> dict:
    grouped = defaultdict(lambda: {"kcal": 0.0, "proteina": 0.0, "carbos": 0.0, "grasas": 0.0})
    for meal in meals:
        day = meal.fecha.isoformat()
        grouped[day]["kcal"] += float(meal.kcal or 0)
        grouped[day]["proteina"] += float(meal.proteina_g or 0)
        grouped[day]["carbos"] += float(meal.carbos_g or 0)
        grouped[day]["grasas"] += float(meal.grasas_g or 0)
    return grouped


def _seven_day_kcal_history(db: DBSession, user: User) -> list[dict]:
    objetivo_kcal = _objective_kcal(user)
    today = date.today()
    start_day = today - timedelta(days=6)
    meals = _daily_completed_meals(db, user.id, start_day, today)
    grouped = _group_completed_totals(meals)

    return [
        {
            "fecha": (start_day + timedelta(days=offset)).isoformat(),
            "kcal_consumidas": round(grouped[(start_day + timedelta(days=offset)).isoformat()]["kcal"], 2),
            "objetivo_kcal": objetivo_kcal,
        }
        for offset in range(7)
    ]


def _average_macros_last_7_days(db: DBSession, user_id) -> dict:
    today = date.today()
    start_day = today - timedelta(days=6)
    meals = _daily_completed_meals(db, user_id, start_day, today)
    totals = _macros_from_meals(meals)
    return {key: round(value / 7, 2) for key, value in totals.items()}


def _training_sessions(db: DBSession, user_id) -> list[dict]:
    try:
        sessions = (
            db.query(TrainingSession)
            .filter(TrainingSession.user_id == user_id)
            .order_by(TrainingSession.date.desc())
            .limit(3)
            .all()
        )
        return [
            {
                "id": session.id,
                "date": session.date.isoformat() if session.date else None,
                "duration_seconds": session.duration_seconds,
                "notes": session.notes,
            }
            for session in sessions
        ]
    except SQLAlchemyError:
        db.rollback()
        return []


def _get_owned_client(db: DBSession, trainer: User, user_id: UUID) -> User:
    client = db.query(User).filter(User.id == user_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    if client.trainer_id != trainer.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cliente no asignado a este entrenador")
    return client


def _trend(values: list[float]) -> str:
    if len(values) < 2:
        return "estable"
    diff = values[-1] - values[0]
    if diff > 100:
        return "subiendo"
    if diff < -100:
        return "bajando"
    return "estable"


def _fallback_analysis(client: User, adherence: int) -> dict:
    return {
        "resumen": f"{client.name} muestra un progreso estable y cuenta con datos suficientes para ajustar el plan con criterio.",
        "puntos_positivos": [
            "Mantiene seguimiento nutricional reciente.",
            "Tiene un objetivo definido para orientar las recomendaciones.",
        ],
        "areas_mejora": [
            "Mejorar la consistencia diaria del registro de comidas.",
            "Ajustar la distribucion de macronutrientes segun el objetivo.",
        ],
        "recomendaciones": [
            "Revisar el consumo de proteina en desayuno y almuerzo.",
            "Mantener un rango calorico cercano al objetivo diario.",
            "Programar una revision semanal para ajustar el plan.",
        ],
        "nivel_adherencia": adherence,
    }


@router.get("/trainers")
def list_trainers(db: DBSession = Depends(get_db)):
    trainers = db.query(User).filter(User.role == "trainer").order_by(User.name.asc()).all()
    return [
        {
            "id": str(trainer.id),
            "name": trainer.name,
            "email": trainer.email,
        }
        for trainer in trainers
    ]


@trainer_router.get("/clients")
def list_clients(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_trainer(current_user)
    clients = db.query(User).filter(User.trainer_id == current_user.id).order_by(User.name.asc()).all()
    today = date.today()
    response = []

    for client in clients:
        objetivo_kcal = _objective_kcal(client)
        meals_today = (
            _completed_meals_query(db, client.id)
            .filter(Meal.fecha == today)
            .all()
        )
        kcal_hoy = sum(float(meal.kcal or 0) for meal in meals_today)
        ultima_actividad = (
            db.query(func.max(Meal.created_at))
            .filter(Meal.user_id == client.id)
            .scalar()
        )
        response.append({
            "id": str(client.id),
            "name": client.name,
            "email": client.email,
            "goal": client.goal,
            "objetivo_kcal": objetivo_kcal,
            "nivel_actividad": client.nivel_actividad,
            "ultima_actividad": ultima_actividad.isoformat() if ultima_actividad else None,
            "kcal_hoy": round(kcal_hoy, 2),
            "macros_hoy": _macros_from_meals(meals_today),
            "estado": _client_state(kcal_hoy, objetivo_kcal, ultima_actividad),
        })

    return response


@trainer_router.get("/clients/{user_id}")
def client_detail(
    user_id: UUID,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_trainer(current_user)
    client = _get_owned_client(db, current_user, user_id)
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == client.id)
        .order_by(Meal.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "id": str(client.id),
        "name": client.name,
        "email": client.email,
        "role": client.role or "user",
        "trainer_id": str(client.trainer_id) if client.trainer_id else None,
        "weight_kg": client.weight_kg,
        "height_cm": client.height_cm,
        "goal": client.goal,
        "edad": client.edad,
        "sexo": client.sexo,
        "nivel_actividad": client.nivel_actividad,
        "preferencia_alimentaria": client.preferencia_alimentaria,
        "alergias": client.alergias,
        "created_at": client.created_at.isoformat() if client.created_at else None,
        "kcal_history": _seven_day_kcal_history(db, client),
        "latest_meals": [nutrition_service.meal_to_item(meal) for meal in meals],
        "macros_promedio_7_dias": _average_macros_last_7_days(db, client.id),
        "training_sessions": _training_sessions(db, client.id),
    }


@trainer_router.get("/clients/{user_id}/nutrition-history")
def nutrition_history(
    user_id: UUID,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_trainer(current_user)
    client = _get_owned_client(db, current_user, user_id)
    objetivo_kcal = _objective_kcal(client)
    today = date.today()
    start_day = today - timedelta(days=29)
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == client.id, Meal.fecha >= start_day, Meal.fecha <= today)
        .order_by(Meal.fecha.asc(), Meal.created_at.asc())
        .all()
    )
    by_day = defaultdict(list)
    for meal in meals:
        by_day[meal.fecha.isoformat()].append(meal)

    history = []
    for offset in range(30):
        day = start_day + timedelta(days=offset)
        day_key = day.isoformat()
        day_meals = by_day.get(day_key, [])
        completed = [meal for meal in day_meals if meal.status == "completed"]
        history.append({
            "fecha": day_key,
            "comidas": [nutrition_service.meal_to_item(meal) for meal in day_meals],
            "total_kcal": round(sum(float(meal.kcal or 0) for meal in completed), 2),
            "objetivo_kcal": objetivo_kcal,
            "macros": _macros_from_meals(completed),
        })

    return history


@trainer_router.get("/ai-analysis/{user_id}")
def ai_analysis(
    user_id: UUID,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_trainer(current_user)
    client = _get_owned_client(db, current_user, user_id)
    objetivo_kcal = _objective_kcal(client)
    history = _seven_day_kcal_history(db, client)
    kcal_values = [float(day["kcal_consumidas"]) for day in history]
    average = round(sum(kcal_values) / 7, 2)
    fulfilled_days = sum(1 for value in kcal_values if value >= objetivo_kcal * 0.9)
    adherence = int(round((fulfilled_days / 7) * 100))
    trend = _trend(kcal_values)
    fallback = _fallback_analysis(client, adherence)

    prompt = (
        "Eres un entrenador personal y nutricionista experto analizando "
        "el progreso de un cliente. "
        f"Cliente: {client.name}, Objetivo: {client.goal or 'sin objetivo definido'}. "
        f"Objetivo calorico diario: {objetivo_kcal} kcal. "
        f"Nivel de actividad: {client.nivel_actividad or 'no especificado'}. "
        f"Promedio calorico ultimos 7 dias: {average} kcal. "
        f"Dias que cumplio su objetivo esta semana: {fulfilled_days}/7. "
        f"Tendencia: {trend}. "
        "Genera un analisis profesional completo en espanol. "
        "Responde UNICAMENTE con JSON: "
        "{ 'resumen': 'texto de 2-3 oraciones sobre el estado general', "
        "'puntos_positivos': ['punto 1', 'punto 2'], "
        "'areas_mejora': ['area 1', 'area 2'], "
        "'recomendaciones': ['recomendacion concreta 1', 'recomendacion 2', 'recomendacion 3'], "
        "'nivel_adherencia': 75 }"
    )

    try:
        groq = nutrition_service._groq_client()
        if not groq:
            return fallback
        completion = groq.with_options(timeout=20.0).chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = completion.choices[0].message.content or ""
        parsed = nutrition_service._extract_json(raw)
        return {
            "resumen": str(parsed.get("resumen", fallback["resumen"])),
            "puntos_positivos": parsed.get("puntos_positivos") or fallback["puntos_positivos"],
            "areas_mejora": parsed.get("areas_mejora") or fallback["areas_mejora"],
            "recomendaciones": parsed.get("recomendaciones") or fallback["recomendaciones"],
            "nivel_adherencia": int(parsed.get("nivel_adherencia", adherence) or adherence),
        }
    except Exception:
        return fallback

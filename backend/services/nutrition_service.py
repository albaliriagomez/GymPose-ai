import json
import os
import ast
from datetime import date, datetime

from groq import Groq
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.models import User
from models.nutrition import Meal

FALLBACK_TIP = {
    "title": "Hidratacion Inteligente",
    "tip": "Mantente hidratado durante el dia. Beber suficiente agua mejora tu rendimiento y recuperacion muscular.",
}

ACTIVITY_FACTORS = {
    "sedentario": 1.2,
    "ligero": 1.375,
    "moderado": 1.55,
    "activo": 1.725,
    "muy_activo": 1.9,
}


def normalize_goal(goal: str | None) -> str:
    value = (goal or "").strip().lower()
    if "perder" in value or "lose" in value:
        return "lose"
    if "ganar" in value or "muscul" in value or "gain" in value:
        return "gain"
    return "maintain"


def goal_text(goal_key: str) -> str:
    return {"lose": "perder peso", "maintain": "mantener peso", "gain": "ganar musculo"}[goal_key]


def macros_for_goal(goal_key: str) -> dict:
    if goal_key == "lose":
        return {"proteina": 40, "carbos": 30, "grasas": 30}
    if goal_key == "gain":
        return {"proteina": 35, "carbos": 45, "grasas": 20}
    return {"proteina": 30, "carbos": 40, "grasas": 30}


def compute_nutrition_profile(user: User) -> dict:
    if user.weight_kg is None or user.height_cm is None or user.edad is None or user.sexo is None:
        return {
            "incomplete": True,
            "message": "Completa tu perfil para ver tu objetivo calorico",
        }

    if user.sexo == "masculino":
        tmb = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.edad + 5
    else:
        tmb = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.edad - 161

    factor = ACTIVITY_FACTORS.get((user.nivel_actividad or "").strip().lower(), 1.375)
    tdee = tmb * factor
    goal_key = normalize_goal(user.goal)
    adjustment = {"lose": -300, "maintain": 0, "gain": 250}[goal_key]

    return {
        "objetivo_kcal": int(round(tdee + adjustment)),
        "goal": goal_key,
        "macros_pct": macros_for_goal(goal_key),
        "incomplete": False,
    }


def parse_time_12h(hora: str | None):
    if not hora:
        return None
    return datetime.strptime(hora.strip(), "%I:%M %p").time()


def format_time_12h(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return value.strftime("%I:%M %p")


def meal_to_item(meal: Meal) -> dict:
    return {
        "id": meal.id,
        "name": meal.nombre,
        "description": meal.descripcion,
        "time": format_time_12h(meal.hora),
        "status": meal.status,
        "macros": {
            "proteina": float(meal.proteina_g or 0),
            "carbos": float(meal.carbos_g or 0),
            "grasas": float(meal.grasas_g or 0),
        },
        "kcal": float(meal.kcal or 0),
        "aiSuggested": meal.ai_suggested,
    }


def get_meals_today(db: Session, user_id):
    today = date.today()
    return (
        db.query(Meal)
        .filter(Meal.user_id == user_id, Meal.fecha == today)
        .order_by(Meal.created_at.asc())
        .all()
    )


def create_meal(db: Session, user_id, payload):
    kcal_input = payload.get("kcal")
    try:
        kcal_value = float(kcal_input) if kcal_input is not None else 0.0
    except (TypeError, ValueError):
        kcal_value = 0.0
    should_estimate = kcal_input is None or kcal_value == 0

    proteina = payload.get("proteina_g")
    carbos = payload.get("carbos_g")
    grasas = payload.get("grasas_g")
    kcal = payload.get("kcal")

    if should_estimate:
        estimated = estimate_meal_macros(payload.get("description"))
        kcal = estimated["kcal"]
        proteina = estimated["proteina_g"]
        carbos = estimated["carbos_g"]
        grasas = estimated["grasas_g"]

    meal = Meal(
        user_id=user_id,
        fecha=date.today(),
        nombre=payload["name"],
        descripcion=payload.get("description"),
        hora=parse_time_12h(payload.get("hora")) if payload.get("hora") else None,
        status="completed",
        proteina_g=proteina if proteina is not None else 0,
        carbos_g=carbos if carbos is not None else 0,
        grasas_g=grasas if grasas is not None else 0,
        kcal=kcal if kcal is not None else 0,
        ai_suggested=payload.get("ai_suggested", False),
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


def update_meal_status(db: Session, user_id, meal_id, new_status: str):
    meal = (
        db.query(Meal)
        .filter(Meal.id == meal_id, Meal.user_id == user_id)
        .first()
    )
    if not meal:
        return None
    meal.status = new_status
    db.commit()
    db.refresh(meal)
    return meal


def total_kcal_today(db: Session, user_id) -> int:
    value = (
        db.query(func.coalesce(func.sum(Meal.kcal), 0))
        .filter(Meal.user_id == user_id, Meal.fecha == date.today())
        .scalar()
    )
    return int(round(float(value or 0)))


def _extract_json(content: str):
    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("invalid json payload")
    raw_json = content[start : end + 1].strip()
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError:
        return ast.literal_eval(raw_json)


def _groq_client():
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    return Groq(api_key=key)


def estimate_meal_macros(description: str | None) -> dict:
    client = _groq_client()
    if not client:
        return {"kcal": 0, "proteina_g": 0, "carbos_g": 0, "grasas_g": 0}
    text = (description or "").strip()
    if not text:
        return {"kcal": 0, "proteina_g": 0, "carbos_g": 0, "grasas_g": 0}
    prompt = (
        "Eres un nutricionista experto. Estima los macronutrientes y "
        f"calorias de esta comida: '{text}'. "
        "Responde UNICAMENTE con JSON valido: "
        "{ 'kcal': 350, 'proteina_g': 25, 'carbos_g': 40, 'grasas_g': 12 } "
        "Los valores deben ser numeros enteros realistas. Sin texto extra."
    )
    try:
        print(f"[NUTRITION][MEAL_ESTIMATE] texto_enviado={text}")
        completion = client.with_options(timeout=15.0).chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = completion.choices[0].message.content or ""
        print(f"[NUTRITION][MEAL_ESTIMATE] raw_response={raw}")
        data = _extract_json(raw)
        extracted = {
            "kcal": int(data.get("kcal", 0) or 0),
            "proteina_g": int(data.get("proteina_g", 0) or 0),
            "carbos_g": int(data.get("carbos_g", 0) or 0),
            "grasas_g": int(data.get("grasas_g", 0) or 0),
        }
        print(f"[NUTRITION][MEAL_ESTIMATE] extraido={extracted}")
        return extracted
    except Exception:
        print("[NUTRITION][MEAL_ESTIMATE] fallo_estimacion, usando_ceros")
        return {"kcal": 0, "proteina_g": 0, "carbos_g": 0, "grasas_g": 0}


def generate_tip(
    goal_value: str,
    consumed_kcal: int,
    objetivo_kcal: int,
    preferencia_alimentaria: str | None = None,
    alergias: str | None = None,
) -> dict:
    client = _groq_client()
    if not client:
        return FALLBACK_TIP

    preferencia = (preferencia_alimentaria or "").strip() or "sin restricciones"
    alergias_text = (alergias or "").strip() or "ninguna"
    prompt = (
        "Eres un nutricionista deportivo experto. El usuario tiene como "
        f"objetivo {goal_value}. Hoy ha consumido {consumed_kcal} kcal de su objetivo de "
        f"{objetivo_kcal} kcal. Preferencia alimentaria: {preferencia}. "
        f"Alergias o intolerancias: {alergias_text}. "
        "Responde UNICAMENTE con un objeto JSON valido con esta "
        "estructura: { 'title': 'titulo corto de 2-4 palabras', 'tip': 'tip de 2-3 oraciones' } "
        "El tip debe ser personalizado, practico y motivador en espanol. "
        "Sin texto adicional fuera del JSON."
    )
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = completion.choices[0].message.content or ""
        data = _extract_json(raw)
        if not data.get("title") or not data.get("tip"):
            return FALLBACK_TIP
        return {"title": str(data["title"]), "tip": str(data["tip"])}
    except Exception:
        return FALLBACK_TIP


def generate_meal_plan(
    goal_value: str,
    objetivo_kcal: int,
    macros_pct: dict,
    preferencia_alimentaria: str | None = None,
    alergias: str | None = None,
) -> list[dict]:
    fallback_meals = [
        {
            "name": "Desayuno",
            "description": "Avena con frutas y proteína en polvo",
            "kcal": 450,
            "proteina_g": 35,
            "carbos_g": 55,
            "grasas_g": 10,
            "hora": "08:00 AM",
        },
        {
            "name": "Almuerzo",
            "description": "Pechuga de pollo con arroz integral y verduras",
            "kcal": 600,
            "proteina_g": 45,
            "carbos_g": 65,
            "grasas_g": 15,
            "hora": "01:00 PM",
        },
        {
            "name": "Cena",
            "description": "Salmón al horno con ensalada y papa dulce",
            "kcal": 500,
            "proteina_g": 40,
            "carbos_g": 40,
            "grasas_g": 20,
            "hora": "07:00 PM",
        },
    ]

    try:
        client = _groq_client()
        if not client:
            return fallback_meals

        preferencia = (preferencia_alimentaria or "").strip() or "sin restricciones"
        alergias_text = (alergias or "").strip() or "ninguna"
        prompt = (
            "Eres un nutricionista deportivo personalizado. "
            f"Objetivo del usuario: {goal_value}. "
            f"Calorias diarias objetivo: {objetivo_kcal} kcal. "
            f"Distribucion de macros: {macros_pct['proteina']}% proteina, {macros_pct['carbos']}% carbohidratos, {macros_pct['grasas']}% grasas. "
            f"Preferencia alimentaria: {preferencia}. "
            f"Alergias o intolerancias: {alergias_text}. "
            "Crea un plan de 3 comidas VARIADAS y ESPECIFICAS para hoy (desayuno, almuerzo, cena) "
            "respetando estrictamente las preferencias y alergias del usuario. Incluye cantidades "
            "concretas (ej: '150g de pechuga de pollo', '1 taza de avena'). "
            "Responde UNICAMENTE con este JSON exacto: "
            "{ 'meals': [ { 'name': 'Desayuno', 'description': '...', 'kcal': 600, 'proteina_g': 40, "
            "'carbos_g': 60, 'grasas_g': 20, 'hora': '08:00 AM' } ] } "
            f"Las 3 comidas deben sumar aproximadamente {objetivo_kcal} kcal."
        )
        completion = client.with_options(timeout=15.0).chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = completion.choices[0].message.content or ""
        parsed = _extract_json(raw)
        meals = parsed.get("meals", [])
        if not isinstance(meals, list) or len(meals) != 3:
            return fallback_meals
        return meals
    except Exception:
        return fallback_meals

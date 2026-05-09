import hashlib
import json
import os
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from models import Repetition, Session as GymSession, User
from models.progress import ProgressLog, ProgressPlan
from schemas.progress import (
    GeneratedPlanAIResponse,
    MealDay,
    MealItem,
    ProgressGenerateRequest,
    RoutineDay,
    ExerciseItem,
)

from services.nutrition_service import calculate_tdee, create_or_update_profile, get_nutrition_profile


GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

DAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]

SPANISH_FOCUS_MAP = {
    "upper push": "Torso superior",
    "upper body": "Torso superior",
    "lower body": "Pierna y glúteo",
    "lower strength": "Pierna y glúteo",
    "lower volume": "Pierna y glúteo",
    "full body": "Cuerpo completo",
    "mobility": "Movilidad",
    "core": "Trabajo de core",
    "core + mobility": "Trabajo de core",
    "cardio": "Cardio",
    "hiit": "Cardio intenso",
    "rest": "Descanso activo",
    "technique": "Técnica",
    "upper pull": "Espalda y brazos",
    "cardio + core": "Cardio y core",
    "cardio largo": "Cardio",
}

SPANISH_EXERCISE_MAP = {
    "press banca": "Press de banca",
    "press hombro": "Press de hombros",
    "fondos": "Fondos",
    "sentadilla": "Sentadilla",
    "prensa": "Prensa de piernas",
    "peso muerto rumano": "Peso muerto rumano",
    "plancha": "Plancha",
    "dead bug": "Dead bug",
    "movilidad cadera": "Movilidad de cadera",
    "remo": "Remo",
    "jalón al pecho": "Jalón al pecho",
    "curl bíceps": "Curl de bíceps",
    "zancadas": "Zancadas",
    "sentadilla goblet": "Sentadilla goblet",
    "dominadas asistidas": "Dominadas asistidas",
    "press inclinado": "Press inclinado",
    "sentadilla ligera": "Sentadilla ligera",
    "caminata suave": "Caminata suave",
    "caminata inclinada": "Caminata inclinada",
    "crunch": "Crunch abdominal",
    "hip thrust": "Elevación de cadera",
    "face pull": "Face pull",
    "burpees": "Burpees",
    "jumping jacks": "Saltos de tijera",
    "mountain climbers": "Escaladores",
    "bicicleta": "Bicicleta",
    "elíptica": "Elíptica",
    "movilidad": "Movilidad",
    "estiramientos": "Estiramientos",
    "movilidad hombro": "Movilidad de hombros",
    "press militar": "Press militar",
    "jalón": "Jalón al pecho",
    "curl": "Curl de bíceps",
    "caminata rápida": "Caminata rápida",
    "escaleras": "Subir escaleras",
    "técnica de sentadilla": "Técnica de sentadilla",
    "estabilidad": "Ejercicios de estabilidad",
    "recuperación": "Recuperación",
}

SPANISH_MEAL_MAP = {
    "desayuno alto en proteína": "Desayuno alto en proteína",
    "media mañana": "Media mañana",
    "almuerzo fuerte": "Almuerzo fuerte",
    "merienda": "Merienda",
    "cena": "Cena",
    "desayuno ligero": "Desayuno ligero",
    "almuerzo balanceado": "Almuerzo balanceado",
    "cena ligera": "Cena ligera",
    "desayuno": "Desayuno",
}

GOAL_ALIASES = {
    "gain": "gain",
    "build": "gain",
    "bulk": "gain",
    "musculo": "gain",
    "masa": "gain",
    "volumen": "gain",
    "lose": "lose",
    "cut": "lose",
    "definir": "lose",
    "bajar": "lose",
    "perder": "lose",
    "reduce": "lose",
    "maintain": "maintain",
    "mantener": "maintain",
    "salud": "maintain",
    "equilibrio": "maintain",
}


def normalize_goal(goal: Optional[str]) -> str:
    text = (goal or "").strip().lower()
    if not text:
        return "maintain"
    for key, normalized in GOAL_ALIASES.items():
        if key in text:
            return normalized
    return "maintain"


def _normalize_text(text: str) -> str:
    return text.strip().lower().replace("  ", " ")


def _translate_focus(focus: str) -> str:
    normalized = _normalize_text(focus)
    for key, value in SPANISH_FOCUS_MAP.items():
        if key in normalized:
            return value
    if any(word in normalized for word in ["upper", "pull", "push"]):
        return "Torso superior"
    if any(word in normalized for word in ["lower", "leg", "glute", "hip"]):
        return "Pierna y glúteo"
    if any(word in normalized for word in ["mobility", "movilidad"]):
        return "Movilidad"
    if any(word in normalized for word in ["core", "abd", "abdominal"]):
        return "Trabajo de core"
    if any(word in normalized for word in ["cardio", "hiit", "run", "bike"]):
        return "Cardio"
    if any(word in normalized for word in ["rest", "descanso"]):
        return "Descanso activo"
    return "Cuerpo completo"


def _translate_exercise_name(name: str) -> str:
    normalized = _normalize_text(name)
    for key, value in SPANISH_EXERCISE_MAP.items():
        if key in normalized:
            return value
    if normalized.startswith("press "):
        return "Press " + normalized.replace("press ", "").title()
    return name[:1].upper() + name[1:] if name else name


def _translate_meal_name(name: str) -> str:
    normalized = _normalize_text(name)
    for key, value in SPANISH_MEAL_MAP.items():
        if key in normalized:
            return value
    return name[:1].upper() + name[1:] if name else name


def _default_context() -> Dict[str, object]:
    return {
        "goal": "maintain",
        "goal_normalized": "maintain",
        "body_reference_id": None,
        "body_style": None,
        "weight_kg": 70.0,
        "height_cm": 170.0,
        "age": 30,
        "sex": "male",
        "activity_level": "moderate",
        "meals_per_day": 4,
        "days_per_week": 5,
        "equipment_available": [],
    }


def _merge_context_with_db(db: Session, user: User, request: Optional[ProgressGenerateRequest]) -> Dict[str, object]:
    context = _default_context()
    profile = get_nutrition_profile(db, user.id)

    context.update(
        {
            "goal": user.goal or context["goal"],
            "goal_normalized": normalize_goal(user.goal),
            "body_reference_id": None,
            "body_style": None,
            "weight_kg": float(user.weight_kg or context["weight_kg"]),
            "height_cm": float(user.height_cm or context["height_cm"]),
            "age": profile.age if profile else context["age"],
            "sex": profile.sex if profile else context["sex"],
            "activity_level": profile.activity_level if profile else context["activity_level"],
            "meals_per_day": 4,
            "days_per_week": 5,
            "equipment_available": [],
        }
    )

    if request:
        if request.goal is not None:
            context["goal"] = request.goal
            context["goal_normalized"] = normalize_goal(request.goal)
        if request.body_reference_id is not None:
            context["body_reference_id"] = request.body_reference_id
        if request.body_style is not None:
            context["body_style"] = request.body_style
        if request.weight_kg is not None:
            context["weight_kg"] = request.weight_kg
        if request.height_cm is not None:
            context["height_cm"] = request.height_cm
        if request.age is not None:
            context["age"] = request.age
        if request.sex is not None:
            context["sex"] = request.sex
        if request.activity_level is not None:
            context["activity_level"] = request.activity_level
        if request.meals_per_day is not None:
            context["meals_per_day"] = request.meals_per_day
        if request.days_per_week is not None:
            context["days_per_week"] = request.days_per_week
        if request.equipment_available is not None:
            context["equipment_available"] = request.equipment_available

    return context


def _build_signature(context: Dict[str, object]) -> str:
    payload = {
        "goal": context["goal"],
        "goal_normalized": context["goal_normalized"],
        "weight_kg": context["weight_kg"],
        "height_cm": context["height_cm"],
        "age": context["age"],
        "sex": context["sex"],
        "activity_level": context["activity_level"],
        "meals_per_day": context["meals_per_day"],
        "days_per_week": context["days_per_week"],
        "body_reference_id": context["body_reference_id"],
        "body_style": context["body_style"],
        "equipment_available": context["equipment_available"],
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _calculate_target_weight(current_weight: float, normalized_goal: str) -> Optional[float]:
    if current_weight <= 0:
        return None
    if normalized_goal == "gain":
        return round(current_weight * 1.05, 1)
    if normalized_goal == "lose":
        return round(current_weight * 0.93, 1)
    return round(current_weight, 1)


def _default_calories_goal(context: Dict[str, object]) -> int:
    normalized_goal = str(context["goal_normalized"])
    weight = float(context["weight_kg"])
    height = float(context["height_cm"])
    age = int(context["age"])
    sex = str(context["sex"])
    activity_level = str(context["activity_level"])
    return calculate_tdee(weight, height, age, sex, activity_level, normalized_goal)


def _build_ai_schema() -> dict:
    return GeneratedPlanAIResponse.model_json_schema()


def _call_groq(context: Dict[str, object], calories_goal: int) -> GeneratedPlanAIResponse:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY no configurada")

    schema = _build_ai_schema()
    system_prompt = (
        "Eres un entrenador y nutricionista virtual. Devuelve solo JSON válido en español claro. "
        "No uses texto adicional. Usa etiquetas simples y naturales en español. "
        "Genera una rutina semanal realista y un plan de comidas para el objetivo del usuario. "
        "La foto de referencia solo sirve como guía estética, no como fuente principal de cálculo. "
        "Si faltan datos, infiere de forma conservadora. La rutina debe tener 7 días (0 a 6) "
        "y el plan de comidas también debe tener 7 días. Cada ejercicio debe incluir nombre, "
        "series, repeticiones y descanso en segundos. Cada comida debe incluir nombre, "
        "descripción corta y kcal aproximadas. Usa nombres como Cuerpo completo, Torso superior, "
        "Pierna y glúteo, Movilidad y Trabajo de core. Mantén el contenido práctico, breve y consistente."
    )

    user_prompt = json.dumps(
        {
            "goal": context["goal"],
            "goal_normalized": context["goal_normalized"],
            "body_reference_id": context["body_reference_id"],
            "body_style": context["body_style"],
            "weight_kg": context["weight_kg"],
            "height_cm": context["height_cm"],
            "age": context["age"],
            "sex": context["sex"],
            "activity_level": context["activity_level"],
            "meals_per_day": context["meals_per_day"],
            "days_per_week": context["days_per_week"],
            "equipment_available": context["equipment_available"],
            "calories_goal": calories_goal,
        },
        ensure_ascii=False,
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_completion_tokens": 1800,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "progress_plan_generation",
                "strict": True,
                "schema": schema,
            },
        },
    }

    request = Request(
        GROQ_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urlopen(request, timeout=60) as response:
        raw = response.read().decode("utf-8")

    data = json.loads(raw)
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return _sanitize_generated_plan(GeneratedPlanAIResponse.model_validate(parsed))


def _build_fallback_plan(context: Dict[str, object], calories_goal: int) -> GeneratedPlanAIResponse:
    today = date.today().weekday()
    normalized_goal = str(context["goal_normalized"])
    meals_per_day = int(context["meals_per_day"])
    days_per_week = int(context["days_per_week"])

    training_focus = {
        "gain": [
            ("Upper Push", ["Press banca", "Press hombro", "Fondos"]),
            ("Lower Strength", ["Sentadilla", "Prensa", "Peso muerto rumano"]),
            ("Core + Mobility", ["Plancha", "Dead bug", "Movilidad cadera"]),
            ("Upper Pull", ["Remo", "Jalón al pecho", "Curl bíceps"]),
            ("Lower Volume", ["Zancadas", "Sentadilla goblet", "Gemelos"]),
            ("Full Body", ["Dominadas asistidas", "Press inclinado", "Sentadilla ligera"]),
            ("Rest", ["Descanso activo", "Caminata suave"]),
        ],
        "lose": [
            ("Full Body", ["Sentadilla", "Press banca", "Remo"]),
            ("Cardio + Core", ["Caminata inclinada", "Plancha", "Crunch"]),
            ("Lower Body", ["Sentadilla", "Hip thrust", "Peso muerto rumano"]),
            ("Upper Body", ["Press inclinado", "Remo", "Face pull"]),
            ("HIIT", ["Burpees", "Jumping jacks", "Mountain climbers"]),
            ("Cardio Largo", ["Bicicleta", "Caminata", "Elíptica"]),
            ("Rest", ["Movilidad", "Estiramientos"]),
        ],
        "maintain": [
            ("Full Body", ["Sentadilla", "Press banca", "Remo"]),
            ("Mobility", ["Movilidad hombro", "Movilidad cadera", "Core suave"]),
            ("Upper Body", ["Press militar", "Jalón", "Curl"]),
            ("Cardio", ["Caminata rápida", "Bicicleta", "Escaleras"]),
            ("Lower Body", ["Prensa", "Zancadas", "Gemelos"]),
            ("Technique", ["Técnica de sentadilla", "Core", "Estabilidad"]),
            ("Rest", ["Descanso activo", "Recuperación"]),
        ],
    }

    meal_templates = {
        "gain": ["Desayuno alto en proteína", "Media mañana", "Almuerzo fuerte", "Merienda", "Cena"],
        "lose": ["Desayuno ligero", "Media mañana", "Almuerzo balanceado", "Merienda", "Cena ligera"],
        "maintain": ["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena"],
    }

    weekly_plan: List[RoutineDay] = []
    for idx in range(7):
        if idx < days_per_week:
            focus, exercises = training_focus[normalized_goal][idx]
        else:
            focus, exercises = ("Rest", ["Descanso", "Movilidad suave"])
        weekly_plan.append(
            RoutineDay(
                day_index=idx,
                day_label=DAY_LABELS[idx],
                focus=focus,
                duration_min=60 if idx < days_per_week else 20,
                exercises=[
                    ExerciseItem(name=name, sets=4 if idx < days_per_week else 1, reps="8-12", rest_sec=90)
                    for name in exercises
                ],
            )
        )

    meal_plan: List[MealDay] = []
    for idx in range(7):
        meals = []
        for meal_name in meal_templates[normalized_goal][:meals_per_day]:
            meals.append(
                MealItem(
                    name=meal_name,
                    description=f"Opción simple para {meal_name.lower()} según objetivo {normalized_goal}",
                    kcal=max(200, calories_goal // max(1, meals_per_day)),
                )
            )
        meal_plan.append(MealDay(day_index=idx, day_label=DAY_LABELS[idx], meals=meals))

    return GeneratedPlanAIResponse(
        goal_normalized=normalized_goal,
        rutina_semanal=weekly_plan,
        rutina_diaria_actual=weekly_plan[today],
        plan_comidas=meal_plan,
        meals_per_day=meals_per_day,
        calories_goal=calories_goal,
        updated_at=datetime.utcnow(),
    )


def _sanitize_generated_plan(plan: GeneratedPlanAIResponse) -> GeneratedPlanAIResponse:
    weekly_plan: List[RoutineDay] = []
    for day in plan.rutina_semanal:
        day_index = day.day_index if 0 <= day.day_index < len(DAY_LABELS) else 0
        weekly_plan.append(
            RoutineDay(
                day_index=day_index,
                day_label=DAY_LABELS[day_index],
                focus=_translate_focus(day.focus),
                duration_min=day.duration_min,
                exercises=[
                    ExerciseItem(
                        name=_translate_exercise_name(exercise.name),
                        sets=exercise.sets,
                        reps=exercise.reps,
                        rest_sec=exercise.rest_sec,
                    )
                    for exercise in day.exercises
                ],
            )
        )

    meal_plan: List[MealDay] = []
    for day in plan.plan_comidas:
        day_index = day.day_index if 0 <= day.day_index < len(DAY_LABELS) else 0
        meal_plan.append(
            MealDay(
                day_index=day_index,
                day_label=DAY_LABELS[day_index],
                meals=[
                    MealItem(
                        name=_translate_meal_name(meal.name),
                        description=meal.description.strip(),
                        kcal=meal.kcal,
                    )
                    for meal in day.meals
                ],
            )
        )

    return GeneratedPlanAIResponse(
        goal_normalized=plan.goal_normalized,
        rutina_semanal=weekly_plan,
        rutina_diaria_actual=weekly_plan[
            plan.rutina_diaria_actual.day_index
            if 0 <= plan.rutina_diaria_actual.day_index < len(weekly_plan)
            else 0
        ],
        plan_comidas=meal_plan,
        meals_per_day=plan.meals_per_day,
        calories_goal=plan.calories_goal,
        updated_at=plan.updated_at,
    )


def _build_summary_text(context: Dict[str, object], plan: GeneratedPlanAIResponse) -> str:
    routine_days = []
    for day in plan.rutina_semanal[:5]:
        routine_days.append(f"{day.day_label}: {day.focus}")
    routine_text = " | ".join(routine_days)
    goal_text = str(context["goal"]).strip() or "objetivo de salud"
    weight = round(float(context["weight_kg"]), 1)
    target_weight = _calculate_target_weight(weight, str(context["goal_normalized"]))
    target_text = f"{target_weight} kg" if target_weight is not None else "sin peso objetivo definido"
    return (
        f"Objetivo detectado: {goal_text}. "
        f"Peso actual: {weight} kg. "
        f"Peso ideal sugerido: {target_text}. "
        f"Calorías recomendadas: {plan.calories_goal} kcal. "
        f"Comidas por día: {plan.meals_per_day}. "
        f"Rutina de lunes a viernes: {routine_text}."
    )


def _persist_plan(db: Session, user: User, context: Dict[str, object], ai_plan: GeneratedPlanAIResponse, signature: str, source: str) -> ProgressPlan:
    current_weight = float(context["weight_kg"])
    target_weight = _calculate_target_weight(current_weight, str(context["goal_normalized"]))

    plan = db.query(ProgressPlan).filter(ProgressPlan.user_id == user.id).first()
    if plan is None:
        plan = ProgressPlan(user_id=user.id, goal=str(context["goal"]), current_weight=current_weight, weekly_plan=[], daily_routine=[], meal_plan=[])
        db.add(plan)

    plan.goal = str(context["goal"])
    plan.goal_normalized = str(context["goal_normalized"])
    plan.current_weight = current_weight
    plan.target_weight = target_weight
    plan.height_cm = float(context["height_cm"]) if context["height_cm"] is not None else None
    plan.age = int(context["age"]) if context["age"] is not None else None
    plan.sex = str(context["sex"]) if context["sex"] is not None else None
    plan.activity_level = str(context["activity_level"]) if context["activity_level"] is not None else None
    plan.meals_per_day = int(ai_plan.meals_per_day)
    plan.days_per_week = int(context["days_per_week"])
    plan.body_style = context["body_style"]
    plan.body_reference_id = context["body_reference_id"]
    plan.equipment_available = context["equipment_available"]
    plan.weekly_plan = [item.model_dump(mode="json") for item in ai_plan.rutina_semanal]
    plan.daily_routine = ai_plan.rutina_diaria_actual.model_dump(mode="json")
    plan.meal_plan = [item.model_dump(mode="json") for item in ai_plan.plan_comidas]
    plan.calories_goal = int(ai_plan.calories_goal)
    plan.status = "active"
    plan.generated_source = source
    plan.input_signature = signature
    plan.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(plan)
    return plan


def _summary_text_from_plan(plan: ProgressPlan) -> str:
    weekly = plan.weekly_plan or []
    routine_days = []
    for day in weekly[:5]:
        if isinstance(day, dict):
            routine_days.append(f"{day.get('day_label', '')}: {day.get('focus', '')}")
    routine_text = " | ".join(routine_days) if routine_days else "Sin rutina disponible"
    goal_text = plan.goal or "objetivo de salud"
    target_text = f"{plan.target_weight} kg" if plan.target_weight is not None else "sin peso objetivo definido"
    return (
        f"Objetivo detectado: {goal_text}. "
        f"Peso actual: {round(plan.current_weight, 1)} kg. "
        f"Peso ideal sugerido: {target_text}. "
        f"Calorías recomendadas: {plan.calories_goal} kcal. "
        f"Comidas por día: {plan.meals_per_day}. "
        f"Rutina de lunes a viernes: {routine_text}."
    )


def _routine_day_from_payload(payload: dict) -> RoutineDay:
    day_index = int(payload.get("day_index", 0) or 0)
    day_index = day_index if 0 <= day_index < len(DAY_LABELS) else 0
    exercises_payload = payload.get("exercises", []) or []
    exercises: List[ExerciseItem] = []
    for exercise in exercises_payload:
        exercises.append(
            ExerciseItem(
                name=_translate_exercise_name(str(exercise.get("name", ""))),
                sets=int(exercise.get("sets", 1) or 1),
                reps=str(exercise.get("reps", "")),
                rest_sec=int(exercise.get("rest_sec", 0) or 0),
            )
        )
    return RoutineDay(
        day_index=day_index,
        day_label=DAY_LABELS[day_index],
        focus=_translate_focus(str(payload.get("focus", ""))),
        duration_min=int(payload.get("duration_min", 0) or 0),
        exercises=exercises,
    )


def _meal_day_from_payload(payload: dict) -> MealDay:
    day_index = int(payload.get("day_index", 0) or 0)
    day_index = day_index if 0 <= day_index < len(DAY_LABELS) else 0
    meals_payload = payload.get("meals", []) or []
    meals: List[MealItem] = []
    for meal in meals_payload:
        meals.append(
            MealItem(
                name=_translate_meal_name(str(meal.get("name", ""))),
                description=str(meal.get("description", "")).strip(),
                kcal=int(meal.get("kcal", 0) or 0),
            )
        )
    return MealDay(
        day_index=day_index,
        day_label=DAY_LABELS[day_index],
        meals=meals,
    )


def plan_to_response(plan: ProgressPlan) -> dict:
    weekly_plan = [_routine_day_from_payload(day) for day in (plan.weekly_plan or [])]
    daily_routine = _routine_day_from_payload(plan.daily_routine or {}) if plan.daily_routine else (weekly_plan[0] if weekly_plan else None)
    meal_plan = [_meal_day_from_payload(day) for day in (plan.meal_plan or [])]
    return {
        "goal": plan.goal,
        "goal_normalized": plan.goal_normalized,
        "body_reference_id": plan.body_reference_id,
        "body_style": plan.body_style,
        "current_weight": plan.current_weight,
        "target_weight": plan.target_weight,
        "height_cm": plan.height_cm,
        "age": plan.age,
        "sex": plan.sex,
        "activity_level": plan.activity_level,
        "meals_per_day": plan.meals_per_day,
        "days_per_week": plan.days_per_week,
        "equipment_available": plan.equipment_available,
        "rutina_semanal": [day.model_dump(mode="json") for day in weekly_plan],
        "rutina_diaria_actual": daily_routine.model_dump(mode="json") if daily_routine else {},
        "plan_comidas": [day.model_dump(mode="json") for day in meal_plan],
        "calories_goal": plan.calories_goal,
        "summary_text": _summary_text_from_plan(plan),
        "source": plan.generated_source,
        "status": plan.status,
        "updated_at": plan.updated_at,
    }


def _maybe_update_profile(db: Session, user: User, context: Dict[str, object]) -> None:
    if context["weight_kg"] is not None:
        user.weight_kg = float(context["weight_kg"])
    if context["height_cm"] is not None:
        user.height_cm = float(context["height_cm"])
    if context["goal"] is not None:
        user.goal = str(context["goal"])

    if context["age"] is not None and context["sex"] is not None and context["activity_level"] is not None:
        create_or_update_profile(
            db,
            user_id=user.id,
            age=int(context["age"]),
            sex=str(context["sex"]),
            activity_level=str(context["activity_level"]),
        )
    else:
        db.commit()


def generate_progress_plan(
    db: Session,
    user: User,
    request: Optional[ProgressGenerateRequest] = None,
    force_refresh: bool = False,
) -> ProgressPlan:
    context = _merge_context_with_db(db, user, request)
    signature = _build_signature(context)
    existing = db.query(ProgressPlan).filter(ProgressPlan.user_id == user.id).first()

    if existing and not force_refresh and existing.input_signature == signature:
        return existing

    _maybe_update_profile(db, user, context)

    profile = get_nutrition_profile(db, user.id)
    calories_goal = profile.objetivo_kcal if profile else _default_calories_goal(context)

    try:
        ai_plan = _call_groq(context, calories_goal)
        source = "groq"
    except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError, KeyError, json.JSONDecodeError):
        ai_plan = _sanitize_generated_plan(_build_fallback_plan(context, calories_goal))
        source = "fallback"

    return _persist_plan(db, user, context, ai_plan, signature, source)


def get_plan(db: Session, user: User) -> ProgressPlan:
    return generate_progress_plan(db, user, request=None, force_refresh=False)


def _date_window(period: str) -> Tuple[date, date]:
    today = datetime.utcnow().date()
    if period == "monthly":
        return today - timedelta(days=29), today
    return today - timedelta(days=6), today


def build_summary(db: Session, user: User, period: str = "weekly") -> Dict[str, object]:
    start_date, end_date = _date_window(period)

    logs = (
        db.query(ProgressLog)
        .filter(
            ProgressLog.user_id == user.id,
            ProgressLog.date >= start_date,
            ProgressLog.date <= end_date,
        )
        .order_by(ProgressLog.date.asc(), ProgressLog.created_at.asc())
        .all()
    )

    if logs:
        sessions_completed = sum(log.sessions or 1 for log in logs)
        repetitions_total = sum(log.reps or 0 for log in logs)
        total_duration_min = sum(log.duration or 0 for log in logs)
        active_days = len({log.date for log in logs})
        weights = [log.weight_kg for log in logs if log.weight_kg is not None]
    else:
        sessions_completed = db.query(GymSession).filter(
            GymSession.user_id == user.id,
            cast(GymSession.date, Date) >= start_date,
            cast(GymSession.date, Date) <= end_date,
        ).count()

        repetitions_total = (
            db.query(Repetition)
            .join(GymSession, Repetition.session_id == GymSession.id)
            .filter(
                GymSession.user_id == user.id,
                cast(GymSession.date, Date) >= start_date,
                cast(GymSession.date, Date) <= end_date,
            )
            .count()
        )

        total_duration_min = (
            db.query(func.coalesce(func.sum(GymSession.duration_seconds), 0))
            .filter(
                GymSession.user_id == user.id,
                cast(GymSession.date, Date) >= start_date,
                cast(GymSession.date, Date) <= end_date,
            )
            .scalar()
            or 0
        ) // 60

        active_days = (
            db.query(cast(GymSession.date, Date))
            .filter(
                GymSession.user_id == user.id,
                cast(GymSession.date, Date) >= start_date,
                cast(GymSession.date, Date) <= end_date,
            )
            .distinct()
            .count()
        )
        weights = []

    weight_change_kg = None
    if len(weights) >= 2:
        weight_change_kg = round(weights[-1] - weights[0], 1)

    progress_pct = min(
        100.0,
        round((sessions_completed / max(1, 7 if period == "weekly" else 30)) * 100, 1),
    )

    return {
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "sessions_completed": sessions_completed,
        "repetitions_total": repetitions_total,
        "active_days": active_days,
        "total_duration_min": total_duration_min,
        "progress_pct": progress_pct,
        "weight_change_kg": weight_change_kg,
        "logs_count": len(logs),
    }


def create_progress_log(db: Session, user: User, data) -> ProgressLog:
    log = ProgressLog(
        user_id=user.id,
        date=data.date,
        exercise_type=data.exercise_type,
        sessions=data.sessions,
        reps=data.reps,
        duration=data.duration,
        weight_kg=data.weight_kg,
        notes=data.notes,
    )
    db.add(log)

    if data.weight_kg is not None:
        user.weight_kg = data.weight_kg

    db.commit()
    db.refresh(log)

    if data.weight_kg is not None:
        generate_progress_plan(db, user, request=None, force_refresh=True)

    return log

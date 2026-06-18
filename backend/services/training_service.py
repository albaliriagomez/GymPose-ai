"""
training_service.py â€” GymPose
Genera 3 variantes de plan (A / B / C) por meta y frecuencia.
Integra Groq para recomendar la variante mÃ¡s adecuada al perfil del usuario.

Reps de referencia (estÃ¡ndar deportivo):
  Fuerza          â†’ 1-5 reps
  Hipertrofia     â†’ 6-12 reps  (nunca 15+ en ejercicios principales)
  Resistencia     â†’ 15-20 reps
  Circuito metab. â†’ 12-15 reps o tiempo (20-40 seg)

Ejercicios detectables por MediaPipe en Training.jsx:
  âœ“ Sentadilla con Barra / Sentadilla al CajÃ³n / Sentadilla con Salto
  âœ“ Flexiones de Pecho / Flexiones en Pared o Rodillas
  âœ“ Curl de BÃ­ceps con Barra / Curl Martillo
"""

import os, json, re
from datetime import datetime
from typing import Optional
from uuid import UUID
from groq import Groq
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from schemas.training import TrainingPlan, WorkoutDay, Exercise
from models import User, TrainingPlanSelection, TrainingRoutineProgress, TrainingExerciseProgress, TrainingExerciseEvent

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  CONSTANTE: quÃ© ejercicios detecta MediaPipe hoy
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DETECTABLE_EXERCISES = {
    "Sentadilla al CajÃ³n",
    "Sentadilla con Salto",
    "Flexiones de Pecho",
    "Flexiones Diamante",
    "Flexiones Cerradas",
    "Flexiones en Pared o Rodillas",
    "Curl Martillo",
    "Curl de BÃ­ceps con Mancuernas",
    "Mountain Climbers",
    "Marcha en Sitio Rodillas Altas",
    "Polichinelas",
    "Burpees",
    "Flexiones Rusas de Antebrazos",
    "Saltos con Zancada Alterna",
    "Estocadas EstÃ¡ticas",
}

APPROVED_TRAINING_EXERCISES = {
    "Sentadilla al CajÃ³n",
    "Zancadas Alternas por Tiempo",
    "Estocadas EstÃ¡ticas",
    "Flexiones en Pared o Rodillas",
    "Flexiones de Pecho",
    "Flexiones Diamante",
    "Remo Sentado con Banda",
    "Remo con Mancuerna Apoyado en Banco",
    "Remo con Banda o Mancuerna",
    "Flexiones Rusas de Antebrazos",
    "Curl de BÃ­ceps con Barra",
    "Curl de BÃ­ceps con Mancuernas",
    "Curl de BÃ­ceps en Polea",
    "Curl de BÃ­ceps Predicador",
    "Curl Martillo",
    "Curl Martillo con Cable",
    "Polichinelas",
    "Burpees",
    "Marcha en Sitio Rodillas Altas",
    "Mountain Climbers",
    "Saltos con Zancada Alterna",
    "Hip Thrust con Barra",
    "Hip Thrust con Mancuerna",
    "Hip Thrust con Peso Corporal",
    "Hip Thrust en Suelo",
    "Elevaciones de Talones Sentado",
    "Plank",
    "Plancha Lateral",
    "Plank con RotaciÃ³n",
    "Plank en Rodillas",
}

def _mark_detectable(ex: Exercise) -> Exercise:
    """AÃ±ade nota si el ejercicio es detectable en vivo por MediaPipe."""
    if ex.name in DETECTABLE_EXERCISES:
        tag = "âš¡ Detectable en tiempo real con tu cÃ¡mara"
        notes = f"{ex.notes} Â· {tag}" if ex.notes else tag
        return Exercise(
            name=ex.name, sets=ex.sets, reps=ex.reps,
            rest_seconds=ex.rest_seconds, muscle_group=ex.muscle_group,
            mode=_infer_exercise_mode(ex),
            notes=notes,
        )
    return Exercise(
        name=ex.name,
        sets=ex.sets,
        reps=ex.reps,
        rest_seconds=ex.rest_seconds,
        muscle_group=ex.muscle_group,
        mode=_infer_exercise_mode(ex),
        notes=ex.notes,
    )

def _mark_list(exercises: list[Exercise]) -> list[Exercise]:
    return [_mark_detectable(e) for e in exercises]


def _infer_exercise_mode(ex: Exercise) -> str:
    explicit_mode = getattr(ex, "mode", None)
    if explicit_mode in {"reps", "timer", "hold"}:
        return explicit_mode

    text = " ".join(
        part for part in [ex.name, ex.muscle_group, ex.reps, ex.notes or ""] if part
    ).lower()
    if any(token in text for token in ("seg", "min", "plank", "plancha", "sprint", "cardio", "marcha", "caminata", "bici", "movilidad", "hiit")):
        return "timer"
    if "hold" in text or "isometric" in text or "isometr" in text:
        return "hold"
    return "reps"


def _prepare_exercise_pool(exercises: list[Exercise], imc_category: Optional[str]) -> list[Exercise]:
    adapted = _adapt_list(exercises, imc_category)
    approved_only = [exercise for exercise in adapted if exercise.name in APPROVED_TRAINING_EXERCISES]
    return _mark_list(approved_only)


def _filter_exercises(exercises: list[Exercise], keywords: list[str]) -> list[Exercise]:
    normalized_keywords = [keyword.lower() for keyword in keywords]
    filtered: list[Exercise] = []
    for exercise in exercises:
        haystack = " ".join(
            part for part in [exercise.name, exercise.muscle_group, exercise.reps, exercise.notes or ""] if part
        ).lower()
        if any(keyword in haystack for keyword in normalized_keywords):
            filtered.append(exercise)
    return filtered


def _unique_exercises(exercises: list[Exercise]) -> list[Exercise]:
    seen: set[str] = set()
    unique: list[Exercise] = []
    for exercise in exercises:
        key = exercise.name.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(exercise)
    return unique


def _build_workout_day(
    day_number: int,
    day_name: str,
    focus: str,
    exercises: list[Exercise],
) -> WorkoutDay:
    return WorkoutDay(
        day_number=day_number,
        day_name=day_name,
        focus=focus,
        exercises=_unique_exercises(exercises),
    )


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  BIBLIOTECA DE EJERCICIOS
#  Reps revisadas: hipertrofia = 6-12, circuito = 12-15 o tiempo
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# â”€â”€ HIPERTROFIA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

HYPERTROPHY_PUSH_A = [
]

HYPERTROPHY_PUSH_B = [
    Exercise(name="Flexiones de Pecho",             sets=5, reps="6-10",  rest_seconds=90,  muscle_group="Pecho/TrÃ­ceps",     notes="Agrega peso en chaleco si es fÃ¡cil. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Flexiones Diamante",             sets=4, reps="8-12",  rest_seconds=75,  muscle_group="Pecho/TrÃ­ceps",     notes="Manos cerradas debajo del pecho, mayor Ã©nfasis en trÃ­ceps. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Flexiones Rusas de Antebrazos",  sets=3, reps="8-10",  rest_seconds=75,  muscle_group="Pecho/TrÃ­ceps/Hombros", notes="Baja controlado apoyando antebrazos y vuelve a extender. Variante avanzada de empuje"),
]

HYPERTROPHY_PUSH_C = [
]

HYPERTROPHY_PULL_A = [
    Exercise(name="Curl de Bíceps con Barra",       sets=4, reps="8-10",  rest_seconds=75,  muscle_group="Bíceps",            notes="Sin balanceo de torso"),
    Exercise(name="Curl Martillo",                  sets=3, reps="10-12", rest_seconds=60,  muscle_group="Braquial",          notes="âš¡ Detectable en tiempo real con tu cÃ¡mara"),
]

HYPERTROPHY_PULL_B = [
    Exercise(name="Curl de Bíceps en Polea",        sets=3, reps="10-12", rest_seconds=60,  muscle_group="Bíceps",            notes="Tensión constante todo el recorrido"),
    Exercise(name="Curl de Bíceps Predicador",      sets=3, reps="10-12", rest_seconds=75,  muscle_group="Bíceps",            notes="Codo apoyado, sin impulso"),
]

HYPERTROPHY_PULL_C = [
    Exercise(name="Curl Martillo con Cable",        sets=3, reps="10-12", rest_seconds=60,  muscle_group="Braquial",          notes="TensiÃ³n constante en toda la trayectoria"),
]

HYPERTROPHY_LEGS_A = [
]

HYPERTROPHY_LEGS_B = [
    Exercise(name="Hip Thrust con Barra",           sets=4, reps="8-10",  rest_seconds=90,  muscle_group="GlÃºteos",           notes="Empuje pÃ©lvico completo, aprieta arriba"),
]

HYPERTROPHY_LEGS_C = [
]

# â”€â”€ PÃ‰RDIDA DE GRASA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

FAT_LOSS_CIRCUIT_A = [
    Exercise(name="Flexiones de Pecho",             sets=4, reps="12",    rest_seconds=30,  muscle_group="Pecho/TrÃ­ceps",     notes="âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Mountain Climbers",              sets=4, reps="30 seg",rest_seconds=20,  muscle_group="Core/Cardio",       notes="MÃ¡xima velocidad manteniendo caderas bajas"),
    Exercise(name="Polichinelas",                   sets=4, reps="40 seg",rest_seconds=20,  muscle_group="Cardio/Full Body",  mode="timer", notes="Salta abriendo piernas y brazos a ritmo constante. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Burpees",                        sets=3, reps="10",    rest_seconds=45,  muscle_group="Full Body",         notes="Pecho toca el suelo en cada rep"),
]

FAT_LOSS_CIRCUIT_B = [
    Exercise(name="Hip Thrust con Peso Corporal",   sets=4, reps="15",    rest_seconds=30,  muscle_group="GlÃºteos",           notes="Aprieta glÃºteos 1 seg arriba"),
    Exercise(name="Plank con Rotación",             sets=3, reps="30 seg",rest_seconds=20,  muscle_group="Core",              mode="timer", notes="Caderas estables al rotar"),
]

FAT_LOSS_CIRCUIT_C = [
]

# Bajo impacto (Obesidad)
FAT_LOSS_LOW_IMPACT_A = [
    Exercise(name="Sentadilla al Cajón",            sets=3, reps="12",    rest_seconds=60,  muscle_group="Piernas/Glúteos",   notes="Usa silla como referencia de profundidad"),
    Exercise(name="Flexiones en Pared o Rodillas",  sets=3, reps="12",    rest_seconds=60,  muscle_group="Pecho/TrÃ­ceps",     notes="Progresa a flexiones completas en 4-6 semanas. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Flexiones de Pecho",             sets=3, reps="10-12", rest_seconds=60,  muscle_group="Pecho/TrÃ­ceps",     notes="MantÃ©n el cuerpo en lÃ­nea recta. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Flexiones Diamante",             sets=2, reps="8-10",  rest_seconds=60,  muscle_group="Pecho/TrÃ­ceps",     notes="Ãšsalas cuando ya domines la variante en rodillas. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Flexiones Rusas de Antebrazos",  sets=2, reps="6-8",   rest_seconds=60,  muscle_group="Pecho/TrÃ­ceps/Hombros", notes="VersiÃ³n corta y controlada para trabajar empuje desde antebrazos"),
    Exercise(name="Zancadas Alternas por Tiempo",   sets=3, reps="40 seg",rest_seconds=45,  muscle_group="Piernas/GlÃºteos",   mode="timer", notes="Alterna piernas con control y torso erguido"),
    Exercise(name="Saltos con Zancada Alterna",     sets=3, reps="30 seg",rest_seconds=60,  muscle_group="Piernas/GlÃºteos",   mode="timer", notes="Cambia de pierna en el aire con aterrizaje suave"),
    Exercise(name="Marcha en Sitio Rodillas Altas", sets=3, reps="40 seg",rest_seconds=30,  muscle_group="Core/Cardio",       mode="timer", notes="Rodillas arriba y brazos activos. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Remo con Mancuerna Apoyado en Banco", sets=3, reps="12 c/lado", rest_seconds=60, muscle_group="Espalda",   notes="Apoya una rodilla y una mano en el banco para estabilizar el torso"),
    Exercise(name="Remo con Banda o Mancuerna",     sets=3, reps="12",    rest_seconds=60,  muscle_group="Espalda",           notes="Retrae escÃ¡pulas al final del movimiento"),
    Exercise(name="Curl de Bíceps con Mancuernas",  sets=3, reps="12",    rest_seconds=60,  muscle_group="Bíceps",            notes="Sube controlado y evita balancear el torso"),
    Exercise(name="Curl Martillo",                  sets=3, reps="10-12", rest_seconds=60,  muscle_group="BÃ­ceps/Braquial",   notes="Agarre neutro, codos pegados al cuerpo. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
]

FAT_LOSS_LOW_IMPACT_B = [
    Exercise(name="Estocadas Estáticas",            sets=3, reps="10 c/lado", rest_seconds=60, muscle_group="Piernas/Glúteos", notes="Sin salto, movimiento controlado"),
    Exercise(name="Hip Thrust en Suelo",            sets=3, reps="15",    rest_seconds=60,  muscle_group="GlÃºteos",           notes="Aprieta glÃºteos 2 seg en la cima"),
    Exercise(name="Remo Sentado con Banda",         sets=3, reps="15",    rest_seconds=60,  muscle_group="Espalda",           notes="Jala hacia el abdomen, no la cintura"),
    Exercise(name="Elevaciones de Talones Sentado", sets=3, reps="20",    rest_seconds=30,  muscle_group="Gemelos",           notes="Pausa en punta, baja completo"),
    Exercise(name="Polichinelas",                   sets=3, reps="45 seg",rest_seconds=30,  muscle_group="Cardio",            mode="timer", notes="Abre y cierra piernas y brazos a ritmo constante"),
    Exercise(name="Plank",                          sets=3, reps="40 seg",rest_seconds=30,  muscle_group="Core",              mode="hold",  notes="Abdomen firme y pelvis neutra"),
    Exercise(name="Plancha Lateral",                sets=3, reps="30 seg c/lado", rest_seconds=30, muscle_group="Core/Oblicuos", mode="hold", notes="Cadera arriba y cuello relajado"),
    Exercise(name="Plank en Rodillas",              sets=3, reps="30 seg",rest_seconds=30,  muscle_group="Core",              mode="hold",  notes="Versión regresada para sostén de core"),
]

FAT_LOSS_LOW_IMPACT_C = [
    Exercise(name="Flexiones Diamante",             sets=3, reps="8-10",  rest_seconds=60,  muscle_group="Pecho/TrÃ­ceps",     notes="Variante exigente para trÃ­ceps y control del core. âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Flexiones Rusas de Antebrazos",  sets=2, reps="8",     rest_seconds=60,  muscle_group="Pecho/TrÃ­ceps/Hombros", notes="Controla la bajada a antebrazos y la subida a manos"),
]

# â”€â”€ MANTENIMIENTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

MAINTENANCE_FULL_A = [
]

MAINTENANCE_FULL_B = [
    Exercise(name="Plank",                          sets=3, reps="45 seg",rest_seconds=45,  muscle_group="Core",              notes="Respira normal, no aguantes el aire"),
]

MAINTENANCE_FULL_C = [
    Exercise(name="Flexiones de Pecho",             sets=3, reps="12",    rest_seconds=75,  muscle_group="Pecho/TrÃ­ceps",     notes="âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Flexiones Rusas de Antebrazos",  sets=2, reps="8-10",  rest_seconds=75,  muscle_group="Pecho/TrÃ­ceps/Hombros", notes="Variante avanzada para pecho, trÃ­ceps y estabilidad del core"),
    Exercise(name="Curl Martillo",                  sets=3, reps="12",    rest_seconds=60,  muscle_group="BÃ­ceps/Braquial",   notes="âš¡ Detectable en tiempo real con tu cÃ¡mara"),
    Exercise(name="Hip Thrust con Mancuerna",       sets=3, reps="12",    rest_seconds=75,  muscle_group="GlÃºteos",           notes="ContracciÃ³n glÃºtea 2 seg arriba"),
    Exercise(name="Plancha Lateral",                sets=3, reps="30 seg c/lado", rest_seconds=45, muscle_group="Core/Oblicuos", notes="Cadera arriba, cuerpo en lÃ­nea recta"),
    Exercise(name="Plank",                          sets=3, reps="45 seg",rest_seconds=30,  muscle_group="Core",              mode="hold",  notes="MantÃ©n el abdomen activo y la espalda neutra"),
]

MAINTENANCE_UNDERWEIGHT_A = [
]

MAINTENANCE_UNDERWEIGHT_B = [
    Exercise(name="Curl Martillo",                  sets=3, reps="10-12", rest_seconds=60,  muscle_group="Braquial",          notes="âš¡ Detectable en tiempo real con tu cÃ¡mara"),
]

MAINTENANCE_UNDERWEIGHT_C = [
    Exercise(name="Hip Thrust con Barra",           sets=3, reps="10-12", rest_seconds=90,  muscle_group="GlÃºteos/Isquios",   notes="Carga progresiva semana a semana"),
]


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  IMC
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def calculate_imc(weight_kg: float, height_cm: float) -> tuple[float, str]:
    imc = round(weight_kg / ((height_cm / 100) ** 2), 1)
    if imc < 18.5:
        return imc, "Bajo peso"
    elif imc < 25:
        return imc, "Normal"
    elif imc < 30:
        return imc, "Sobrepeso"
    else:
        return imc, "Obesidad"


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  ADAPTACIÃ“N POR IMC
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _adapt_exercise(ex: Exercise, imc_category: Optional[str]) -> Exercise:
    if imc_category is None:
        return Exercise(
            name=ex.name,
            sets=ex.sets,
            reps=ex.reps,
            rest_seconds=ex.rest_seconds,
            muscle_group=ex.muscle_group,
            mode=_infer_exercise_mode(ex),
            notes=ex.notes,
        )

    sets = ex.sets
    rest = ex.rest_seconds
    notes = ex.notes or ""

    if imc_category == "Bajo peso":
        sets = min(sets + 1, 5)
        rest = min(rest + 30, 150)
        suffix = "Prioriza comer en superÃ¡vit calÃ³rico (+300-500 kcal/dÃ­a)."
        notes = f"{notes} Â· {suffix}" if notes else suffix

    elif imc_category == "Sobrepeso":
        rest = max(rest - 15, 20)
        suffix = "Descanso activo: marcha en sitio entre series."
        notes = f"{notes} Â· {suffix}" if notes else suffix

    elif imc_category == "Obesidad":
        sets = max(sets - 1, 2)
        rest = rest + 30
        suffix = "Rango de movimiento cÃ³modo. Para si sientes dolor articular."
        notes = f"{notes} Â· {suffix}" if notes else suffix

    return Exercise(
        name=ex.name, sets=sets, reps=ex.reps,
        rest_seconds=rest, muscle_group=ex.muscle_group, mode=_infer_exercise_mode(ex), notes=notes,
    )


def _adapt_list(exercises: list[Exercise], imc_category: Optional[str]) -> list[Exercise]:
    return [_adapt_exercise(e, imc_category) for e in exercises]


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  GROQ â€” RECOMENDACIÃ“N DE VARIANTE
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def get_groq_recommendation(
    goal: str,
    frequency: str,
    imc: Optional[float],
    imc_category: Optional[str],
    nivel_actividad: Optional[str] = None,
    edad: Optional[int] = None,
    sexo: Optional[str] = None,
    variantes_descripcion: Optional[dict] = None,
) -> dict:
    """
    Llama a Groq para:
    1. Recomendar cuÃ¡l de las 3 variantes (A/B/C) conviene mÃ¡s al usuario.
    2. Generar un coaching_tip personalizado basado en su perfil.

    Retorna:
        {
          "variante_recomendada": "A" | "B" | "C",
          "razon": "Texto corto explicando por quÃ©",
          "coaching_tip": "Consejo personalizado de 2-3 lÃ­neas"
        }
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        # Sin clave: devuelve defaults razonables
        return {
            "variante_recomendada": "A",
            "razon": "Variante estÃ¡ndar recomendada por defecto.",
            "coaching_tip": "MantÃ©n una progresiÃ³n constante aumentando el peso un 2.5-5% cada semana.",
        }

    client = Groq(api_key=groq_api_key)

    perfil = {
        "meta": goal,
        "frecuencia_semanal": frequency,
        "imc": imc,
        "categoria_imc": imc_category,
        "nivel_actividad": nivel_actividad or "no especificado",
        "edad": edad or "no especificado",
        "sexo": sexo or "no especificado",
    }

    variantes_str = ""
    if variantes_descripcion:
        for k, v in variantes_descripcion.items():
            variantes_str += f"\n  Variante {k}: {v}"

    prompt = f"""Eres un entrenador personal experto. Analiza este perfil de deportista:
{json.dumps(perfil, ensure_ascii=False, indent=2)}

Las tres variantes de plan disponibles son:{variantes_str}

Responde ÃšNICAMENTE con un JSON vÃ¡lido (sin texto extra, sin markdown) con esta estructura:
{{
  "variante_recomendada": "A" o "B" o "C",
  "razon": "ExplicaciÃ³n breve (mÃ¡ximo 2 oraciones) de por quÃ© esta variante es la mejor para este perfil",
  "coaching_tip": "Consejo personalizado de 2-3 oraciones considerando su IMC, meta y nivel de actividad"
}}"""

    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=300,
        )
        raw = response.choices[0].message.content.strip()
        # Limpiar posibles backticks residuales
        raw = re.sub(r"```(?:json)?", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        print(f"[Groq error] {e}")
        return {
            "variante_recomendada": "A",
            "razon": "RecomendaciÃ³n por defecto (error al conectar con IA).",
            "coaching_tip": "EnfÃ³cate en la tÃ©cnica antes de aumentar el peso. La consistencia supera a la intensidad.",
        }


# â”€â”€ CATÃLOGO FINAL EFECTIVO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _exercise(
    name: str,
    sets: int,
    reps: str,
    rest_seconds: int,
    muscle_group: str,
    notes: str = "",
    mode: Optional[str] = None,
) -> Exercise:
    return Exercise(
        name=name,
        sets=sets,
        reps=reps,
        rest_seconds=rest_seconds,
        muscle_group=muscle_group,
        mode=mode,
        notes=notes,
    )


EXERCISE_CATALOG = {
    "Sentadilla al CajÃ³n": _exercise("Sentadilla al CajÃ³n", 3, "12", 60, "Piernas/GlÃºteos", "Usa una silla como referencia de profundidad."),
    "Zancadas Alternas por Tiempo": _exercise("Zancadas Alternas por Tiempo", 3, "40 seg", 45, "Piernas/GlÃºteos", "Alterna piernas con control y torso erguido.", mode="timer"),
    "Saltos con Zancada Alterna": _exercise("Saltos con Zancada Alterna", 3, "30 seg", 60, "Piernas/GlÃºteos", "Cambia de pierna en el aire con aterrizaje suave.", mode="timer"),
    "Estocadas EstÃ¡ticas": _exercise("Estocadas EstÃ¡ticas", 3, "10 c/lado", 60, "Piernas/GlÃºteos", "Sin salto, movimiento controlado."),
    "Hip Thrust en Suelo": _exercise("Hip Thrust en Suelo", 3, "15", 60, "GlÃºteos", "Aprieta glÃºteos 2 segundos en la parte alta."),
    "Elevaciones de Talones Sentado": _exercise("Elevaciones de Talones Sentado", 3, "20", 30, "Gemelos", "Pausa en punta y baja completo."),
    "Flexiones en Pared o Rodillas": _exercise("Flexiones en Pared o Rodillas", 3, "12", 60, "Pecho/TrÃ­ceps", "Progresa a flexiones completas con el tiempo."),
    "Flexiones de Pecho": _exercise("Flexiones de Pecho", 4, "10-12", 75, "Pecho/TrÃ­ceps", "Cuerpo en lÃ­nea recta durante todo el movimiento."),
    "Flexiones Diamante": _exercise("Flexiones Diamante", 3, "8-10", 75, "Pecho/TrÃ­ceps", "Mayor Ã©nfasis en trÃ­ceps."),
    "Flexiones Rusas de Antebrazos": _exercise("Flexiones Rusas de Antebrazos", 2, "6-8", 75, "Pecho/TrÃ­ceps/Hombros", "Baja a antebrazos y vuelve a extender con control."),
    "Remo con Mancuerna Apoyado en Banco": _exercise("Remo con Mancuerna Apoyado en Banco", 3, "12 c/lado", 60, "Espalda", "Apoya una rodilla y una mano en el banco para estabilizar."),
    "Remo con Banda o Mancuerna": _exercise("Remo con Banda o Mancuerna", 3, "12", 60, "Espalda", "Retrae escÃ¡pulas al final del movimiento."),
    "Remo Sentado con Banda": _exercise("Remo Sentado con Banda", 3, "15", 60, "Espalda", "Jala hacia el abdomen, no la cintura."),
    "Curl de BÃ­ceps con Mancuernas": _exercise("Curl de BÃ­ceps con Mancuernas", 3, "12", 60, "BÃ­ceps", "Sube controlado y evita balancear el torso."),
    "Curl Martillo": _exercise("Curl Martillo", 3, "10-12", 60, "BÃ­ceps/Braquial", "Agarre neutro, codos pegados al cuerpo."),
    "Press de Hombros Sentado": _exercise("Press de Hombros Sentado", 3, "12", 60, "Hombros", "Mancuernas livianas y forma perfecta."),
    "Polichinelas": _exercise("Polichinelas", 4, "40 seg", 20, "Cardio/Full Body", "Ritmo constante abriendo piernas y brazos.", mode="timer"),
    "Burpees": _exercise("Burpees", 3, "10", 45, "Full Body", "Pecho al suelo y salto controlado."),
    "Marcha en Sitio Rodillas Altas": _exercise("Marcha en Sitio Rodillas Altas", 3, "40 seg", 30, "Core/Cardio", "Rodillas arriba y brazos activos.", mode="timer"),
    "Mountain Climbers": _exercise("Mountain Climbers", 4, "30 seg", 20, "Core/Cardio", "MÃ¡xima velocidad con caderas bajas.", mode="timer"),
    "Flexiones Cerradas": _exercise("Flexiones Cerradas", 3, "8-12", 75, "Pecho/TrÃ­ceps", "Codos pegados al cuerpo."),
    "Plank": _exercise("Plank", 3, "40 seg", 30, "Core", "Abdomen firme y pelvis neutra.", mode="hold"),
    "Plancha Lateral": _exercise("Plancha Lateral", 3, "30 seg c/lado", 30, "Core/Oblicuos", "Cadera alta y cuerpo alineado.", mode="hold"),
    "Superman Hold": _exercise("Superman Hold", 3, "30 seg", 30, "Core/Espalda Baja", "Eleva brazos y piernas sin comprimir la lumbar.", mode="hold"),
    "Wall Sit": _exercise("Wall Sit", 3, "40 seg", 30, "Piernas/Core", "Rodillas a 90Â° y espalda pegada a la pared.", mode="hold"),
    "Bicicleta EstÃ¡tica": _exercise("Bicicleta EstÃ¡tica", 1, "15 min", 0, "Cardio", "Cadencia moderada y constante.", mode="timer"),
    "Caminadora o Caminata Activa": _exercise("Caminadora o Caminata Activa", 1, "15 min", 0, "Cardio", "Paso sostenido para recuperaciÃ³n activa.", mode="timer"),
    "Trote Suave en el Sitio": _exercise("Trote Suave en el Sitio", 3, "60 seg", 30, "Cardio", "Impacto ligero y ritmo estable.", mode="timer"),
    "Movilidad de Cadera": _exercise("Movilidad de Cadera", 2, "45 seg", 20, "Movilidad", "CÃ­rculos amplios y controlados.", mode="timer"),
    "RotaciÃ³n TorÃ¡cica": _exercise("RotaciÃ³n TorÃ¡cica", 2, "45 seg", 20, "Movilidad", "Rota desde la parte alta de la espalda.", mode="timer"),
    "Movilidad de Hombros": _exercise("Movilidad de Hombros", 2, "45 seg", 20, "Movilidad", "Movimiento suave y sin dolor.", mode="timer"),
    "Caminata Activa o Bici EstÃ¡tica": _exercise("Caminata Activa o Bici EstÃ¡tica", 1, "20 min", 0, "Cardio", "Zona 2: puedes mantener una conversaciÃ³n.", mode="timer"),
    "Sentadilla con Salto": _exercise("Sentadilla con Salto", 4, "12", 30, "Piernas/Cardio", "Salta y aterriza suave."),
}


def _pick_exercises(*names: str) -> list[Exercise]:
    return [EXERCISE_CATALOG[name].model_copy(deep=True) for name in names]


HYPERTROPHY_PUSH_A = _pick_exercises("Flexiones en Pared o Rodillas", "Flexiones de Pecho", "Flexiones Diamante", "Flexiones Cerradas", "Flexiones Rusas de Antebrazos", "Press de Hombros Sentado")
HYPERTROPHY_PUSH_B = _pick_exercises("Flexiones de Pecho", "Flexiones Diamante", "Flexiones Cerradas", "Flexiones Rusas de Antebrazos", "Press de Hombros Sentado")
HYPERTROPHY_PULL_A = _pick_exercises("Remo con Mancuerna Apoyado en Banco", "Remo con Banda o Mancuerna", "Remo Sentado con Banda", "Curl de BÃ­ceps con Mancuernas", "Curl Martillo")
HYPERTROPHY_PULL_B = _pick_exercises("Remo con Banda o Mancuerna", "Remo Sentado con Banda", "Remo con Mancuerna Apoyado en Banco", "Curl de BÃ­ceps con Mancuernas", "Curl Martillo")
HYPERTROPHY_LEGS_A = _pick_exercises("Sentadilla al CajÃ³n", "Zancadas Alternas por Tiempo", "Saltos con Zancada Alterna", "Estocadas EstÃ¡ticas", "Hip Thrust en Suelo", "Elevaciones de Talones Sentado")
HYPERTROPHY_LEGS_B = _pick_exercises("Sentadilla al CajÃ³n", "Estocadas EstÃ¡ticas", "Zancadas Alternas por Tiempo", "Saltos con Zancada Alterna", "Hip Thrust en Suelo", "Elevaciones de Talones Sentado")

FAT_LOSS_CIRCUIT_A = _pick_exercises("Sentadilla con Salto", "Flexiones de Pecho", "Mountain Climbers", "Polichinelas", "Burpees", "Marcha en Sitio Rodillas Altas")
FAT_LOSS_CIRCUIT_B = _pick_exercises("Saltos con Zancada Alterna", "Polichinelas", "Mountain Climbers", "Burpees", "Plank", "Marcha en Sitio Rodillas Altas")
FAT_LOSS_LOW_IMPACT_A = _pick_exercises("Sentadilla al CajÃ³n", "Flexiones en Pared o Rodillas", "Flexiones de Pecho", "Flexiones Diamante", "Flexiones Rusas de Antebrazos", "Zancadas Alternas por Tiempo", "Saltos con Zancada Alterna", "Marcha en Sitio Rodillas Altas", "Remo con Mancuerna Apoyado en Banco", "Remo con Banda o Mancuerna", "Curl de BÃ­ceps con Mancuernas", "Curl Martillo")
FAT_LOSS_LOW_IMPACT_B = _pick_exercises("Estocadas EstÃ¡ticas", "Press de Hombros Sentado", "Hip Thrust en Suelo", "Remo Sentado con Banda", "Elevaciones de Talones Sentado", "Plank", "Plancha Lateral", "Superman Hold", "Wall Sit", "Bicicleta EstÃ¡tica", "Caminadora o Caminata Activa", "Trote Suave en el Sitio", "Movilidad de Cadera", "RotaciÃ³n TorÃ¡cica", "Movilidad de Hombros", "Caminata Activa o Bici EstÃ¡tica")
FAT_LOSS_LOW_IMPACT_C = _pick_exercises("Sentadilla al CajÃ³n", "Curl de BÃ­ceps con Mancuernas", "Flexiones de Pecho", "Flexiones Diamante", "Flexiones Rusas de Antebrazos", "Mountain Climbers")

MAINTENANCE_FULL_A = _pick_exercises("Sentadilla al CajÃ³n", "Flexiones en Pared o Rodillas", "Remo con Banda o Mancuerna", "Curl de BÃ­ceps con Mancuernas", "Press de Hombros Sentado")
MAINTENANCE_FULL_B = _pick_exercises("Estocadas EstÃ¡ticas", "Hip Thrust en Suelo", "Remo Sentado con Banda", "Elevaciones de Talones Sentado", "Plank")
MAINTENANCE_FULL_C = _pick_exercises("Sentadilla al CajÃ³n", "Flexiones de Pecho", "Flexiones Rusas de Antebrazos", "Remo con Mancuerna Apoyado en Banco", "Curl Martillo", "Hip Thrust en Suelo", "Plancha Lateral", "Plank", "Bicicleta EstÃ¡tica", "Caminadora o Caminata Activa", "Movilidad de Cadera", "RotaciÃ³n TorÃ¡cica")
MAINTENANCE_UNDERWEIGHT_A = _pick_exercises("Sentadilla al CajÃ³n", "Flexiones de Pecho", "Remo con Mancuerna Apoyado en Banco", "Press de Hombros Sentado", "Flexiones Cerradas")
MAINTENANCE_UNDERWEIGHT_B = _pick_exercises("Estocadas EstÃ¡ticas", "Flexiones Diamante", "Remo con Banda o Mancuerna", "Press de Hombros Sentado", "Hip Thrust en Suelo", "Curl Martillo")
MAINTENANCE_UNDERWEIGHT_C = _pick_exercises("Sentadilla al CajÃ³n", "Flexiones Rusas de Antebrazos", "Remo Sentado con Banda", "Hip Thrust en Suelo", "Curl de BÃ­ceps con Mancuernas")

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  CONSTRUCTOR PRINCIPAL â€” 3 VARIANTES POR META
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def build_plans(
    goal: str,
    frequency: str,
    weight_kg: Optional[float] = None,
    height_cm: Optional[float] = None,
    nivel_actividad: Optional[str] = None,
    edad: Optional[int] = None,
    sexo: Optional[str] = None,
) -> dict:
    """
    Genera las 3 variantes de plan + recomendaciÃ³n Groq.

    Retorna:
    {
      "variantes": {
        "A": TrainingPlan,
        "B": TrainingPlan,
        "C": TrainingPlan,
      },
      "recomendacion": {
        "variante_recomendada": "A"|"B"|"C",
        "razon": "...",
        "coaching_tip": "..."
      }
    }
    """
    imc = None
    imc_category = None
    if weight_kg and height_cm:
        imc, imc_category = calculate_imc(weight_kg, height_cm)

    freq_map   = {"baja": 2, "media": 4, "alta": 6}
    freq_label = {"baja": "Baja (1-2 dÃ­as)", "media": "Media (3-4 dÃ­as)", "alta": "Alta (5-6 dÃ­as)"}
    days_per_week = freq_map.get(frequency, 4)
    goal_lower = goal.lower()

    variantes: dict[str, TrainingPlan] = {}

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    #  HIPERTROFIA
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if "muscular" in goal_lower or "masa" in goal_lower or "mÃºsculo" in goal_lower or "musculo" in goal_lower:

        def _hypertrophy_plan(push, pull, legs, variant_label, desc, intensity):
            push_pool = _prepare_exercise_pool(push, imc_category)
            pull_pool = _prepare_exercise_pool(pull, imc_category)
            legs_pool = _prepare_exercise_pool(legs, imc_category)

            push_focus = _filter_exercises(push_pool, ["pecho", "banca", "inclinado", "press", "apertura", "fly", "flexion", "flexiones", "diamante"])
            chest_focus = _filter_exercises(push_pool, ["pecho", "banca", "inclinado", "apertura", "fly", "flexion", "flexiones"])
            shoulder_focus = _filter_exercises(push_pool + pull_pool, ["hombro", "deltoides", "arnold", "laterales", "frontal"])
            triceps_focus = _filter_exercises(push_pool, ["trÃ­ceps", "patada", "skullcrusher", "francÃ©s", "fondos", "diamante", "cerradas"])
            pull_focus = _filter_exercises(pull_pool, ["dorsal", "espalda", "remo", "jalÃ³n", "dominadas", "face", "peso muerto", "cadena posterior"])
            biceps_focus = _filter_exercises(pull_pool, ["bÃ­ceps", "biceps", "curl", "braquial"])
            back_biceps_focus = pull_focus[:3] + biceps_focus[:3]
            legs_focus = _filter_exercises(legs_pool, ["cuÃ¡driceps", "cuadriceps", "sentadilla", "prensa", "zancadas", "glÃºteos", "gluteos", "isqui", "gemelos", "hip thrust", "peso muerto"])
            posterior_focus = _filter_exercises(legs_pool, ["isqui", "glÃºteos", "gluteos", "peso muerto", "hip thrust", "curl femoral", "sumo"])

            if days_per_week == 2:
                days = [
                    _build_workout_day(
                        1,
                        "DÃ­a 1 â€” Pecho, Espalda y Piernas",
                        "Pecho, Espalda, Piernas, Core",
                        push_focus[:2] + pull_focus[:2] + legs_focus[:3],
                    ),
                    _build_workout_day(
                        2,
                        "DÃ­a 2 â€” Hombros, Brazos y GlÃºteos",
                        "Hombros, Espalda, GlÃºteos, Brazos",
                        shoulder_focus[:2] + pull_focus[2:4] + posterior_focus[:3] + biceps_focus[:2],
                    ),
                ]
            elif days_per_week == 4:
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Pecho y TrÃ­ceps", "Pecho, TrÃ­ceps", chest_focus + triceps_focus),
                    _build_workout_day(2, "DÃ­a 2 â€” Espalda y BÃ­ceps", "Espalda, BÃ­ceps, Deltoides posterior", back_biceps_focus + _filter_exercises(pull_pool, ["posterior", "face"])),
                    _build_workout_day(3, "DÃ­a 3 â€” Piernas y GlÃºteos", "CuÃ¡driceps, GlÃºteos, Isquiotibiales, Gemelos", legs_focus),
                    _build_workout_day(4, "DÃ­a 4 â€” Hombros y Abdomen", "Deltoides, Brazos, Core", shoulder_focus + triceps_focus + biceps_focus),
                ]
            else:  # alta
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Pecho y TrÃ­ceps A", "Pecho, TrÃ­ceps", chest_focus + triceps_focus),
                    _build_workout_day(2, "DÃ­a 2 â€” Espalda y BÃ­ceps A", "Espalda, BÃ­ceps", back_biceps_focus),
                    _build_workout_day(3, "DÃ­a 3 â€” Piernas y GlÃºteos A", "CuÃ¡driceps, GlÃºteos, Gemelos", legs_focus),
                    _build_workout_day(4, "DÃ­a 4 â€” Pecho y Hombros B", "Pecho superior, Deltoides, TrÃ­ceps", list(reversed(chest_focus)) + shoulder_focus[:2] + triceps_focus[:1]),
                    _build_workout_day(5, "DÃ­a 5 â€” Espalda y BÃ­ceps B", "Espalda media, BÃ­ceps, Trapecio", list(reversed(pull_focus[:3])) + biceps_focus[:3] + _filter_exercises(pull_pool, ["trapecio", "face"])),
                    _build_workout_day(6, "DÃ­a 6 â€” Abdomen y Cardio", "Core, acondicionamiento, recuperaciÃ³n activa", posterior_focus + legs_focus[:2]),
                ]

            return TrainingPlan(
                goal=goal, frequency_level=freq_label[frequency],
                days_per_week=days_per_week, imc=imc, imc_category=imc_category,
                intensity=intensity, plan_type="Hipertrofia",
                description=desc, days=days, variant=variant_label,
            )

        if imc_category == "Obesidad":
            intensity = "Moderada-Alta"
            base_desc = "Hipertrofia adaptada: cargas progresivas con rango de movimiento ajustado para proteger articulaciones."
        elif imc_category == "Bajo peso":
            intensity = "Alta"
            base_desc = "Hipertrofia con volumen extra. Come en superÃ¡vit de 300-500 kcal/dÃ­a para maximizar ganancias."
        else:
            intensity = "Alta"
            base_desc = "Hipertrofia clÃ¡sica (8-12 reps). ProgresiÃ³n de carga obligatoria para estimular el crecimiento."

        variantes["A"] = _hypertrophy_plan(
            HYPERTROPHY_PUSH_A, HYPERTROPHY_PULL_A, HYPERTROPHY_LEGS_A, "A",
            f"{base_desc} Variante A: Ã©nfasis en ejercicios con barra (mayor sobrecarga).", intensity,
        )
        variantes["B"] = _hypertrophy_plan(
            HYPERTROPHY_PUSH_B, HYPERTROPHY_PULL_B, HYPERTROPHY_LEGS_B, "B",
            f"{base_desc} Variante B: mezcla de barra y mancuernas, mÃ¡s variedad de Ã¡ngulos.", intensity,
        )
        variantes["C"] = _hypertrophy_plan(
            HYPERTROPHY_PUSH_C, HYPERTROPHY_PULL_C, HYPERTROPHY_LEGS_C, "C",
            f"{base_desc} Variante C: Ã©nfasis en mancuernas y poleas para mayor rango de movimiento.", intensity,
        )

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    #  PÃ‰RDIDA DE GRASA
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    elif "grasa" in goal_lower or "perder" in goal_lower:

        use_low_impact = (imc_category == "Obesidad")

        def _fat_loss_plan(circuit_a, circuit_b, variant_label, desc, intensity):
            ca_pool = _prepare_exercise_pool(circuit_a, imc_category)
            cb_pool = _prepare_exercise_pool(circuit_b, imc_category)

            lower_focus = _filter_exercises(
                ca_pool + cb_pool,
                ["sentadilla", "zancada", "estocada", "pierna", "glÃºteos", "gluteos", "peso muerto", "hip thrust", "gemelos", "cajÃ³n", "salto"],
            )
            upper_push = _filter_exercises(
                ca_pool + cb_pool,
                ["flexion", "flexiones", "press", "hombro", "pecho", "trÃ­ceps", "triceps"],
            )
            chest_triceps = _filter_exercises(
                ca_pool + cb_pool,
                ["flexion", "flexiones", "pecho", "trÃ­ceps", "triceps", "diamante", "cerradas", "fondos"],
            )
            back_biceps = _filter_exercises(
                ca_pool + cb_pool,
                ["remo", "jalÃ³n", "jalon", "dominadas", "espalda", "peso muerto", "cadena posterior"],
            )
            biceps_only = _filter_exercises(
                ca_pool + cb_pool,
                ["bÃ­ceps", "biceps", "curl", "braquial"],
            )
            upper_pull = _filter_exercises(
                ca_pool + cb_pool,
                ["remo", "jalÃ³n", "jalon", "dominadas", "espalda", "bÃ­ceps", "biceps", "curl", "peso muerto", "cadena posterior"],
            )
            conditioning = _filter_exercises(
                ca_pool + cb_pool,
                ["burpee", "sprint", "cardio", "marcha", "caminata", "bici", "mountain", "intervalo", "hiit", "saltos"],
            )
            core_focus = _filter_exercises(
                ca_pool + cb_pool,
                ["core", "plank", "plancha", "rotaciÃ³n", "rotacion", "superman", "abdominal"],
            )
            cardio_live = _filter_exercises(
                ca_pool + cb_pool,
                ["polichinelas", "burpee", "mountain", "marcha", "rodillas altas", "saltos"],
            )
            mobility_focus = _filter_exercises(
                ca_pool + cb_pool,
                ["movilidad", "estiramientos", "rotaciÃ³n", "rotacion", "caminata", "bici", "torÃ¡cica", "toracica", "cadera", "hombros"],
            )

            if days_per_week == 2:
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Piernas y GlÃºteos", "Piernas, GlÃºteos", lower_focus[:5] + conditioning[:1]),
                    _build_workout_day(2, "DÃ­a 2 â€” Tren Superior y Cardio", "Pecho, Espalda, Hombros, Cardio", upper_push[:3] + upper_pull[:2] + conditioning[:2]),
                ]
            elif days_per_week == 4:
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Piernas y GlÃºteos", "Piernas, GlÃºteos", lower_focus[:6]),
                    _build_workout_day(2, "DÃ­a 2 â€” Pecho y TrÃ­ceps", "Pecho, TrÃ­ceps", chest_triceps[:5]),
                    _build_workout_day(3, "DÃ­a 3 â€” Espalda y BÃ­ceps", "Espalda, BÃ­ceps", back_biceps[:3] + biceps_only[:2]),
                    _build_workout_day(4, "DÃ­a 4 â€” Abdomen y Cardio", "HIIT, Cardio, Movilidad", conditioning[:4] + core_focus[:1]),
                ]
            else:
                mobility = _filter_exercises(
                    ca_pool + cb_pool,
                    ["movilidad", "estiramientos", "caminata", "bici", "cardio"],
                )
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Piernas y GlÃºteos", "Piernas, GlÃºteos", lower_focus[:6]),
                    _build_workout_day(2, "DÃ­a 2 â€” Pecho y TrÃ­ceps", "Pecho, TrÃ­ceps", chest_triceps[:5]),
                    _build_workout_day(3, "DÃ­a 3 â€” Espalda y BÃ­ceps", "Espalda, BÃ­ceps", back_biceps[:3] + biceps_only[:2]),
                    _build_workout_day(4, "DÃ­a 4 â€” Cuerpo Completo A", "Full body + cardio", cardio_live[:3] + lower_focus[:2] + chest_triceps[:1]),
                    _build_workout_day(5, "DÃ­a 5 â€” Cuerpo Completo B", "Full body + HIIT", cardio_live[1:4] + back_biceps[:2] + core_focus[:1]),
                    _build_workout_day(6, "DÃ­a 6 â€” Abdomen, Cardio y Movilidad", "RecuperaciÃ³n activa", cardio_live[:3] + core_focus[:2] + mobility_focus[:2]),
                ]

            return TrainingPlan(
                goal=goal, frequency_level=freq_label[frequency],
                days_per_week=days_per_week, imc=imc, imc_category=imc_category,
                intensity=intensity, plan_type="MetabÃ³lico",
                description=desc, days=days, variant=variant_label,
            )

        if use_low_impact:
            variantes["A"] = _fat_loss_plan(FAT_LOSS_LOW_IMPACT_A, FAT_LOSS_LOW_IMPACT_B, "A",
                "Plan metabÃ³lico de bajo impacto. Ejercicios articular-seguros que elevan el gasto calÃ³rico sin sobrecargar rodillas y espalda.", "Moderada")
            variantes["B"] = _fat_loss_plan(FAT_LOSS_LOW_IMPACT_B, FAT_LOSS_LOW_IMPACT_C, "B",
                "Plan bajo impacto con mayor Ã©nfasis en glÃºteos y cadena posterior. Introduce carga progresiva en cada sesiÃ³n.", "Moderada")
            variantes["C"] = _fat_loss_plan(FAT_LOSS_LOW_IMPACT_C, FAT_LOSS_LOW_IMPACT_A, "C",
                "Plan bajo impacto con mancuernas y bandas. MÃ¡s variedad de movimientos para evitar adaptaciÃ³n.", "Moderada")
        else:
            int_label = "Moderada-Alta" if imc_category == "Sobrepeso" else "Alta"
            variantes["A"] = _fat_loss_plan(FAT_LOSS_CIRCUIT_A, FAT_LOSS_CIRCUIT_B, "A",
                "Circuito metabÃ³lico clÃ¡sico: ejercicios funcionales con descansos cortos. MÃ¡xima quema calÃ³rica en poco tiempo.", int_label)
            variantes["B"] = _fat_loss_plan(FAT_LOSS_CIRCUIT_B, FAT_LOSS_CIRCUIT_A, "B",
                "Circuito con mayor Ã©nfasis en tren inferior y glÃºteos. Ideal si quieres tambiÃ©n tonificar piernas.", int_label)
            variantes["C"] = _fat_loss_plan(FAT_LOSS_CIRCUIT_C, FAT_LOSS_CIRCUIT_A, "C",
                "HÃ­brido fuerza-cardio: ejercicios compuestos a ritmo alto mÃ¡s intervalos de sprint. Preserva mÃ¡s mÃºsculo.", int_label)

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    #  MANTENIMIENTO
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    else:
        use_underweight = (imc_category == "Bajo peso")

        def _maintenance_plan(fa, fb, variant_label, desc, intensity):
            fa_pool = _prepare_exercise_pool(fa, imc_category)
            fb_pool = _prepare_exercise_pool(fb, imc_category)

            upper_push = _filter_exercises(
                fa_pool + fb_pool,
                ["pecho", "press", "flexion", "flexiones", "hombro", "trÃ­ceps", "triceps"],
            )
            chest_triceps = _filter_exercises(
                fa_pool + fb_pool,
                ["pecho", "flexion", "flexiones", "trÃ­ceps", "triceps", "diamante", "cerradas", "fondos"],
            )
            back_biceps = _filter_exercises(
                fa_pool + fb_pool,
                ["espalda", "remo", "jalÃ³n", "jalon", "dominadas", "peso muerto", "cadena posterior"],
            )
            biceps_only = _filter_exercises(
                fa_pool + fb_pool,
                ["bÃ­ceps", "biceps", "curl", "braquial"],
            )
            upper_pull = _filter_exercises(
                fa_pool + fb_pool,
                ["espalda", "remo", "jalÃ³n", "jalon", "dominadas", "bÃ­ceps", "biceps", "curl", "trapecio", "peso muerto", "cadena posterior"],
            )
            lower_focus = _filter_exercises(
                fa_pool + fb_pool,
                ["pierna", "sentadilla", "zancada", "peso muerto", "glÃºteos", "gluteos", "hip thrust", "gemelos", "cuÃ¡driceps", "cuadriceps"],
            )
            core_focus = _filter_exercises(
                fa_pool + fb_pool,
                ["core", "plank", "plancha", "abdominal", "rotaciÃ³n", "rotacion"],
            )
            mobility = _filter_exercises(
                fa_pool + fb_pool,
                ["movilidad", "estiramientos", "cardio", "caminata", "bici"],
            )

            if days_per_week == 2:
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Cuerpo Completo A", "Piernas, Pecho, Espalda, Core", lower_focus[:3] + upper_push[:2] + upper_pull[:2]),
                    _build_workout_day(2, "DÃ­a 2 â€” Cuerpo Completo B", "Cadena Posterior, Hombros, Core", lower_focus[2:5] + upper_push[2:4] + core_focus[:2]),
                ]
            elif days_per_week == 4:
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Pecho y TrÃ­ceps", "Pecho, TrÃ­ceps", chest_triceps[:5]),
                    _build_workout_day(2, "DÃ­a 2 â€” Piernas y GlÃºteos", "Piernas, GlÃºteos, Gemelos", lower_focus[:5]),
                    _build_workout_day(3, "DÃ­a 3 â€” Espalda y BÃ­ceps", "Espalda, BÃ­ceps, Trapecio", back_biceps[:3] + biceps_only[:2]),
                    _build_workout_day(4, "DÃ­a 4 â€” Abdomen y Movilidad", "Core, Cardio, RecuperaciÃ³n", core_focus[:2] + mobility[:3]),
                ]
            else:
                days = [
                    _build_workout_day(1, "DÃ­a 1 â€” Pecho y TrÃ­ceps", "Pecho, TrÃ­ceps", chest_triceps[:5]),
                    _build_workout_day(2, "DÃ­a 2 â€” Espalda y BÃ­ceps", "Espalda, BÃ­ceps, Trapecio", back_biceps[:3] + biceps_only[:2]),
                    _build_workout_day(3, "DÃ­a 3 â€” Piernas y GlÃºteos", "CuÃ¡driceps, GlÃºteos, Isquios, Gemelos", lower_focus[:6]),
                    _build_workout_day(4, "DÃ­a 4 â€” Hombros y Tren Superior", "Pecho, Espalda, Hombros", upper_push[:3] + upper_pull[:3]),
                    _build_workout_day(5, "DÃ­a 5 â€” Piernas y Abdomen", "Piernas, Core", lower_focus[:4] + core_focus[:2]),
                    _build_workout_day(6, "DÃ­a 6 â€” Cardio y Movilidad", "Cardio, Movilidad", mobility[:3] + core_focus[:1]),
                ]

            return TrainingPlan(
                goal=goal, frequency_level=freq_label[frequency],
                days_per_week=days_per_week, imc=imc, imc_category=imc_category,
                intensity=intensity, plan_type="Mantenimiento",
                description=desc, days=days, variant=variant_label,
            )

        if use_underweight:
            int_label = "Moderada-Alta"
            variantes["A"] = _maintenance_plan(MAINTENANCE_UNDERWEIGHT_A, MAINTENANCE_UNDERWEIGHT_B, "A",
                "RecomposiciÃ³n corporal: ejercicios compuestos con barra para ganar fuerza y masa desde bajo peso.", int_label)
            variantes["B"] = _maintenance_plan(MAINTENANCE_UNDERWEIGHT_B, MAINTENANCE_UNDERWEIGHT_C, "B",
                "Ã‰nfasis en peso muerto y movimientos de cadena posterior. Construye base de fuerza real.", int_label)
            variantes["C"] = _maintenance_plan(MAINTENANCE_UNDERWEIGHT_C, MAINTENANCE_UNDERWEIGHT_A, "C",
                "Variante con sentadilla frontal y movimientos de mayor rango. Mayor activaciÃ³n muscular total.", int_label)
        else:
            int_label = "Moderada" if imc_category != "Sobrepeso" else "Moderada-Alta"
            variantes["A"] = _maintenance_plan(MAINTENANCE_FULL_A, MAINTENANCE_FULL_B, "A",
                "Mantenimiento clÃ¡sico: ejercicios compuestos con barra. Fuerza funcional y composiciÃ³n estable.", int_label)
            variantes["B"] = _maintenance_plan(MAINTENANCE_FULL_B, MAINTENANCE_FULL_C, "B",
                "Mayor Ã©nfasis en cadena posterior y core. Equilibrio entre fuerza y movilidad.", int_label)
            variantes["C"] = _maintenance_plan(MAINTENANCE_FULL_C, MAINTENANCE_FULL_A, "C",
                "Variante con mancuernas y peso corporal. MÃ¡s accesible y con mayor rango de movimiento.", int_label)

    # â”€â”€ DescripciÃ³n de variantes para Groq â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    variantes_desc = {k: v.description for k, v in variantes.items()}

    recomendacion = get_groq_recommendation(
        goal=goal, frequency=frequency, imc=imc, imc_category=imc_category,
        nivel_actividad=nivel_actividad, edad=edad, sexo=sexo,
        variantes_descripcion=variantes_desc,
    )

    return {
        "variantes": variantes,
        "recomendacion": recomendacion,
    }


# â”€â”€ Compatibilidad con el router existente (sigue funcionando si alguien llama build_plan) â”€â”€
def build_plan(
    goal: str,
    frequency: str,
    weight_kg: Optional[float] = None,
    height_cm: Optional[float] = None,
) -> TrainingPlan:
    """Backward-compatible: devuelve solo la variante A."""
    result = build_plans(goal=goal, frequency=frequency, weight_kg=weight_kg, height_cm=height_cm)
    return result["variantes"]["A"]


def _validate_variant(variant: str) -> str:
    normalized = (variant or "").strip().upper()
    if normalized not in {"A", "B", "C"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="plan_variant debe ser A, B o C",
        )
    return normalized


def _validate_frequency(frequency: str) -> str:
    normalized = (frequency or "").strip().lower()
    if normalized not in {"baja", "media", "alta"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="frequency debe ser 'baja', 'media' o 'alta'",
        )
    return normalized


def _plan_from_selection(selection: TrainingPlanSelection) -> TrainingPlan:
    return TrainingPlan.model_validate(selection.plan_payload)


def _routine_to_payload(routine: TrainingRoutineProgress) -> dict:
    return {
        "id": routine.id,
        "day_number": routine.day_number,
        "day_name": routine.day_name,
        "status": routine.status,
        "started_at": routine.started_at,
        "completed_at": routine.completed_at,
        "completed_exercises_count": routine.completed_exercises_count,
        "total_exercises": routine.total_exercises,
    }


def _extract_reps_target_value(reps_target: str | None) -> Optional[int]:
    if not reps_target:
        return None
    text = reps_target.strip().lower()
    match = re.search(r"\d+", text)
    if not match:
        return None
    value = int(match.group(0))
    if "min" in text:
        return value * 60
    return value


def _exercise_plan_entry(plan_payload: dict, day_number: int, exercise_order: int) -> Optional[dict]:
    days = plan_payload.get("days") or []
    for day in days:
        if int(day.get("day_number", 0) or 0) != day_number:
            continue
        exercises = day.get("exercises") or []
        if 1 <= exercise_order <= len(exercises):
            return exercises[exercise_order - 1] or {}
    return None


def _exercise_rest_seconds(plan_payload: dict, day_number: int, exercise_order: int) -> Optional[int]:
    exercise = _exercise_plan_entry(plan_payload, day_number, exercise_order)
    if exercise is None:
        return None
    return exercise.get("rest_seconds")


def _exercise_mode_from_plan(plan_payload: dict, day_number: int, exercise_order: int) -> str:
    exercise = _exercise_plan_entry(plan_payload, day_number, exercise_order)
    if exercise is None:
        return "reps"

    explicit_mode = exercise.get("mode")
    if explicit_mode in {"reps", "timer", "hold"}:
        return explicit_mode

    text = " ".join(
        part for part in [
            str(exercise.get("name", "")),
            str(exercise.get("muscle_group", "")),
            str(exercise.get("reps", "")),
            str(exercise.get("notes", "")),
        ] if part
    ).lower()
    if any(token in text for token in ("seg", "min", "plank", "plancha", "sprint", "cardio", "marcha", "caminata", "bici", "movilidad", "hiit")):
        return "timer"
    if "hold" in text or "isometr" in text:
        return "hold"
    return "reps"


def _exercise_to_payload(exercise: TrainingExerciseProgress, rest_seconds: Optional[int] = None, mode: str = "reps") -> dict:
    current_set = exercise.sets_target if exercise.status == "completed" else min(exercise.sets_completed + 1, exercise.sets_target)
    return {
        "id": exercise.id,
        "exercise_id": exercise.id,
        "exercise_order": exercise.exercise_order,
        "exercise_name": exercise.exercise_name,
        "sets_target": exercise.sets_target,
        "reps_target": exercise.reps_target,
        "reps_target_value": exercise.reps_target_value,
        "sets_completed": exercise.sets_completed,
        "reps_completed_current_set": exercise.reps_completed_current_set,
        "current_set": current_set,
        "rest_seconds": rest_seconds,
        "mode": mode,
        "status": exercise.status,
        "started_at": exercise.started_at,
        "completed_at": exercise.completed_at,
    }


def _day_to_payload(
    selection: TrainingPlanSelection,
    routine: TrainingRoutineProgress,
    exercises: list[TrainingExerciseProgress],
) -> dict:
    current_exercise = _resolve_current_exercise(exercises)
    summary = _build_session_summary(routine, exercises)
    plan_payload = selection.plan_payload or {}
    return {
        **_routine_to_payload(routine),
        "day_id": routine.day_number,
        "routine_id": routine.id,
        "plan_day_number": routine.day_number,
        "completed_exercises_count": summary["completed_exercises"],
        "total_exercises": summary["total_exercises"],
        "total_sets_target": summary["total_sets"],
        "total_sets_completed": summary["completed_sets"],
        "total_reps_completed": summary["total_reps"],
        "progress_pct": summary["progress_pct"],
        "current_exercise": (
            _exercise_to_payload(
                current_exercise,
                _exercise_rest_seconds(plan_payload, routine.day_number, current_exercise.exercise_order),
                _exercise_mode_from_plan(plan_payload, routine.day_number, current_exercise.exercise_order),
            )
            if current_exercise
            else None
        ),
        "exercises": [
            _exercise_to_payload(
                exercise,
                _exercise_rest_seconds(plan_payload, routine.day_number, exercise.exercise_order),
                _exercise_mode_from_plan(plan_payload, routine.day_number, exercise.exercise_order),
            )
            for exercise in exercises
        ],
        "session_summary": summary,
    }


def _exercise_total_reps_completed(exercise: TrainingExerciseProgress) -> int:
    reps_target = exercise.reps_target_value or 0
    completed_sets = min(exercise.sets_completed or 0, exercise.sets_target or 0)
    current_reps = max(0, exercise.reps_completed_current_set or 0)
    return (completed_sets * reps_target) + current_reps


def _exercise_mode_from_progress(exercise: TrainingExerciseProgress) -> str:
    text = " ".join(
        part for part in [exercise.exercise_name, exercise.reps_target] if part
    ).lower()
    if any(token in text for token in ("seg", "min", "plank", "plancha", "sprint", "cardio", "marcha", "caminata", "bici", "movilidad", "hiit")):
        return "timer"
    if "hold" in text or "isometr" in text:
        return "hold"
    return "reps"


def _build_session_summary(
    routine: TrainingRoutineProgress,
    exercises: list[TrainingExerciseProgress],
) -> dict:
    total_exercises = len(exercises)
    completed_exercises = sum(1 for exercise in exercises if exercise.status == "completed")
    time_based_exercises = sum(1 for exercise in exercises if _exercise_mode_from_progress(exercise) == "timer")
    total_sets = sum(exercise.sets_target or 0 for exercise in exercises)
    completed_sets = sum(min(exercise.sets_completed or 0, exercise.sets_target or 0) for exercise in exercises)
    total_reps = sum(_exercise_total_reps_completed(exercise) for exercise in exercises)
    total_time_seconds = sum(
        (exercise.sets_target or 0) * (exercise.reps_target_value or 0)
        for exercise in exercises
        if _exercise_mode_from_progress(exercise) == "timer"
    )
    completed_time_seconds = sum(
        _exercise_total_reps_completed(exercise)
        for exercise in exercises
        if _exercise_mode_from_progress(exercise) == "timer"
    )
    progress_pct = round((completed_exercises / max(1, total_exercises)) * 100, 1)
    started_at = routine.started_at
    completed_at = routine.completed_at
    duration_seconds = None
    if started_at and completed_at:
        duration_seconds = max(0, int((completed_at - started_at).total_seconds()))

    return {
        "day_completed": routine.status == "completed",
        "day_number": routine.day_number,
        "day_name": routine.day_name,
        "total_exercises": total_exercises,
        "completed_exercises": completed_exercises,
        "time_based_exercises": time_based_exercises,
        "total_sets": total_sets,
        "completed_sets": completed_sets,
        "total_reps": total_reps,
        "total_time_seconds": total_time_seconds,
        "completed_time_seconds": completed_time_seconds,
        "progress_pct": progress_pct,
        "started_at": started_at,
        "completed_at": completed_at,
        "duration_seconds": duration_seconds,
    }


def _event_exists(
    db: Session,
    user: User,
    day_number: int,
    event_type: str,
    client_event_id: Optional[UUID],
) -> bool:
    if client_event_id is None:
        return False

    return (
        db.query(TrainingExerciseEvent.id)
        .filter(
            TrainingExerciseEvent.user_id == user.id,
            TrainingExerciseEvent.day_number == day_number,
            TrainingExerciseEvent.event_type == event_type,
            TrainingExerciseEvent.client_event_id == client_event_id,
        )
        .first()
        is not None
    )


def _register_event(
    db: Session,
    selection: TrainingPlanSelection,
    routine: TrainingRoutineProgress,
    exercise: TrainingExerciseProgress,
    user: User,
    event_type: str,
    client_event_id: Optional[UUID] = None,
    reps_delta: Optional[int] = None,
    sets_delta: Optional[int] = None,
    payload: Optional[dict] = None,
) -> bool:
    if _event_exists(db, user, routine.day_number, event_type, client_event_id):
        return False

    db.add(
        TrainingExerciseEvent(
            training_plan_id=selection.id,
            training_routine_id=routine.id,
            training_exercise_id=exercise.id,
            user_id=user.id,
            day_number=routine.day_number,
            event_type=event_type,
            client_event_id=client_event_id,
            reps_delta=reps_delta,
            sets_delta=sets_delta,
            payload=payload or {},
        )
    )
    return True


def _get_day_routine(db: Session, selection_id: int, day_number: int) -> Optional[TrainingRoutineProgress]:
    return (
        db.query(TrainingRoutineProgress)
        .filter(
            TrainingRoutineProgress.training_plan_id == selection_id,
            TrainingRoutineProgress.day_number == day_number,
        )
        .first()
    )


def _get_day_exercises(
    db: Session,
    selection_id: int,
    day_number: int,
) -> list[TrainingExerciseProgress]:
    return (
        db.query(TrainingExerciseProgress)
        .filter(
            TrainingExerciseProgress.training_plan_id == selection_id,
            TrainingExerciseProgress.day_number == day_number,
        )
        .order_by(TrainingExerciseProgress.exercise_order.asc())
        .all()
    )


def _resolve_current_exercise(
    exercises: list[TrainingExerciseProgress],
) -> Optional[TrainingExerciseProgress]:
    for status_name in ("in_progress", "pending"):
        for exercise in exercises:
            if exercise.status == status_name:
                return exercise
    return exercises[-1] if exercises else None


def _get_active_selection(db: Session, user_id) -> Optional[TrainingPlanSelection]:
    return (
        db.query(TrainingPlanSelection)
        .filter(
            TrainingPlanSelection.user_id == user_id,
        )
        .first()
    )


def _get_routines_for_selection(
    db: Session,
    selection_id: int,
) -> list[TrainingRoutineProgress]:
    return (
        db.query(TrainingRoutineProgress)
        .filter(TrainingRoutineProgress.training_plan_id == selection_id)
        .order_by(TrainingRoutineProgress.day_number.asc())
        .all()
    )


def _resolve_current_routine(routines: list[TrainingRoutineProgress]) -> Optional[TrainingRoutineProgress]:
    for status_name in ("in_progress", "pending"):
        for routine in routines:
            if routine.status == status_name:
                return routine
    return routines[-1] if routines else None


def select_training_plan(
    db: Session,
    user: User,
    plan_variant: str,
    frequency: str,
) -> TrainingPlanSelection:
    if not user.goal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes configurar tu meta en el perfil antes de seleccionar un plan.",
        )

    normalized_variant = _validate_variant(plan_variant)
    normalized_frequency = _validate_frequency(frequency)

    plans = build_plans(
        goal=user.goal,
        frequency=normalized_frequency,
        weight_kg=user.weight_kg,
        height_cm=user.height_cm,
        nivel_actividad=getattr(user, "nivel_actividad", None),
        edad=getattr(user, "edad", None),
        sexo=getattr(user, "sexo", None),
    )

    selected_plan = plans["variantes"][normalized_variant]
    selection = _get_active_selection(db, user.id)

    if selection is None:
        selection = TrainingPlanSelection(
            user_id=user.id,
            plan_variant=normalized_variant,
            frequency=normalized_frequency,
            goal=user.goal,
            plan_payload=selected_plan.model_dump(mode="json"),
            is_active=True,
            selected_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(selection)
        db.flush()
    else:
        db.query(TrainingExerciseProgress).filter(
            TrainingExerciseProgress.training_plan_id == selection.id
        ).delete(synchronize_session=False)
        db.query(TrainingRoutineProgress).filter(
            TrainingRoutineProgress.training_plan_id == selection.id
        ).delete(synchronize_session=False)
        selection.plan_variant = normalized_variant
        selection.frequency = normalized_frequency
        selection.goal = user.goal
        selection.plan_payload = selected_plan.model_dump(mode="json")
        selection.is_active = True
        selection.selected_at = datetime.utcnow()
        selection.updated_at = datetime.utcnow()

    for day in selected_plan.days:
        routine = TrainingRoutineProgress(
            training_plan_id=selection.id,
            user_id=user.id,
            day_number=day.day_number,
            day_name=day.day_name,
            status="pending",
            total_exercises=len(day.exercises),
        )
        db.add(routine)
        db.flush()

        for exercise_index, exercise in enumerate(day.exercises, start=1):
            db.add(
                TrainingExerciseProgress(
                    training_plan_id=selection.id,
                    training_routine_id=routine.id,
                    user_id=user.id,
                    day_number=day.day_number,
                    exercise_order=exercise_index,
                    exercise_name=exercise.name,
                    sets_target=exercise.sets,
                    reps_target=exercise.reps,
                    reps_target_value=_extract_reps_target_value(exercise.reps),
                    sets_completed=0,
                    reps_completed_current_set=0,
                    status="pending",
                )
            )

    db.commit()
    db.refresh(selection)
    return selection


def get_active_training_plan(db: Session, user: User) -> Optional[TrainingPlanSelection]:
    selection = _get_active_selection(db, user.id)
    if selection is None or not selection.is_active:
        return None
    return selection


def build_current_plan_response(db: Session, user: User) -> dict:
    selection = get_active_training_plan(db, user)
    if selection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan activo seleccionado.",
        )

    routines = _get_routines_for_selection(db, selection.id)
    current_routine = _resolve_current_routine(routines)
    current_day_payload = None
    if current_routine:
        exercises = _get_day_exercises(db, selection.id, current_routine.day_number)
        current_day_payload = _day_to_payload(selection, current_routine, exercises)

    return {
        "plan": {
            "id": selection.id,
            "plan_variant": selection.plan_variant,
            "frequency": selection.frequency,
            "goal": selection.goal,
            "is_active": selection.is_active,
            "selected_at": selection.selected_at,
            "updated_at": selection.updated_at,
            "plan": _plan_from_selection(selection),
        },
        "current_day": current_day_payload,
    }


def build_routines_progress_response(db: Session, user: User) -> dict:
    selection = get_active_training_plan(db, user)
    if selection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan activo seleccionado.",
        )

    routines = _get_routines_for_selection(db, selection.id)
    current_routine = _resolve_current_routine(routines)
    routines_payload = []
    for routine in routines:
        exercises = _get_day_exercises(db, selection.id, routine.day_number)
        routines_payload.append(_day_to_payload(selection, routine, exercises))

    return {
        "plan_id": selection.id,
        "plan_variant": selection.plan_variant,
        "frequency": selection.frequency,
        "routines": routines_payload,
        "current_day": _day_to_payload(
            selection,
            current_routine,
            _get_day_exercises(db, selection.id, current_routine.day_number),
        ) if current_routine else None,
    }


def build_day_progress_response(db: Session, user: User, day_number: int) -> dict:
    selection = get_active_training_plan(db, user)
    if selection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan activo seleccionado.",
        )

    routine = _get_day_routine(db, selection.id, day_number)
    if routine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rutina no encontrada para el dÃ­a solicitado.",
        )

    exercises = _get_day_exercises(db, selection.id, day_number)
    return _day_to_payload(selection, routine, exercises)


def start_routine_day(
    db: Session,
    user: User,
    day_number: int,
    client_event_id: Optional[UUID] = None,
) -> TrainingRoutineProgress:
    selection = get_active_training_plan(db, user)
    if selection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan activo seleccionado.",
        )

    routine = (
        db.query(TrainingRoutineProgress)
        .filter(
            TrainingRoutineProgress.training_plan_id == selection.id,
            TrainingRoutineProgress.day_number == day_number,
        )
        .first()
    )
    if routine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rutina no encontrada para el dÃ­a solicitado.",
        )
    if routine.status == "completed":
        return routine

    if _event_exists(db, user, day_number, "routine_start", client_event_id):
        return routine

    if routine.status != "in_progress":
        routine.status = "in_progress"
        routine.started_at = routine.started_at or datetime.utcnow()
        routine.updated_at = datetime.utcnow()
    exercises = _get_day_exercises(db, selection.id, day_number)
    first_exercise = _resolve_current_exercise(exercises)
    if first_exercise and first_exercise.status == "pending":
        first_exercise.status = "in_progress"
        first_exercise.started_at = first_exercise.started_at or datetime.utcnow()
        first_exercise.updated_at = datetime.utcnow()
    if first_exercise is not None:
        _register_event(
            db=db,
            selection=selection,
            routine=routine,
            exercise=first_exercise,
            user=user,
            event_type="routine_start",
            client_event_id=client_event_id,
            payload={"day_number": day_number},
        )
    db.commit()
    db.refresh(routine)
    return routine


def _advance_to_next_exercise(
    db: Session,
    selection: TrainingPlanSelection,
    day_number: int,
) -> Optional[TrainingExerciseProgress]:
    exercises = _get_day_exercises(db, selection.id, day_number)
    next_exercise = None
    found_current = False
    for exercise in exercises:
        if exercise.status == "in_progress":
            found_current = True
            continue
        if found_current and exercise.status == "pending":
            next_exercise = exercise
            break
    if next_exercise:
        next_exercise.status = "in_progress"
        next_exercise.started_at = next_exercise.started_at or datetime.utcnow()
        next_exercise.updated_at = datetime.utcnow()
        db.flush()
    return next_exercise


def _finalize_day_if_needed(
    db: Session,
    routine: TrainingRoutineProgress,
    exercises: list[TrainingExerciseProgress],
) -> None:
    if exercises and all(exercise.status == "completed" for exercise in exercises):
        routine.status = "completed"
        routine.completed_at = routine.completed_at or datetime.utcnow()
        routine.completed_exercises_count = len(exercises)
        routine.total_exercises = len(exercises)
        routine.updated_at = datetime.utcnow()


def add_reps_to_current_exercise(
    db: Session,
    user: User,
    day_number: int,
    reps_count: int,
    client_event_id: Optional[UUID] = None,
) -> TrainingExerciseProgress:
    selection = get_active_training_plan(db, user)
    if selection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan activo seleccionado.",
        )

    routine = _get_day_routine(db, selection.id, day_number)
    if routine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rutina no encontrada para el dÃ­a solicitado.",
        )

    exercises = _get_day_exercises(db, selection.id, day_number)
    current_exercise = _resolve_current_exercise(exercises)
    if current_exercise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ejercicio activo para esta rutina.",
        )
    if _event_exists(db, user, day_number, "rep", client_event_id):
        return current_exercise
    if current_exercise.status == "completed":
        return current_exercise

    if routine.status != "in_progress":
        routine.status = "in_progress"
        routine.started_at = routine.started_at or datetime.utcnow()

    if current_exercise.status == "pending":
        current_exercise.status = "in_progress"
        current_exercise.started_at = current_exercise.started_at or datetime.utcnow()

    current_exercise.reps_completed_current_set += reps_count
    current_exercise.updated_at = datetime.utcnow()
    routine.updated_at = datetime.utcnow()
    _register_event(
        db=db,
        selection=selection,
        routine=routine,
        exercise=current_exercise,
        user=user,
        event_type="rep",
        client_event_id=client_event_id,
        reps_delta=reps_count,
        payload={"day_number": day_number, "reps_count": reps_count},
    )

    db.commit()
    db.refresh(current_exercise)
    return current_exercise


def complete_current_set(
    db: Session,
    user: User,
    day_number: int,
    exercise_id: Optional[int] = None,
    exercise_name: Optional[str] = None,
    exercise_mode: Optional[str] = None,
    tracking_mode: Optional[str] = None,
    current_set: Optional[int] = None,
    sets_target: Optional[int] = None,
    reps_completed_current_set: Optional[int] = None,
    reps_target_value: Optional[int] = None,
    duration_seconds: Optional[int] = None,
    seconds_elapsed: Optional[int] = None,
    client_event_id: Optional[UUID] = None,
) -> dict:
    selection = get_active_training_plan(db, user)
    if selection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan activo seleccionado.",
        )

    routine = _get_day_routine(db, selection.id, day_number)
    if routine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rutina no encontrada para el dÃ­a solicitado.",
        )

    exercises = _get_day_exercises(db, selection.id, day_number)
    current_exercise = _resolve_current_exercise(exercises)
    if current_exercise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ejercicio activo para esta rutina.",
        )
    if exercise_id is not None and current_exercise.id != exercise_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El exercise_id enviado no coincide con el ejercicio actual.",
        )
    if exercise_name is not None and current_exercise.exercise_name != exercise_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El exercise_name enviado no coincide con el ejercicio actual.",
        )
    if _event_exists(db, user, day_number, "set_complete", client_event_id):
        return {
            "routine": routine,
            "current_exercise": current_exercise,
            "exercises": exercises,
        }
    if current_exercise.status == "completed":
        return {
            "routine": routine,
            "current_exercise": current_exercise,
            "exercises": exercises,
        }

    if current_exercise.reps_target_value is not None and current_exercise.reps_completed_current_set < current_exercise.reps_target_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AÃºn no se completÃ³ el objetivo de reps de la serie actual.",
        )

    if routine.status != "in_progress":
        routine.status = "in_progress"
        routine.started_at = routine.started_at or datetime.utcnow()
    if current_exercise.status == "pending":
        current_exercise.status = "in_progress"
        current_exercise.started_at = current_exercise.started_at or datetime.utcnow()

    current_exercise.sets_completed += 1
    current_exercise.reps_completed_current_set = 0
    current_exercise.updated_at = datetime.utcnow()

    if current_exercise.sets_completed >= current_exercise.sets_target:
        current_exercise.status = "completed"
        current_exercise.completed_at = datetime.utcnow()
        current_exercise.updated_at = datetime.utcnow()
        next_exercise = _advance_to_next_exercise(db, selection, day_number)
        if next_exercise is None:
            _finalize_day_if_needed(db, routine, exercises)
    else:
        current_exercise.status = "in_progress"

    routine.completed_exercises_count = sum(1 for exercise in exercises if exercise.status == "completed")
    routine.total_exercises = len(exercises)
    routine.updated_at = datetime.utcnow()
    _register_event(
        db=db,
        selection=selection,
        routine=routine,
        exercise=current_exercise,
        user=user,
        event_type="set_complete",
        client_event_id=client_event_id,
        sets_delta=1,
        payload={
            "day_number": day_number,
            "exercise_id": exercise_id,
            "exercise_name": exercise_name,
            "exercise_mode": exercise_mode,
            "tracking_mode": tracking_mode,
            "current_set": current_set,
            "sets_target": sets_target,
            "reps_completed_current_set": reps_completed_current_set,
            "reps_target_value": reps_target_value,
            "duration_seconds": duration_seconds,
            "seconds_elapsed": seconds_elapsed,
        },
    )

    db.commit()
    db.refresh(current_exercise)
    db.refresh(routine)

    return {
        "routine": routine,
        "current_exercise": current_exercise,
        "exercises": exercises,
    }


def complete_routine_day(
    db: Session,
    user: User,
    day_number: int,
    completed_exercises_count: Optional[int] = None,
    total_exercises: Optional[int] = None,
    force: bool = False,
    client_event_id: Optional[UUID] = None,
) -> TrainingRoutineProgress:
    selection = get_active_training_plan(db, user)
    if selection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan activo seleccionado.",
        )

    routine = (
        db.query(TrainingRoutineProgress)
        .filter(
            TrainingRoutineProgress.training_plan_id == selection.id,
            TrainingRoutineProgress.day_number == day_number,
        )
        .first()
    )
    if routine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rutina no encontrada para el dÃ­a solicitado.",
        )
    if _event_exists(db, user, day_number, "routine_complete", client_event_id):
        return routine
    if routine.status == "completed":
        return routine

    exercises = _get_day_exercises(db, selection.id, day_number)
    if not exercises:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontraron ejercicios para este dÃ­a.",
        )

    if not force and not all(exercise.status == "completed" for exercise in exercises):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TodavÃ­a quedan ejercicios pendientes en este dÃ­a.",
        )

    routine.status = "completed"
    routine.started_at = routine.started_at or datetime.utcnow()
    routine.completed_at = routine.completed_at or datetime.utcnow()
    routine.completed_exercises_count = (
        completed_exercises_count
        if completed_exercises_count is not None
        else len(exercises)
    )
    routine.total_exercises = total_exercises if total_exercises is not None else len(exercises)
    routine.updated_at = datetime.utcnow()
    _register_event(
        db=db,
        selection=selection,
        routine=routine,
        exercise=_resolve_current_exercise(exercises) or exercises[-1],
        user=user,
        event_type="routine_complete",
        client_event_id=client_event_id,
        payload={
            "day_number": day_number,
            "completed_exercises_count": routine.completed_exercises_count,
            "total_exercises": routine.total_exercises,
        },
    )
    db.commit()
    db.refresh(routine)
    return routine

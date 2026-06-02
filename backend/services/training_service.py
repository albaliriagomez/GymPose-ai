"""
training_service.py — GymPose
Genera 3 variantes de plan (A / B / C) por meta y frecuencia.
Integra Groq para recomendar la variante más adecuada al perfil del usuario.

Reps de referencia (estándar deportivo):
  Fuerza          → 1-5 reps
  Hipertrofia     → 6-12 reps  (nunca 15+ en ejercicios principales)
  Resistencia     → 15-20 reps
  Circuito metab. → 12-15 reps o tiempo (20-40 seg)

Ejercicios detectables por MediaPipe en Training.jsx:
  ✓ Sentadilla con Barra / Sentadilla al Cajón / Sentadilla con Salto
  ✓ Flexiones de Pecho / Flexiones en Pared o Rodillas
  ✓ Curl de Bíceps con Barra / Curl Martillo
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

# ─────────────────────────────────────────────────────────────────────────────
#  CONSTANTE: qué ejercicios detecta MediaPipe hoy
# ─────────────────────────────────────────────────────────────────────────────
DETECTABLE_EXERCISES = {
    "Sentadilla con Barra",
    "Sentadilla al Cajón",
    "Sentadilla con Salto",
    "Flexiones de Pecho",
    "Flexiones en Pared o Rodillas",
    "Curl de Bíceps con Barra",
    "Curl Martillo",
}

def _mark_detectable(ex: Exercise) -> Exercise:
    """Añade nota si el ejercicio es detectable en vivo por MediaPipe."""
    if ex.name in DETECTABLE_EXERCISES:
        tag = "⚡ Detectable en tiempo real con tu cámara"
        notes = f"{ex.notes} · {tag}" if ex.notes else tag
        return Exercise(
            name=ex.name, sets=ex.sets, reps=ex.reps,
            rest_seconds=ex.rest_seconds, muscle_group=ex.muscle_group,
            notes=notes,
        )
    return ex

def _mark_list(exercises: list[Exercise]) -> list[Exercise]:
    return [_mark_detectable(e) for e in exercises]


# ─────────────────────────────────────────────────────────────────────────────
#  BIBLIOTECA DE EJERCICIOS
#  Reps revisadas: hipertrofia = 6-12, circuito = 12-15 o tiempo
# ─────────────────────────────────────────────────────────────────────────────

# ── HIPERTROFIA ──────────────────────────────────────────────────────────────

HYPERTROPHY_PUSH_A = [
    Exercise(name="Press de Banca con Barra",       sets=4, reps="6-8",   rest_seconds=120, muscle_group="Pecho",             notes="Escápulas retraídas. Peso máximo controlable."),
    Exercise(name="Press Inclinado con Mancuernas", sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Pecho Superior",    notes="Ángulo 30-45°"),
    Exercise(name="Press Militar con Barra",        sets=4, reps="6-8",   rest_seconds=120, muscle_group="Hombros",           notes="Core apretado, no arquees la espalda"),
    Exercise(name="Elevaciones Laterales",          sets=3, reps="10-12", rest_seconds=60,  muscle_group="Deltoides Lateral", notes="Codos ligeramente flexionados"),
    Exercise(name="Fondos en Paralelas",            sets=3, reps="8-10",  rest_seconds=90,  muscle_group="Tríceps/Pecho",     notes="Inclínate al frente para activar pecho"),
    Exercise(name="Extensión de Tríceps en Polea",  sets=3, reps="10-12", rest_seconds=60,  muscle_group="Tríceps",           notes="Codos pegados al cuerpo"),
]

HYPERTROPHY_PUSH_B = [
    Exercise(name="Flexiones de Pecho",             sets=5, reps="6-10",  rest_seconds=90,  muscle_group="Pecho/Tríceps",     notes="Agrega peso en chaleco si es fácil. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Press de Hombros con Mancuernas",sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Hombros",           notes="Movimiento controlado en la bajada"),
    Exercise(name="Press Declinado con Barra",      sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Pecho Inferior",    notes="Pies asegurados en el banco"),
    Exercise(name="Elevaciones Frontales",          sets=3, reps="10-12", rest_seconds=60,  muscle_group="Deltoides Anterior",notes="Alterna brazos para mayor control"),
    Exercise(name="Patada de Tríceps",              sets=3, reps="10-12", rest_seconds=60,  muscle_group="Tríceps",           notes="Codo fijo, solo mueve el antebrazo"),
    Exercise(name="Aperturas con Mancuernas",       sets=3, reps="10-12", rest_seconds=75,  muscle_group="Pecho",             notes="Leve flexión en codo, estiramiento controlado"),
]

HYPERTROPHY_PUSH_C = [
    Exercise(name="Press de Banca con Mancuernas",  sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Pecho",             notes="Mayor rango de movimiento que con barra"),
    Exercise(name="Press Arnold",                   sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Hombros (360°)",    notes="Rotación completa del hombro"),
    Exercise(name="Cruce de Poleas (Cable Fly)",    sets=3, reps="10-12", rest_seconds=60,  muscle_group="Pecho",             notes="Contrae el pecho al centro"),
    Exercise(name="Fondos en Paralelas",            sets=3, reps="8-10",  rest_seconds=90,  muscle_group="Tríceps/Pecho",     notes="Peso corporal o añade lastre"),
    Exercise(name="Press Francés (Skullcrusher)",   sets=3, reps="8-10",  rest_seconds=75,  muscle_group="Tríceps",           notes="Baja la barra hasta la frente con control"),
    Exercise(name="Elevaciones Laterales en Polea", sets=3, reps="12",    rest_seconds=60,  muscle_group="Deltoides Lateral", notes="Tensión constante en toda la trayectoria"),
]

HYPERTROPHY_PULL_A = [
    Exercise(name="Dominadas o Jalón al Pecho",     sets=4, reps="6-8",   rest_seconds=120, muscle_group="Dorsal",            notes="Pecho al frente, retrae escápulas al bajar"),
    Exercise(name="Remo con Barra",                 sets=4, reps="6-8",   rest_seconds=120, muscle_group="Espalda Media",     notes="Espalda neutra, tirón al ombligo"),
    Exercise(name="Remo con Mancuerna",             sets=3, reps="8-10",  rest_seconds=75,  muscle_group="Dorsal",            notes="Apoya la rodilla libre en el banco"),
    Exercise(name="Curl de Bíceps con Barra",       sets=4, reps="8-10",  rest_seconds=75,  muscle_group="Bíceps",            notes="Sin balanceo de torso. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Curl Martillo",                  sets=3, reps="10-12", rest_seconds=60,  muscle_group="Braquial",          notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Face Pulls",                     sets=3, reps="12",    rest_seconds=60,  muscle_group="Deltoides Posterior",notes="Cuerda a nivel de ojos, codos altos"),
]

HYPERTROPHY_PULL_B = [
    Exercise(name="Jalón al Pecho Agarre Cerrado",  sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Dorsal",            notes="Agarre supino, codos hacia las caderas"),
    Exercise(name="Remo en Polea Baja",             sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Espalda Media",     notes="Tira hacia el abdomen, no levantes los codos"),
    Exercise(name="Pull-Over con Mancuerna",        sets=3, reps="10-12", rest_seconds=75,  muscle_group="Dorsal/Serrato",    notes="Estiramiento completo sobre el banco"),
    Exercise(name="Curl Concentrado",               sets=3, reps="10-12", rest_seconds=60,  muscle_group="Bíceps",            notes="Codo apoyado en muslo, contracción máxima"),
    Exercise(name="Curl de Bíceps en Polea",        sets=3, reps="10-12", rest_seconds=60,  muscle_group="Bíceps",            notes="Tensión constante todo el recorrido"),
    Exercise(name="Remo Invertido en Barra",        sets=3, reps="8-10",  rest_seconds=75,  muscle_group="Espalda/Bíceps",    notes="Cuerpo recto como tabla"),
]

HYPERTROPHY_PULL_C = [
    Exercise(name="Dominadas Supinas",              sets=4, reps="6-8",   rest_seconds=120, muscle_group="Bíceps/Dorsal",     notes="Agarre supino activa más el bíceps"),
    Exercise(name="Remo con Barra T",               sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Espalda Media",     notes="Pecho apoyado en el pad"),
    Exercise(name="Jalón al Pecho Agarre Ancho",    sets=3, reps="8-10",  rest_seconds=90,  muscle_group="Dorsal",            notes="Agarre 1.5x ancho de hombros"),
    Exercise(name="Curl Martillo con Cable",        sets=3, reps="10-12", rest_seconds=60,  muscle_group="Braquial",          notes="Tensión constante en toda la trayectoria"),
    Exercise(name="Curl Araña (Spider Curl)",       sets=3, reps="8-10",  rest_seconds=60,  muscle_group="Bíceps",            notes="Pecho apoyado en banco inclinado 45°"),
    Exercise(name="Encogimientos de Hombros",       sets=4, reps="10-12", rest_seconds=60,  muscle_group="Trapecio",          notes="Sostén arriba 1 segundo"),
]

HYPERTROPHY_LEGS_A = [
    Exercise(name="Sentadilla con Barra",           sets=4, reps="6-8",   rest_seconds=180, muscle_group="Cuádriceps/Glúteos",notes="Profundidad paralela. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Prensa de Piernas",              sets=4, reps="8-10",  rest_seconds=120, muscle_group="Cuádriceps",        notes="Pies a la anchura de caderas"),
    Exercise(name="Peso Muerto Rumano",             sets=3, reps="8-10",  rest_seconds=120, muscle_group="Isquiotibiales",    notes="Espalda neutra, empuja caderas atrás"),
    Exercise(name="Extensión de Cuádriceps",        sets=3, reps="10-12", rest_seconds=75,  muscle_group="Cuádriceps",        notes="Contracción máxima arriba, baja lento"),
    Exercise(name="Curl Femoral Tumbado",           sets=3, reps="10-12", rest_seconds=75,  muscle_group="Isquiotibiales",    notes="Caderas pegadas al banco"),
    Exercise(name="Elevaciones de Gemelos de Pie",  sets=5, reps="10-12", rest_seconds=60,  muscle_group="Gemelos",           notes="Pausa 2 seg arriba, baja completo"),
]

HYPERTROPHY_LEGS_B = [
    Exercise(name="Sentadilla Frontal",             sets=4, reps="6-8",   rest_seconds=150, muscle_group="Cuádriceps",        notes="Mayor activación de cuád que sentadilla trasera"),
    Exercise(name="Peso Muerto Convencional",       sets=4, reps="6-8",   rest_seconds=180, muscle_group="Cadena Posterior",  notes="El ejercicio más completo para fuerza total"),
    Exercise(name="Zancadas con Mancuernas",        sets=3, reps="8-10 c/lado", rest_seconds=90, muscle_group="Glúteos/Cuádriceps", notes="Rodilla trasera casi toca el suelo"),
    Exercise(name="Hip Thrust con Barra",           sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Glúteos",           notes="Empuje pélvico completo, aprieta arriba"),
    Exercise(name="Curl Femoral de Pie",            sets=3, reps="10-12", rest_seconds=75,  muscle_group="Isquiotibiales",    notes="Control en la bajada"),
    Exercise(name="Elevaciones de Gemelos Sentado", sets=4, reps="10-12", rest_seconds=60,  muscle_group="Sóleo",             notes="Ángulo diferente al de pie"),
]

HYPERTROPHY_LEGS_C = [
    Exercise(name="Sentadilla Búlgara",             sets=4, reps="8-10 c/lado", rest_seconds=120, muscle_group="Cuádriceps/Glúteos", notes="Pie trasero elevado, torso erguido"),
    Exercise(name="Peso Muerto Sumo",               sets=4, reps="6-8",   rest_seconds=150, muscle_group="Glúteos/Abductores",notes="Pies girados 45°, agarre neutro"),
    Exercise(name="Prensa 45° Pie Alto",            sets=4, reps="8-10",  rest_seconds=120, muscle_group="Glúteos/Isquios",   notes="Pies altos en la plataforma"),
    Exercise(name="Curl Femoral Sentado",           sets=3, reps="10-12", rest_seconds=75,  muscle_group="Isquiotibiales",    notes="Rango completo de movimiento"),
    Exercise(name="Abducción de Cadera en Polea",   sets=3, reps="12",    rest_seconds=60,  muscle_group="Abductores/Glúteos",notes="Control total, sin balanceo"),
    Exercise(name="Calf Raise en Leg Press",        sets=4, reps="12",    rest_seconds=60,  muscle_group="Gemelos",           notes="Solo punta del pie en la plataforma"),
]

# ── PÉRDIDA DE GRASA ─────────────────────────────────────────────────────────

FAT_LOSS_CIRCUIT_A = [
    Exercise(name="Sentadilla con Salto",           sets=4, reps="12",    rest_seconds=30,  muscle_group="Piernas/Cardio",    notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Flexiones de Pecho",             sets=4, reps="12",    rest_seconds=30,  muscle_group="Pecho/Tríceps",     notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Peso Muerto con Mancuernas",     sets=4, reps="12",    rest_seconds=30,  muscle_group="Cadena Posterior",  notes="Espalda neutra en todo momento"),
    Exercise(name="Remo con Mancuerna",             sets=4, reps="12",    rest_seconds=30,  muscle_group="Espalda",           notes="Alterna brazos o bilateral"),
    Exercise(name="Mountain Climbers",              sets=4, reps="30 seg",rest_seconds=20,  muscle_group="Core/Cardio",       notes="Máxima velocidad manteniendo caderas bajas"),
    Exercise(name="Burpees",                        sets=3, reps="10",    rest_seconds=45,  muscle_group="Full Body",         notes="Pecho toca el suelo en cada rep"),
]

FAT_LOSS_CIRCUIT_B = [
    Exercise(name="Zancadas Alternadas con Salto",  sets=4, reps="10 c/lado", rest_seconds=30, muscle_group="Piernas/Glúteos", notes="Aterriza suave, rodilla a 90°"),
    Exercise(name="Press de Hombros con Mancuernas",sets=4, reps="12",    rest_seconds=30,  muscle_group="Hombros",           notes="Ritmo controlado en bajada"),
    Exercise(name="Hip Thrust con Peso Corporal",   sets=4, reps="15",    rest_seconds=30,  muscle_group="Glúteos",           notes="Aprieta glúteos 1 seg arriba"),
    Exercise(name="Remo Invertido en Barra",        sets=4, reps="12",    rest_seconds=30,  muscle_group="Espalda",           notes="Cuerpo recto"),
    Exercise(name="Plank con Rotación",             sets=3, reps="30 seg",rest_seconds=20,  muscle_group="Core",              notes="Caderas estables al rotar"),
    Exercise(name="Saltos en Caja (Step)",          sets=3, reps="10",    rest_seconds=45,  muscle_group="Piernas/Cardio",    notes="Aterriza con rodillas flexionadas"),
]

FAT_LOSS_CIRCUIT_C = [
    Exercise(name="Sentadilla con Barra (Moderado)",sets=4, reps="12",    rest_seconds=45,  muscle_group="Piernas",           notes="Peso moderado, ritmo constante. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Press de Banca con Barra",       sets=4, reps="10",    rest_seconds=45,  muscle_group="Pecho",             notes="Peso que permita completar todas las reps"),
    Exercise(name="Dominadas o Jalón al Pecho",     sets=4, reps="10",    rest_seconds=45,  muscle_group="Dorsal",            notes="Pausa 1 seg en contracción"),
    Exercise(name="Peso Muerto Rumano",             sets=3, reps="12",    rest_seconds=60,  muscle_group="Cadena Posterior",  notes="Mayor tiempo bajo tensión"),
    Exercise(name="Curl de Bíceps con Barra",       sets=3, reps="12",    rest_seconds=45,  muscle_group="Bíceps",            notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Sprint en Cinta o Intervalo",    sets=6, reps="30 seg",rest_seconds=30,  muscle_group="Cardio",            notes="Alterna 30 seg al 90% / 30 seg caminando"),
]

# Bajo impacto (Obesidad)
FAT_LOSS_LOW_IMPACT_A = [
    Exercise(name="Sentadilla al Cajón",            sets=3, reps="12",    rest_seconds=60,  muscle_group="Piernas/Glúteos",   notes="Usa silla como referencia de profundidad. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Flexiones en Pared o Rodillas",  sets=3, reps="12",    rest_seconds=60,  muscle_group="Pecho/Tríceps",     notes="Progresa a flexiones completas en 4-6 semanas. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Peso Muerto con Mancuernas",     sets=3, reps="12",    rest_seconds=60,  muscle_group="Cadena Posterior",  notes="Espalda neutra, sin curvar la lumbar"),
    Exercise(name="Remo con Banda o Mancuerna",     sets=3, reps="12",    rest_seconds=60,  muscle_group="Espalda",           notes="Retrae escápulas al final del movimiento"),
    Exercise(name="Marcha en Sitio Rodillas Altas", sets=3, reps="40 seg",rest_seconds=30,  muscle_group="Core/Cardio",       notes="Brazos activos para mayor gasto calórico"),
    Exercise(name="Plank en Rodillas",              sets=3, reps="30 seg",rest_seconds=45,  muscle_group="Core",              notes="Progresa a plank completo cuando puedas"),
]

FAT_LOSS_LOW_IMPACT_B = [
    Exercise(name="Estocadas Estáticas",            sets=3, reps="10 c/lado", rest_seconds=60, muscle_group="Piernas/Glúteos", notes="Sin salto, movimiento controlado"),
    Exercise(name="Press de Hombros Sentado",       sets=3, reps="12",    rest_seconds=60,  muscle_group="Hombros",           notes="Mancuernas livianas, forma perfecta"),
    Exercise(name="Hip Thrust en Suelo",            sets=3, reps="15",    rest_seconds=60,  muscle_group="Glúteos",           notes="Aprieta glúteos 2 seg en la cima"),
    Exercise(name="Remo Sentado con Banda",         sets=3, reps="15",    rest_seconds=60,  muscle_group="Espalda",           notes="Jala hacia el abdomen, no la cintura"),
    Exercise(name="Elevaciones de Talones Sentado", sets=3, reps="20",    rest_seconds=30,  muscle_group="Gemelos",           notes="Pausa en punta, baja completo"),
    Exercise(name="Caminata Activa o Bici Estática",sets=1, reps="20 min",rest_seconds=0,   muscle_group="Cardio",            notes="Zona 2: puedes mantener una conversación"),
]

FAT_LOSS_LOW_IMPACT_C = [
    Exercise(name="Sentadilla al Cajón (Con Mancuernas)", sets=3, reps="12", rest_seconds=60, muscle_group="Piernas/Glúteos", notes="Agrega carga progresiva cada semana. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Curl de Bíceps con Mancuernas", sets=3, reps="12",    rest_seconds=60,  muscle_group="Bíceps",            notes="Control total, sin balanceo. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Press de Pecho con Mancuernas en Suelo", sets=3, reps="12", rest_seconds=60, muscle_group="Pecho",        notes="Rango de movimiento seguro sin banco"),
    Exercise(name="Jalón con Banda al Pecho",       sets=3, reps="15",    rest_seconds=60,  muscle_group="Dorsal",            notes="Ancla la banda en algo alto y estable"),
    Exercise(name="Elevación de Talones de Pie",    sets=3, reps="20",    rest_seconds=30,  muscle_group="Gemelos",           notes="Apoyo con la mano para equilibrio"),
    Exercise(name="Caminata con Inclinación",       sets=1, reps="25 min",rest_seconds=0,   muscle_group="Cardio",            notes="3-5% inclinación, paso brioso"),
]

# ── MANTENIMIENTO ────────────────────────────────────────────────────────────

MAINTENANCE_FULL_A = [
    Exercise(name="Sentadilla con Barra",           sets=3, reps="10-12", rest_seconds=90,  muscle_group="Piernas",           notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Press de Banca",                 sets=3, reps="10-12", rest_seconds=90,  muscle_group="Pecho",             notes="Agarre a la anchura de hombros"),
    Exercise(name="Dominadas o Jalón",              sets=3, reps="8-10",  rest_seconds=90,  muscle_group="Espalda",           notes="Pausa 1 seg en contracción"),
    Exercise(name="Press Militar",                  sets=3, reps="10-12", rest_seconds=75,  muscle_group="Hombros",           notes="Core activo todo el tiempo"),
    Exercise(name="Curl de Bíceps con Barra",       sets=3, reps="10-12", rest_seconds=60,  muscle_group="Bíceps",            notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Extensión Tríceps en Polea",     sets=3, reps="10-12", rest_seconds=60,  muscle_group="Tríceps",           notes="Codos fijos al cuerpo"),
]

MAINTENANCE_FULL_B = [
    Exercise(name="Peso Muerto Convencional",       sets=3, reps="8-10",  rest_seconds=120, muscle_group="Cadena Posterior",  notes="Tirón del suelo, espalda neutra"),
    Exercise(name="Press Inclinado",                sets=3, reps="10-12", rest_seconds=90,  muscle_group="Pecho Superior",    notes="Ángulo 30-45°"),
    Exercise(name="Remo con Barra",                 sets=3, reps="10-12", rest_seconds=90,  muscle_group="Espalda",           notes="Codo 45° del torso"),
    Exercise(name="Elevaciones Laterales",          sets=3, reps="12",    rest_seconds=60,  muscle_group="Hombros",           notes="Muy lentas en la bajada"),
    Exercise(name="Zancadas con Mancuernas",        sets=3, reps="10 c/lado", rest_seconds=75, muscle_group="Piernas",        notes="Rodilla trasera 2 cm del suelo"),
    Exercise(name="Plank",                          sets=3, reps="45 seg",rest_seconds=45,  muscle_group="Core",              notes="Respira normal, no aguantes el aire"),
]

MAINTENANCE_FULL_C = [
    Exercise(name="Sentadilla con Mancuernas (Goblet)", sets=3, reps="12", rest_seconds=90, muscle_group="Piernas",          notes="Mancuerna al pecho, codos dentro. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Flexiones de Pecho",             sets=3, reps="12",    rest_seconds=75,  muscle_group="Pecho/Tríceps",     notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Remo con Mancuerna",             sets=3, reps="12",    rest_seconds=75,  muscle_group="Espalda",           notes="Apoya en banco para estabilidad"),
    Exercise(name="Curl Martillo",                  sets=3, reps="12",    rest_seconds=60,  muscle_group="Bíceps/Braquial",   notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Hip Thrust con Mancuerna",       sets=3, reps="12",    rest_seconds=75,  muscle_group="Glúteos",           notes="Contracción glútea 2 seg arriba"),
    Exercise(name="Plancha Lateral",                sets=3, reps="30 seg c/lado", rest_seconds=45, muscle_group="Core/Oblicuos", notes="Cadera arriba, cuerpo en línea recta"),
]

MAINTENANCE_UNDERWEIGHT_A = [
    Exercise(name="Sentadilla con Barra",           sets=4, reps="8-10",  rest_seconds=120, muscle_group="Piernas",           notes="Progresa el peso cada semana. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Press de Banca con Barra",       sets=4, reps="8-10",  rest_seconds=120, muscle_group="Pecho",             notes="Carga progresiva, no sacrifiques técnica"),
    Exercise(name="Dominadas o Jalón al Pecho",     sets=4, reps="8-10",  rest_seconds=120, muscle_group="Espalda",           notes="Añade peso si puedes hacer más de 10"),
    Exercise(name="Press Militar con Barra",        sets=3, reps="8-10",  rest_seconds=90,  muscle_group="Hombros",           notes="Empuje explosivo, bajada controlada"),
    Exercise(name="Curl de Bíceps con Barra",       sets=3, reps="10-12", rest_seconds=75,  muscle_group="Bíceps",            notes="⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Extensión de Tríceps en Polea",  sets=3, reps="10-12", rest_seconds=75,  muscle_group="Tríceps",           notes="Codos fijos"),
]

MAINTENANCE_UNDERWEIGHT_B = [
    Exercise(name="Peso Muerto Convencional",       sets=4, reps="6-8",   rest_seconds=150, muscle_group="Cadena Posterior",  notes="Ejercicio clave para ganar masa total"),
    Exercise(name="Press Inclinado con Mancuernas", sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Pecho Superior",    notes="Mayor activación del pectoral superior"),
    Exercise(name="Remo con Barra",                 sets=4, reps="8-10",  rest_seconds=120, muscle_group="Espalda Media",     notes="Peso creciente cada sesión"),
    Exercise(name="Elevaciones Laterales",          sets=3, reps="12",    rest_seconds=60,  muscle_group="Hombros",           notes="4 series si ya dominas el peso"),
    Exercise(name="Zancadas con Mancuernas",        sets=3, reps="10 c/lado", rest_seconds=90, muscle_group="Piernas",        notes="Añade peso cada 2 semanas"),
    Exercise(name="Curl Martillo",                  sets=3, reps="10-12", rest_seconds=60,  muscle_group="Braquial",          notes="⚡ Detectable en tiempo real con tu cámara"),
]

MAINTENANCE_UNDERWEIGHT_C = [
    Exercise(name="Sentadilla Frontal",             sets=4, reps="8-10",  rest_seconds=120, muscle_group="Cuádriceps",        notes="Mayor activación de cuádriceps. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Flexiones con Lastre",           sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Pecho/Tríceps",     notes="Usa mochila con peso o chaleco. ⚡ Detectable en tiempo real con tu cámara"),
    Exercise(name="Jalón Agarre Estrecho",          sets=4, reps="8-10",  rest_seconds=90,  muscle_group="Dorsal/Bíceps",     notes="Mayor contracción del dorsal"),
    Exercise(name="Hip Thrust con Barra",           sets=3, reps="10-12", rest_seconds=90,  muscle_group="Glúteos/Isquios",   notes="Carga progresiva semana a semana"),
    Exercise(name="Curl de Bíceps Predicador",      sets=3, reps="10-12", rest_seconds=75,  muscle_group="Bíceps",            notes="Codo en el pad, sin trampa"),
    Exercise(name="Press Francés con Barra EZ",     sets=3, reps="10-12", rest_seconds=75,  muscle_group="Tríceps",           notes="Baja a la frente con control total"),
]


# ─────────────────────────────────────────────────────────────────────────────
#  IMC
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
#  ADAPTACIÓN POR IMC
# ─────────────────────────────────────────────────────────────────────────────

def _adapt_exercise(ex: Exercise, imc_category: Optional[str]) -> Exercise:
    if imc_category is None:
        return ex

    sets = ex.sets
    rest = ex.rest_seconds
    notes = ex.notes or ""

    if imc_category == "Bajo peso":
        sets = min(sets + 1, 5)
        rest = min(rest + 30, 150)
        suffix = "Prioriza comer en superávit calórico (+300-500 kcal/día)."
        notes = f"{notes} · {suffix}" if notes else suffix

    elif imc_category == "Sobrepeso":
        rest = max(rest - 15, 20)
        suffix = "Descanso activo: marcha en sitio entre series."
        notes = f"{notes} · {suffix}" if notes else suffix

    elif imc_category == "Obesidad":
        sets = max(sets - 1, 2)
        rest = rest + 30
        suffix = "Rango de movimiento cómodo. Para si sientes dolor articular."
        notes = f"{notes} · {suffix}" if notes else suffix

    return Exercise(
        name=ex.name, sets=sets, reps=ex.reps,
        rest_seconds=rest, muscle_group=ex.muscle_group, notes=notes,
    )


def _adapt_list(exercises: list[Exercise], imc_category: Optional[str]) -> list[Exercise]:
    return [_adapt_exercise(e, imc_category) for e in exercises]


# ─────────────────────────────────────────────────────────────────────────────
#  GROQ — RECOMENDACIÓN DE VARIANTE
# ─────────────────────────────────────────────────────────────────────────────

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
    1. Recomendar cuál de las 3 variantes (A/B/C) conviene más al usuario.
    2. Generar un coaching_tip personalizado basado en su perfil.

    Retorna:
        {
          "variante_recomendada": "A" | "B" | "C",
          "razon": "Texto corto explicando por qué",
          "coaching_tip": "Consejo personalizado de 2-3 líneas"
        }
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        # Sin clave: devuelve defaults razonables
        return {
            "variante_recomendada": "A",
            "razon": "Variante estándar recomendada por defecto.",
            "coaching_tip": "Mantén una progresión constante aumentando el peso un 2.5-5% cada semana.",
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

Responde ÚNICAMENTE con un JSON válido (sin texto extra, sin markdown) con esta estructura:
{{
  "variante_recomendada": "A" o "B" o "C",
  "razon": "Explicación breve (máximo 2 oraciones) de por qué esta variante es la mejor para este perfil",
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
            "razon": "Recomendación por defecto (error al conectar con IA).",
            "coaching_tip": "Enfócate en la técnica antes de aumentar el peso. La consistencia supera a la intensidad.",
        }


# ─────────────────────────────────────────────────────────────────────────────
#  CONSTRUCTOR PRINCIPAL — 3 VARIANTES POR META
# ─────────────────────────────────────────────────────────────────────────────

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
    Genera las 3 variantes de plan + recomendación Groq.

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
    freq_label = {"baja": "Baja (1-2 días)", "media": "Media (3-4 días)", "alta": "Alta (5-6 días)"}
    days_per_week = freq_map.get(frequency, 4)
    goal_lower = goal.lower()

    variantes: dict[str, TrainingPlan] = {}

    # ══════════════════════════════════════
    #  HIPERTROFIA
    # ══════════════════════════════════════
    if "muscular" in goal_lower or "masa" in goal_lower or "músculo" in goal_lower or "musculo" in goal_lower:

        def _hypertrophy_plan(push, pull, legs, variant_label, desc, intensity):
            push = _adapt_list(push, imc_category)
            pull = _adapt_list(pull, imc_category)
            legs = _adapt_list(legs, imc_category)

            if days_per_week == 2:
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Full Body A", focus="Piernas, Pecho, Hombros", exercises=push[:3] + legs[:3]),
                    WorkoutDay(day_number=2, day_name="Día 2 — Full Body B", focus="Espalda, Bíceps, Piernas", exercises=pull[:3] + legs[3:]),
                ]
            elif days_per_week == 4:
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Push (Empuje)",      focus="Pecho, Hombros, Tríceps",          exercises=push),
                    WorkoutDay(day_number=2, day_name="Día 2 — Pull (Jalón)",        focus="Espalda, Bíceps, Deltoides Post.", exercises=pull),
                    WorkoutDay(day_number=3, day_name="Día 3 — Piernas",             focus="Cuádriceps, Glúteos, Gemelos",     exercises=legs),
                    WorkoutDay(day_number=4, day_name="Día 4 — Upper Body Fuerza",   focus="Pecho, Espalda, Hombros",          exercises=push[:3] + pull[:3]),
                ]
            else:  # alta — PPL x2
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Push A",    focus="Pecho, Hombros, Tríceps",    exercises=push),
                    WorkoutDay(day_number=2, day_name="Día 2 — Pull A",    focus="Espalda, Bíceps",            exercises=pull),
                    WorkoutDay(day_number=3, day_name="Día 3 — Piernas A", focus="Cuádriceps, Glúteos, Gemelos",exercises=legs),
                    WorkoutDay(day_number=4, day_name="Día 4 — Push B",    focus="Pecho, Hombros, Tríceps",    exercises=push),
                    WorkoutDay(day_number=5, day_name="Día 5 — Pull B",    focus="Espalda, Bíceps",            exercises=pull),
                    WorkoutDay(day_number=6, day_name="Día 6 — Piernas B", focus="Isquios, Glúteos, Gemelos",  exercises=legs),
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
            base_desc = "Hipertrofia con volumen extra. Come en superávit de 300-500 kcal/día para maximizar ganancias."
        else:
            intensity = "Alta"
            base_desc = "Hipertrofia clásica (8-12 reps). Progresión de carga obligatoria para estimular el crecimiento."

        variantes["A"] = _hypertrophy_plan(
            HYPERTROPHY_PUSH_A, HYPERTROPHY_PULL_A, HYPERTROPHY_LEGS_A, "A",
            f"{base_desc} Variante A: énfasis en ejercicios con barra (mayor sobrecarga).", intensity,
        )
        variantes["B"] = _hypertrophy_plan(
            HYPERTROPHY_PUSH_B, HYPERTROPHY_PULL_B, HYPERTROPHY_LEGS_B, "B",
            f"{base_desc} Variante B: mezcla de barra y mancuernas, más variedad de ángulos.", intensity,
        )
        variantes["C"] = _hypertrophy_plan(
            HYPERTROPHY_PUSH_C, HYPERTROPHY_PULL_C, HYPERTROPHY_LEGS_C, "C",
            f"{base_desc} Variante C: énfasis en mancuernas y poleas para mayor rango de movimiento.", intensity,
        )

    # ══════════════════════════════════════
    #  PÉRDIDA DE GRASA
    # ══════════════════════════════════════
    elif "grasa" in goal_lower or "perder" in goal_lower:

        use_low_impact = (imc_category == "Obesidad")

        def _fat_loss_plan(circuit_a, circuit_b, variant_label, desc, intensity):
            ca = _adapt_list(circuit_a, imc_category)
            cb = _adapt_list(circuit_b, imc_category)

            if days_per_week == 2:
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Circuito Full Body A", focus="Full Body + Core",   exercises=ca),
                    WorkoutDay(day_number=2, day_name="Día 2 — Circuito Full Body B", focus="Full Body + Cardio", exercises=cb),
                ]
            elif days_per_week == 4:
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Inferior + Core",  focus="Piernas, Glúteos, Core",  exercises=ca[:3] + cb[2:4]),
                    WorkoutDay(day_number=2, day_name="Día 2 — Superior Push",    focus="Pecho, Hombros",          exercises=ca[1:4]),
                    WorkoutDay(day_number=3, day_name="Día 3 — Full Body A",      focus="Full Body + Cardio",      exercises=ca),
                    WorkoutDay(day_number=4, day_name="Día 4 — Full Body B",      focus="Full Body + HIIT",        exercises=cb),
                ]
            else:
                cardio_day = [
                    Exercise(name="Cardio Moderado (Caminata/Bici)", sets=1, reps="35 min", rest_seconds=0, muscle_group="Cardio", notes="Zona 2: conversación posible"),
                    Exercise(name="Plank",                           sets=4, reps="45 seg", rest_seconds=30, muscle_group="Core"),
                    Exercise(name="Superman",                        sets=3, reps="15",     rest_seconds=30, muscle_group="Lumbar"),
                ]
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Inferior + Core", focus="Piernas, Core",        exercises=ca[:3] + cb[2:4]),
                    WorkoutDay(day_number=2, day_name="Día 2 — Superior Push",   focus="Pecho, Hombros",       exercises=ca[1:4]),
                    WorkoutDay(day_number=3, day_name="Día 3 — Superior Pull",   focus="Espalda, Bíceps",      exercises=ca[3:5] + cb[3:5]),
                    WorkoutDay(day_number=4, day_name="Día 4 — Full Body A",     focus="Full Body + Cardio",   exercises=ca),
                    WorkoutDay(day_number=5, day_name="Día 5 — Full Body B",     focus="Full Body + HIIT",     exercises=cb),
                    WorkoutDay(day_number=6, day_name="Día 6 — Cardio + Core",   focus="Cardio, Movilidad",    exercises=cardio_day),
                ]

            return TrainingPlan(
                goal=goal, frequency_level=freq_label[frequency],
                days_per_week=days_per_week, imc=imc, imc_category=imc_category,
                intensity=intensity, plan_type="Metabólico",
                description=desc, days=days, variant=variant_label,
            )

        if use_low_impact:
            variantes["A"] = _fat_loss_plan(FAT_LOSS_LOW_IMPACT_A, FAT_LOSS_LOW_IMPACT_B, "A",
                "Plan metabólico de bajo impacto. Ejercicios articular-seguros que elevan el gasto calórico sin sobrecargar rodillas y espalda.", "Moderada")
            variantes["B"] = _fat_loss_plan(FAT_LOSS_LOW_IMPACT_B, FAT_LOSS_LOW_IMPACT_C, "B",
                "Plan bajo impacto con mayor énfasis en glúteos y cadena posterior. Introduce carga progresiva en cada sesión.", "Moderada")
            variantes["C"] = _fat_loss_plan(FAT_LOSS_LOW_IMPACT_C, FAT_LOSS_LOW_IMPACT_A, "C",
                "Plan bajo impacto con mancuernas y bandas. Más variedad de movimientos para evitar adaptación.", "Moderada")
        else:
            int_label = "Moderada-Alta" if imc_category == "Sobrepeso" else "Alta"
            variantes["A"] = _fat_loss_plan(FAT_LOSS_CIRCUIT_A, FAT_LOSS_CIRCUIT_B, "A",
                "Circuito metabólico clásico: ejercicios funcionales con descansos cortos. Máxima quema calórica en poco tiempo.", int_label)
            variantes["B"] = _fat_loss_plan(FAT_LOSS_CIRCUIT_B, FAT_LOSS_CIRCUIT_A, "B",
                "Circuito con mayor énfasis en tren inferior y glúteos. Ideal si quieres también tonificar piernas.", int_label)
            variantes["C"] = _fat_loss_plan(FAT_LOSS_CIRCUIT_C, FAT_LOSS_CIRCUIT_A, "C",
                "Híbrido fuerza-cardio: ejercicios compuestos a ritmo alto más intervalos de sprint. Preserva más músculo.", int_label)

    # ══════════════════════════════════════
    #  MANTENIMIENTO
    # ══════════════════════════════════════
    else:
        use_underweight = (imc_category == "Bajo peso")

        def _maintenance_plan(fa, fb, variant_label, desc, intensity):
            fa = _adapt_list(fa, imc_category)
            fb = _adapt_list(fb, imc_category)

            if days_per_week == 2:
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Full Body A", focus="Piernas, Pecho, Espalda",       exercises=fa),
                    WorkoutDay(day_number=2, day_name="Día 2 — Full Body B", focus="Cadena Posterior, Core",         exercises=fb),
                ]
            elif days_per_week == 4:
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Full Body A",  focus="Piernas, Empuje, Tirón",     exercises=fa),
                    WorkoutDay(day_number=2, day_name="Día 2 — Full Body B",  focus="Cadena Posterior, Core",     exercises=fb),
                    WorkoutDay(day_number=3, day_name="Día 3 — Upper Focus",  focus="Pecho, Espalda, Hombros",    exercises=fa[1:4] + fb[1:3]),
                    WorkoutDay(day_number=4, day_name="Día 4 — Lower + Core", focus="Piernas, Glúteos, Core",     exercises=fb[:2] + fa[:2] + [fb[-1]]),
                ]
            else:
                days = [
                    WorkoutDay(day_number=1, day_name="Día 1 — Full Body A",        focus="Piernas, Pecho, Espalda",    exercises=fa),
                    WorkoutDay(day_number=2, day_name="Día 2 — Full Body B",        focus="Cadena Posterior, Core",     exercises=fb),
                    WorkoutDay(day_number=3, day_name="Día 3 — Upper A",            focus="Pecho, Hombros, Tríceps",    exercises=fa[1:]),
                    WorkoutDay(day_number=4, day_name="Día 4 — Lower A",            focus="Piernas, Glúteos",           exercises=fb[:2] + fa[:1]),
                    WorkoutDay(day_number=5, day_name="Día 5 — Upper B",            focus="Espalda, Bíceps, Core",      exercises=fb[1:]),
                    WorkoutDay(day_number=6, day_name="Día 6 — Cardio + Movilidad", focus="Cardio, Flexibilidad",       exercises=[
                        Exercise(name="Cardio Moderado", sets=1, reps="30 min", rest_seconds=0, muscle_group="Cardio"),
                        Exercise(name="Estiramientos Dinámicos", sets=1, reps="10 min", rest_seconds=0, muscle_group="Movilidad"),
                        Exercise(name="Plank", sets=3, reps="45 seg", rest_seconds=30, muscle_group="Core"),
                    ]),
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
                "Recomposición corporal: ejercicios compuestos con barra para ganar fuerza y masa desde bajo peso.", int_label)
            variantes["B"] = _maintenance_plan(MAINTENANCE_UNDERWEIGHT_B, MAINTENANCE_UNDERWEIGHT_C, "B",
                "Énfasis en peso muerto y movimientos de cadena posterior. Construye base de fuerza real.", int_label)
            variantes["C"] = _maintenance_plan(MAINTENANCE_UNDERWEIGHT_C, MAINTENANCE_UNDERWEIGHT_A, "C",
                "Variante con sentadilla frontal y movimientos de mayor rango. Mayor activación muscular total.", int_label)
        else:
            int_label = "Moderada" if imc_category != "Sobrepeso" else "Moderada-Alta"
            variantes["A"] = _maintenance_plan(MAINTENANCE_FULL_A, MAINTENANCE_FULL_B, "A",
                "Mantenimiento clásico: ejercicios compuestos con barra. Fuerza funcional y composición estable.", int_label)
            variantes["B"] = _maintenance_plan(MAINTENANCE_FULL_B, MAINTENANCE_FULL_C, "B",
                "Mayor énfasis en cadena posterior y core. Equilibrio entre fuerza y movilidad.", int_label)
            variantes["C"] = _maintenance_plan(MAINTENANCE_FULL_C, MAINTENANCE_FULL_A, "C",
                "Variante con mancuernas y peso corporal. Más accesible y con mayor rango de movimiento.", int_label)

    # ── Descripción de variantes para Groq ──────────────────────────────────
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


# ── Compatibilidad con el router existente (sigue funcionando si alguien llama build_plan) ──
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
    return int(match.group(0))


def _exercise_rest_seconds(plan_payload: dict, day_number: int, exercise_order: int) -> Optional[int]:
    days = plan_payload.get("days") or []
    for day in days:
        if int(day.get("day_number", 0) or 0) != day_number:
            continue
        exercises = day.get("exercises") or []
        if 1 <= exercise_order <= len(exercises):
            exercise = exercises[exercise_order - 1] or {}
            return exercise.get("rest_seconds")
    return None


def _exercise_to_payload(exercise: TrainingExerciseProgress, rest_seconds: Optional[int] = None) -> dict:
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
        "day_id": routine.id,
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
            )
            if current_exercise
            else None
        ),
        "exercises": [
            _exercise_to_payload(
                exercise,
                _exercise_rest_seconds(plan_payload, routine.day_number, exercise.exercise_order),
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


def _build_session_summary(
    routine: TrainingRoutineProgress,
    exercises: list[TrainingExerciseProgress],
) -> dict:
    total_exercises = len(exercises)
    completed_exercises = sum(1 for exercise in exercises if exercise.status == "completed")
    total_sets = sum(exercise.sets_target or 0 for exercise in exercises)
    completed_sets = sum(min(exercise.sets_completed or 0, exercise.sets_target or 0) for exercise in exercises)
    total_reps = sum(_exercise_total_reps_completed(exercise) for exercise in exercises)
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
        "total_sets": total_sets,
        "completed_sets": completed_sets,
        "total_reps": total_reps,
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
            detail="Rutina no encontrada para el día solicitado.",
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
            detail="Rutina no encontrada para el día solicitado.",
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
            detail="Rutina no encontrada para el día solicitado.",
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
            detail="Rutina no encontrada para el día solicitado.",
        )

    exercises = _get_day_exercises(db, selection.id, day_number)
    current_exercise = _resolve_current_exercise(exercises)
    if current_exercise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ejercicio activo para esta rutina.",
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
            detail="Aún no se completó el objetivo de reps de la serie actual.",
        )

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
        payload={"day_number": day_number},
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
            detail="Rutina no encontrada para el día solicitado.",
        )
    if _event_exists(db, user, day_number, "routine_complete", client_event_id):
        return routine
    if routine.status == "completed":
        return routine

    exercises = _get_day_exercises(db, selection.id, day_number)
    if not exercises:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontraron ejercicios para este día.",
        )

    if not force and not all(exercise.status == "completed" for exercise in exercises):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Todavía quedan ejercicios pendientes en este día.",
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

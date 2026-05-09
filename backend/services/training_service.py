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
from typing import Optional
from groq import Groq
from schemas.training import TrainingPlan, WorkoutDay, Exercise

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
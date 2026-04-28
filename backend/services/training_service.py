from typing import Optional
from schemas.training import TrainingPlan, WorkoutDay, Exercise

# ─── Biblioteca de ejercicios ────────────────────────────────────────────────

HYPERTROPHY_PUSH = [
    Exercise(name="Press de Banca con Barra", sets=4, reps="8-10", rest_seconds=90, muscle_group="Pecho", notes="Escápulas retraídas"),
    Exercise(name="Press Inclinado con Mancuernas", sets=3, reps="10-12", rest_seconds=75, muscle_group="Pecho Superior"),
    Exercise(name="Press Militar con Barra", sets=4, reps="8-10", rest_seconds=90, muscle_group="Hombros"),
    Exercise(name="Elevaciones Laterales", sets=3, reps="12-15", rest_seconds=60, muscle_group="Deltoides Lateral"),
    Exercise(name="Extensión de Tríceps en Polea", sets=3, reps="12-15", rest_seconds=60, muscle_group="Tríceps"),
    Exercise(name="Fondos en Paralelas", sets=3, reps="10-12", rest_seconds=75, muscle_group="Tríceps/Pecho"),
]

HYPERTROPHY_PULL = [
    Exercise(name="Dominadas o Jalón al Pecho", sets=4, reps="8-10", rest_seconds=90, muscle_group="Dorsal", notes="Pecho al frente"),
    Exercise(name="Remo con Barra", sets=4, reps="8-10", rest_seconds=90, muscle_group="Espalda Media"),
    Exercise(name="Remo con Mancuerna", sets=3, reps="10-12", rest_seconds=75, muscle_group="Dorsal"),
    Exercise(name="Curl de Bíceps con Barra", sets=3, reps="10-12", rest_seconds=60, muscle_group="Bíceps"),
    Exercise(name="Curl Martillo", sets=3, reps="12-15", rest_seconds=60, muscle_group="Braquial"),
    Exercise(name="Face Pulls", sets=3, reps="15-20", rest_seconds=45, muscle_group="Deltoides Posterior"),
]

HYPERTROPHY_LEGS = [
    Exercise(name="Sentadilla con Barra", sets=4, reps="8-10", rest_seconds=120, muscle_group="Cuádriceps/Glúteos", notes="Profundidad paralela"),
    Exercise(name="Prensa de Piernas", sets=3, reps="12-15", rest_seconds=90, muscle_group="Cuádriceps"),
    Exercise(name="Peso Muerto Rumano", sets=3, reps="10-12", rest_seconds=90, muscle_group="Isquiotibiales/Glúteos"),
    Exercise(name="Extensión de Cuádriceps", sets=3, reps="15-20", rest_seconds=60, muscle_group="Cuádriceps"),
    Exercise(name="Curl Femoral Tumbado", sets=3, reps="12-15", rest_seconds=60, muscle_group="Isquiotibiales"),
    Exercise(name="Elevaciones de Gemelos", sets=4, reps="15-20", rest_seconds=45, muscle_group="Gemelos"),
]

FAT_LOSS_CIRCUIT_A = [
    Exercise(name="Sentadilla con Salto", sets=4, reps="15", rest_seconds=30, muscle_group="Piernas/Cardio"),
    Exercise(name="Flexiones de Pecho", sets=4, reps="12-15", rest_seconds=30, muscle_group="Pecho/Tríceps"),
    Exercise(name="Peso Muerto con Mancuernas", sets=4, reps="15", rest_seconds=30, muscle_group="Cadena Posterior"),
    Exercise(name="Remo con Banda o Mancuerna", sets=4, reps="15", rest_seconds=30, muscle_group="Espalda"),
    Exercise(name="Mountain Climbers", sets=4, reps="30 seg", rest_seconds=20, muscle_group="Core/Cardio"),
    Exercise(name="Burpees", sets=3, reps="10", rest_seconds=45, muscle_group="Full Body"),
]

FAT_LOSS_CIRCUIT_B = [
    Exercise(name="Zancadas Alternadas", sets=4, reps="12 c/lado", rest_seconds=30, muscle_group="Piernas/Glúteos"),
    Exercise(name="Press de Hombros con Mancuernas", sets=4, reps="12-15", rest_seconds=30, muscle_group="Hombros"),
    Exercise(name="Hip Thrust", sets=4, reps="15", rest_seconds=45, muscle_group="Glúteos"),
    Exercise(name="Remo Invertido", sets=4, reps="12-15", rest_seconds=30, muscle_group="Espalda"),
    Exercise(name="Plank con Rotación", sets=3, reps="30 seg", rest_seconds=20, muscle_group="Core"),
    Exercise(name="Saltos en Caja (Step)", sets=3, reps="10", rest_seconds=45, muscle_group="Piernas/Cardio"),
]

# Versión bajo impacto para obesidad (IMC >= 30)
FAT_LOSS_LOW_IMPACT_A = [
    Exercise(name="Sentadilla al Cajón", sets=3, reps="12-15", rest_seconds=60, muscle_group="Piernas/Glúteos", notes="Usa una silla como referencia de profundidad"),
    Exercise(name="Flexiones en Pared o Rodillas", sets=3, reps="12-15", rest_seconds=60, muscle_group="Pecho/Tríceps", notes="Progresa a flexiones completas cuando puedas"),
    Exercise(name="Peso Muerto con Mancuernas", sets=3, reps="12", rest_seconds=60, muscle_group="Cadena Posterior"),
    Exercise(name="Remo con Banda o Mancuerna", sets=3, reps="15", rest_seconds=60, muscle_group="Espalda"),
    Exercise(name="Marcha en Sitio con Rodillas Altas", sets=3, reps="40 seg", rest_seconds=30, muscle_group="Core/Cardio"),
    Exercise(name="Plank en Rodillas", sets=3, reps="30 seg", rest_seconds=45, muscle_group="Core"),
]

FAT_LOSS_LOW_IMPACT_B = [
    Exercise(name="Zancadas Estáticas (Estocadas)", sets=3, reps="10 c/lado", rest_seconds=60, muscle_group="Piernas/Glúteos", notes="Sin salto, controlado"),
    Exercise(name="Press de Hombros con Mancuernas Sentado", sets=3, reps="12-15", rest_seconds=60, muscle_group="Hombros"),
    Exercise(name="Hip Thrust con Pie en Suelo", sets=3, reps="15", rest_seconds=60, muscle_group="Glúteos"),
    Exercise(name="Remo Sentado con Banda", sets=3, reps="15", rest_seconds=60, muscle_group="Espalda"),
    Exercise(name="Elevaciones de Talones Sentado", sets=3, reps="20", rest_seconds=30, muscle_group="Gemelos"),
    Exercise(name="Caminata Activa o Bicicleta Estática", sets=1, reps="20 min", rest_seconds=0, muscle_group="Cardio"),
]

MAINTENANCE_FULL_A = [
    Exercise(name="Sentadilla con Barra", sets=3, reps="10-12", rest_seconds=75, muscle_group="Piernas"),
    Exercise(name="Press de Banca", sets=3, reps="10-12", rest_seconds=75, muscle_group="Pecho"),
    Exercise(name="Dominadas o Jalón", sets=3, reps="10-12", rest_seconds=75, muscle_group="Espalda"),
    Exercise(name="Press Militar", sets=3, reps="10-12", rest_seconds=60, muscle_group="Hombros"),
    Exercise(name="Curl de Bíceps", sets=3, reps="12-15", rest_seconds=45, muscle_group="Bíceps"),
    Exercise(name="Extensión Tríceps", sets=3, reps="12-15", rest_seconds=45, muscle_group="Tríceps"),
]

MAINTENANCE_FULL_B = [
    Exercise(name="Peso Muerto", sets=3, reps="8-10", rest_seconds=90, muscle_group="Cadena Posterior"),
    Exercise(name="Press Inclinado", sets=3, reps="10-12", rest_seconds=75, muscle_group="Pecho"),
    Exercise(name="Remo con Barra", sets=3, reps="10-12", rest_seconds=75, muscle_group="Espalda"),
    Exercise(name="Elevaciones Laterales", sets=3, reps="15", rest_seconds=45, muscle_group="Hombros"),
    Exercise(name="Zancadas", sets=3, reps="12 c/lado", rest_seconds=60, muscle_group="Piernas"),
    Exercise(name="Plank", sets=3, reps="45 seg", rest_seconds=30, muscle_group="Core"),
]

# Mantenimiento bajo peso — más volumen y calorías quemadas mínimas
MAINTENANCE_UNDERWEIGHT_A = [
    Exercise(name="Sentadilla con Barra", sets=4, reps="8-10", rest_seconds=90, muscle_group="Piernas", notes="Progresa el peso cada semana"),
    Exercise(name="Press de Banca con Barra", sets=4, reps="8-10", rest_seconds=90, muscle_group="Pecho"),
    Exercise(name="Dominadas o Jalón al Pecho", sets=4, reps="8-10", rest_seconds=90, muscle_group="Espalda"),
    Exercise(name="Press Militar con Barra", sets=3, reps="10-12", rest_seconds=75, muscle_group="Hombros"),
    Exercise(name="Curl de Bíceps con Barra", sets=3, reps="10-12", rest_seconds=60, muscle_group="Bíceps"),
    Exercise(name="Extensión de Tríceps en Polea", sets=3, reps="10-12", rest_seconds=60, muscle_group="Tríceps"),
]

MAINTENANCE_UNDERWEIGHT_B = [
    Exercise(name="Peso Muerto Convencional", sets=4, reps="6-8", rest_seconds=120, muscle_group="Cadena Posterior", notes="Ejercicio rey para ganar masa y fuerza"),
    Exercise(name="Press Inclinado con Mancuernas", sets=4, reps="10-12", rest_seconds=75, muscle_group="Pecho Superior"),
    Exercise(name="Remo con Barra", sets=4, reps="8-10", rest_seconds=90, muscle_group="Espalda Media"),
    Exercise(name="Elevaciones Laterales", sets=3, reps="15", rest_seconds=45, muscle_group="Hombros"),
    Exercise(name="Zancadas con Mancuernas", sets=3, reps="10 c/lado", rest_seconds=60, muscle_group="Piernas"),
    Exercise(name="Curl Martillo", sets=3, reps="12", rest_seconds=45, muscle_group="Braquial"),
]


# ─── Helpers ────────────────────────────────────────────────────────────────

def calculate_imc(weight_kg: float, height_cm: float) -> tuple[float, str]:
    imc = weight_kg / ((height_cm / 100) ** 2)
    imc = round(imc, 1)
    if imc < 18.5:
        category = "Bajo peso"
    elif imc < 25:
        category = "Normal"
    elif imc < 30:
        category = "Sobrepeso"
    else:
        category = "Obesidad"
    return imc, category


def _adapt_exercise(ex: Exercise, imc_category: Optional[str]) -> Exercise:
    """
    Ajusta sets/reps/descanso de un ejercicio según IMC.
    Devuelve un nuevo Exercise (no muta el original de la biblioteca).
    """
    if imc_category is None:
        return ex

    sets = ex.sets
    reps = ex.reps
    rest = ex.rest_seconds
    notes = ex.notes

    if imc_category == "Bajo peso":
        # Más volumen, más descanso para maximizar síntesis proteica
        sets = min(sets + 1, 5)
        rest = min(rest + 30, 150)
        notes = (notes + " · Prioriza comer en superávit calórico." if notes else "Prioriza comer en superávit calórico.")

    elif imc_category == "Sobrepeso":
        # Descansos más cortos para mantener ritmo cardíaco elevado
        rest = max(rest - 15, 20)
        notes = (notes + " · Descanso activo: marcha en sitio entre series." if notes else "Descanso activo: marcha en sitio entre series.")

    elif imc_category == "Obesidad":
        # Menos sets, más descanso, notas de seguridad
        sets = max(sets - 1, 2)
        rest = rest + 30
        notes = (notes + " · Rango de movimiento cómodo. Para si sientes dolor articular." if notes else "Rango de movimiento cómodo. Para si sientes dolor articular.")

    return Exercise(
        name=ex.name,
        sets=sets,
        reps=reps,
        rest_seconds=rest,
        muscle_group=ex.muscle_group,
        notes=notes,
    )


def _adapt_list(exercises: list[Exercise], imc_category: Optional[str]) -> list[Exercise]:
    return [_adapt_exercise(e, imc_category) for e in exercises]


# ─── Constructor principal ───────────────────────────────────────────────────

def build_plan(
    goal: str,
    frequency: str,           # "baja" | "media" | "alta"
    weight_kg: Optional[float] = None,
    height_cm: Optional[float] = None,
) -> TrainingPlan:

    imc = None
    imc_category = None
    if weight_kg and height_cm:
        imc, imc_category = calculate_imc(weight_kg, height_cm)

    goal_lower = goal.lower()

    # ── Días por frecuencia ──────────────────────────────
    freq_map   = {"baja": 2, "media": 4, "alta": 6}
    freq_label = {"baja": "Baja (1-2 días)", "media": "Media (3-4 días)", "alta": "Alta (5-6 días)"}
    days_per_week = freq_map.get(frequency, 3)

    # ════════════════════════════════════════════════════
    #  RAMA: Perder Grasa
    # ════════════════════════════════════════════════════
    if "grasa" in goal_lower or "perder" in goal_lower:
        plan_type = "Metabólico"

        # IMC determina intensidad real y qué circuito usar
        if imc_category == "Obesidad":
            intensity   = "Moderada"
            circuit_a   = FAT_LOSS_LOW_IMPACT_A        # bajo impacto
            circuit_b   = FAT_LOSS_LOW_IMPACT_B
            description = (
                "Plan metabólico de bajo impacto adaptado a tu composición corporal actual. "
                "Ejercicios articular-seguros que elevan el gasto calórico sin sobrecargar rodillas y espalda. "
                "Con constancia verás resultados sólidos en 8-12 semanas."
            )
        elif imc_category == "Sobrepeso":
            intensity   = "Moderada-Alta"
            circuit_a   = _adapt_list(FAT_LOSS_CIRCUIT_A, imc_category)
            circuit_b   = _adapt_list(FAT_LOSS_CIRCUIT_B, imc_category)
            description = (
                "Plan de circuito metabólico con descansos reducidos para maximizar la quema calórica. "
                "Adaptado para tu IMC: ritmo de trabajo elevado con ejercicios de moderado impacto."
            )
        elif imc_category == "Bajo peso":
            intensity   = "Moderada"
            circuit_a   = _adapt_list(FAT_LOSS_CIRCUIT_A, imc_category)
            circuit_b   = _adapt_list(FAT_LOSS_CIRCUIT_B, imc_category)
            description = (
                "Plan metabólico con volumen elevado para preservar y construir masa muscular mientras "
                "mejoras tu composición. Asegúrate de estar en un leve superávit calórico."
            )
        else:  # Normal o sin datos
            intensity   = "Alta"
            circuit_a   = FAT_LOSS_CIRCUIT_A
            circuit_b   = FAT_LOSS_CIRCUIT_B
            description = (
                "Plan de circuito metabólico diseñado para maximizar la quema de calorías "
                "y preservar la masa muscular. Períodos de descanso cortos y alta densidad de trabajo."
            )

        if days_per_week == 2:
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Circuito Full Body A", focus="Full Body + Core", exercises=circuit_a),
                WorkoutDay(day_number=2, day_name="Día 2 — Circuito Full Body B", focus="Full Body + Cardio", exercises=circuit_b),
            ]
        elif days_per_week == 4:
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Circuito Inferior + Core", focus="Piernas, Glúteos, Core",    exercises=circuit_a[:3] + circuit_b[2:4]),
                WorkoutDay(day_number=2, day_name="Día 2 — Circuito Superior A",      focus="Pecho, Espalda, Hombros",   exercises=circuit_a[1:4] + circuit_b[1:2]),
                WorkoutDay(day_number=3, day_name="Día 3 — Circuito Full Body A",     focus="Full Body + Cardio",        exercises=circuit_a),
                WorkoutDay(day_number=4, day_name="Día 4 — Circuito Full Body B",     focus="Full Body + HIIT",          exercises=circuit_b),
            ]
        else:  # alta
            cardio_day_exercises = (
                [
                    Exercise(name="Caminata o Bicicleta Estática", sets=1, reps="40 min", rest_seconds=0, muscle_group="Cardio", notes="Zona 2: puedes mantener una conversación"),
                    Exercise(name="Plank en Rodillas", sets=4, reps="40 seg", rest_seconds=30, muscle_group="Core"),
                    Exercise(name="Superman", sets=3, reps="15", rest_seconds=30, muscle_group="Lumbar"),
                ]
                if imc_category == "Obesidad" else
                [
                    Exercise(name="Cardio Moderado (Caminar/Bici)", sets=1, reps="30-40 min", rest_seconds=0, muscle_group="Cardio"),
                    Exercise(name="Plank", sets=4, reps="45 seg", rest_seconds=30, muscle_group="Core"),
                    Exercise(name="Crunch Abdominal", sets=4, reps="20", rest_seconds=30, muscle_group="Abdomen"),
                    Exercise(name="Superman", sets=3, reps="15", rest_seconds=30, muscle_group="Lumbar"),
                ]
            )
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Inferior + Core",       focus="Piernas, Glúteos, Core",    exercises=circuit_a[:3] + circuit_b[2:4]),
                WorkoutDay(day_number=2, day_name="Día 2 — Superior Push",          focus="Pecho, Hombros, Tríceps",   exercises=circuit_a[1:3] + circuit_b[1:2] + circuit_a[4:]),
                WorkoutDay(day_number=3, day_name="Día 3 — Superior Pull + Core",   focus="Espalda, Bíceps, Core",     exercises=circuit_a[3:5] + circuit_b[3:5]),
                WorkoutDay(day_number=4, day_name="Día 4 — Full Body A",            focus="Full Body + Cardio",        exercises=circuit_a),
                WorkoutDay(day_number=5, day_name="Día 5 — Full Body B",            focus="Full Body + HIIT",          exercises=circuit_b),
                WorkoutDay(day_number=6, day_name="Día 6 — Cardio Activo + Core",   focus="Core, Movilidad",           exercises=cardio_day_exercises),
            ]

    # ════════════════════════════════════════════════════
    #  RAMA: Aumentar Masa Muscular
    # ════════════════════════════════════════════════════
    elif "muscular" in goal_lower or "masa" in goal_lower or "aumentar" in goal_lower:
        plan_type = "Hipertrofia"

        if imc_category == "Bajo peso":
            intensity   = "Alta"
            push        = _adapt_list(HYPERTROPHY_PUSH, imc_category)
            pull        = _adapt_list(HYPERTROPHY_PULL, imc_category)
            legs        = _adapt_list(HYPERTROPHY_LEGS, imc_category)
            description = (
                "Plan de hipertrofia con volumen extra adaptado para tu bajo peso actual. "
                "Series adicionales y descansos extendidos para maximizar la síntesis proteica. "
                "CLAVE: come en superávit calórico (300-500 kcal extra/día)."
            )
        elif imc_category == "Sobrepeso":
            intensity   = "Alta"
            push        = _adapt_list(HYPERTROPHY_PUSH, imc_category)
            pull        = _adapt_list(HYPERTROPHY_PULL, imc_category)
            legs        = _adapt_list(HYPERTROPHY_LEGS, imc_category)
            description = (
                "Plan de hipertrofia con descansos algo reducidos para también favorecer la recomposición "
                "corporal. Ganarás músculo mientras reduces grasa progresivamente."
            )
        elif imc_category == "Obesidad":
            intensity   = "Moderada-Alta"
            push        = _adapt_list(HYPERTROPHY_PUSH, imc_category)
            pull        = _adapt_list(HYPERTROPHY_PULL, imc_category)
            legs        = _adapt_list(HYPERTROPHY_LEGS, imc_category)
            description = (
                "Plan de hipertrofia adaptado con series y cargas progresivas. "
                "Rango de movimiento ajustado para proteger articulaciones. "
                "Con buena nutrición lograrás recomposición corporal significativa."
            )
        else:  # Normal o sin datos
            intensity   = "Alta"
            push        = HYPERTROPHY_PUSH
            pull        = HYPERTROPHY_PULL
            legs        = HYPERTROPHY_LEGS
            description = (
                "Plan de hipertrofia con división Push/Pull/Legs. Series y repeticiones "
                "optimizadas para el rango de hipertrofia (8-12 reps). Progresión de carga progresiva."
            )

        if days_per_week == 2:
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Full Body A", focus="Piernas, Pecho, Hombros", exercises=push[:3] + legs[:3]),
                WorkoutDay(day_number=2, day_name="Día 2 — Full Body B", focus="Espalda, Bíceps, Piernas", exercises=pull[:3] + legs[3:]),
            ]
        elif days_per_week == 4:
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Push (Empuje)",        focus="Pecho, Hombros, Tríceps",         exercises=push),
                WorkoutDay(day_number=2, day_name="Día 2 — Pull (Jalón)",          focus="Espalda, Bíceps, Deltoides Post.", exercises=pull),
                WorkoutDay(day_number=3, day_name="Día 3 — Piernas A",             focus="Cuádriceps, Glúteos, Gemelos",     exercises=legs),
                WorkoutDay(day_number=4, day_name="Día 4 — Upper Body (Fuerza)",   focus="Pecho, Espalda, Hombros",          exercises=push[:3] + pull[:3]),
            ]
        else:  # alta - PPL x2
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Push A",   focus="Pecho, Hombros, Tríceps",   exercises=push),
                WorkoutDay(day_number=2, day_name="Día 2 — Pull A",   focus="Espalda, Bíceps",            exercises=pull),
                WorkoutDay(day_number=3, day_name="Día 3 — Piernas A",focus="Cuádriceps, Glúteos, Gemelos",exercises=legs),
                WorkoutDay(day_number=4, day_name="Día 4 — Push B",   focus="Pecho, Hombros, Tríceps",   exercises=push),
                WorkoutDay(day_number=5, day_name="Día 5 — Pull B",   focus="Espalda, Bíceps",            exercises=pull),
                WorkoutDay(day_number=6, day_name="Día 6 — Piernas B",focus="Isquios, Glúteos, Gemelos",  exercises=legs),
            ]

    # ════════════════════════════════════════════════════
    #  RAMA: Mantenimiento / Recomposición
    # ════════════════════════════════════════════════════
    else:
        plan_type = "Mantenimiento"

        if imc_category == "Bajo peso":
            intensity   = "Moderada-Alta"
            full_a      = _adapt_list(MAINTENANCE_UNDERWEIGHT_A, imc_category)
            full_b      = _adapt_list(MAINTENANCE_UNDERWEIGHT_B, imc_category)
            description = (
                "Plan de recomposición enfocado en ganar fuerza y masa muscular desde bajo peso. "
                "Volumen elevado con ejercicios compuestos. Prioriza comer suficiente proteína y calorías."
            )
        elif imc_category == "Sobrepeso":
            intensity   = "Moderada-Alta"
            full_a      = _adapt_list(MAINTENANCE_FULL_A, imc_category)
            full_b      = _adapt_list(MAINTENANCE_FULL_B, imc_category)
            description = (
                "Plan de recomposición corporal: mantener músculo existente mientras se reduce grasa. "
                "Descansos activos entre series para mayor gasto calórico total."
            )
        elif imc_category == "Obesidad":
            intensity   = "Moderada"
            full_a      = _adapt_list(MAINTENANCE_FULL_A, imc_category)
            full_b      = _adapt_list(MAINTENANCE_FULL_B, imc_category)
            description = (
                "Plan de acondicionamiento progresivo. Ejercicios compuestos con menor volumen inicial "
                "para construir la base de fuerza de forma segura. Aumenta progresivamente cada 2 semanas."
            )
        else:  # Normal o sin datos
            intensity   = "Moderada"
            full_a      = MAINTENANCE_FULL_A
            full_b      = MAINTENANCE_FULL_B
            description = (
                "Plan de mantenimiento y recomposición corporal. Combina fuerza funcional con "
                "ejercicios compuestos. Ideal para mantener músculo mientras se mejora la composición corporal."
            )

        if days_per_week == 2:
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Full Body A", focus="Piernas, Pecho, Espalda",           exercises=full_a),
                WorkoutDay(day_number=2, day_name="Día 2 — Full Body B", focus="Cadena Posterior, Hombros, Core",   exercises=full_b),
            ]
        elif days_per_week == 4:
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Full Body A",  focus="Piernas, Empuje, Tirón",     exercises=full_a),
                WorkoutDay(day_number=2, day_name="Día 2 — Full Body B",  focus="Cadena Posterior, Core",     exercises=full_b),
                WorkoutDay(day_number=3, day_name="Día 3 — Upper Focus",  focus="Pecho, Espalda, Hombros",    exercises=full_a[1:4] + full_b[1:3]),
                WorkoutDay(day_number=4, day_name="Día 4 — Lower + Core", focus="Piernas, Glúteos, Core",     exercises=full_b[:2] + full_a[:2] + [full_b[-1]]),
            ]
        else:
            days = [
                WorkoutDay(day_number=1, day_name="Día 1 — Full Body A",       focus="Piernas, Pecho, Espalda",    exercises=full_a),
                WorkoutDay(day_number=2, day_name="Día 2 — Full Body B",       focus="Cadena Posterior, Core",     exercises=full_b),
                WorkoutDay(day_number=3, day_name="Día 3 — Upper A",           focus="Pecho, Hombros, Tríceps",    exercises=full_a[1:]),
                WorkoutDay(day_number=4, day_name="Día 4 — Lower A",           focus="Piernas, Glúteos",           exercises=full_b[:2] + full_a[:1]),
                WorkoutDay(day_number=5, day_name="Día 5 — Upper B",           focus="Espalda, Bíceps, Core",      exercises=full_b[1:]),
                WorkoutDay(day_number=6, day_name="Día 6 — Cardio + Movilidad",focus="Cardio Ligero, Flexibilidad",exercises=[
                    Exercise(name="Cardio Moderado", sets=1, reps="30 min", rest_seconds=0, muscle_group="Cardio"),
                    Exercise(name="Estiramientos Dinámicos", sets=1, reps="10 min", rest_seconds=0, muscle_group="Movilidad"),
                    Exercise(name="Plank", sets=3, reps="45 seg", rest_seconds=30, muscle_group="Core"),
                ]),
            ]

    return TrainingPlan(
        goal=goal,
        frequency_level=freq_label[frequency],
        days_per_week=days_per_week,
        imc=imc,
        imc_category=imc_category,
        intensity=intensity,
        plan_type=plan_type,
        description=description,
        days=days,
    )
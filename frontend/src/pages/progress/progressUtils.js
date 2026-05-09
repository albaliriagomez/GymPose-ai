export const HEADER_OPTIONS = [
  { value: 'plan', label: 'Plan semanal' },
  { value: 'questions', label: 'Preguntas' },
]

export const ONBOARDING_STEPS = [
  { id: 'goal', label: 'Objetivo', helper: 'Qué quieres conseguir' },
  { id: 'body', label: 'Cuerpo', helper: 'Cómo quieres verte' },
  { id: 'data', label: 'Datos', helper: 'Tu información básica' },
  { id: 'equipment', label: 'Equipo', helper: 'Qué tienes disponible' },
]

export const PLAN_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'rutina', label: 'Rutina' },
  { id: 'comidas', label: 'Comidas' },
  { id: 'progreso', label: 'Progreso' },
]

export const GOAL_OPTIONS = [
  {
    value: 'Ganar masa muscular',
    label: 'Ganar masa muscular',
    description: 'Más volumen, fuerza y desarrollo.',
    accent: 'from-cyan-500/30 to-blue-500/20',
  },
  {
    value: 'Bajar de peso',
    label: 'Bajar de peso',
    description: 'Reducir grasa y mejorar definición.',
    accent: 'from-amber-500/30 to-orange-500/20',
  },
  {
    value: 'Definir',
    label: 'Definir',
    description: 'Marcar el cuerpo y mantener músculo.',
    accent: 'from-emerald-500/30 to-teal-500/20',
  },
]

export const BODY_REFERENCE_OPTIONS = [
  {
    id: 'ref_01',
    title: 'Atlético definido',
    style: 'atlético, hombros marcados, cintura definida',
    description: 'Físico equilibrado y marcado.',
  },
  {
    id: 'ref_02',
    title: 'Más volumen',
    style: 'más grande, pecho lleno, brazos fuertes',
    description: 'Prioriza masa muscular y tamaño.',
  },
  {
    id: 'ref_03',
    title: 'Marcado y seco',
    style: 'delgado, marcado, cintura reducida',
    description: 'Busca definición y poca grasa.',
  },
]

export const EQUIPMENT_OPTIONS = ['mancuernas', 'banco', 'barra', 'máquina', 'bandas', 'peso corporal']

export const SEX_OPTIONS = [
  { value: 'male', label: 'Hombre' },
  { value: 'female', label: 'Mujer' },
]

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentario' },
  { value: 'light', label: 'Ligero' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'active', label: 'Activo' },
  { value: 'very_active', label: 'Muy activo' },
]

export const MEALS_OPTIONS = [3, 4, 5, 6]
export const DAYS_OPTIONS = [3, 4, 5, 6]

export const DEFAULT_LOG = {
  date: new Date().toISOString().slice(0, 10),
  exercise_type: '',
  sessions: 1,
  reps: 0,
  duration: 0,
  weight_kg: '',
  notes: '',
}

export function pickText(value, fallback = '') {
  if (value == null || value === '') return fallback

  if (typeof value === 'string') {
    return value.trim() || fallback
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = pickText(entry, '')
      if (text) return text
    }
    return fallback
  }

  if (typeof value === 'object') {
    const preferredKeys = [
      'name',
      'label',
      'title',
      'focus',
      'description',
      'text',
      'value',
      'day_label',
      'dayLabel',
    ]

    for (const key of preferredKeys) {
      const text = pickText(value[key], '')
      if (text) return text
    }

    for (const nested of Object.values(value)) {
      const text = pickText(nested, '')
      if (text) return text
    }
  }

  return fallback
}

export function getDefaultOnboarding(user = {}) {
  return {
    goal: formatGoalLabel(user.goal) || 'Ganar masa muscular',
    body_reference_id: 'ref_01',
    body_style: 'atlético, hombros marcados, cintura definida',
    weight_kg: user.weight_kg ?? '',
    height_cm: user.height_cm ?? '',
    age: '',
    sex: 'male',
    activity_level: 'moderate',
    meals_per_day: 4,
    days_per_week: 5,
    equipment_available: ['mancuernas', 'banco'],
  }
}

export function buildGeneratePayload(onboarding) {
  return {
    goal: onboarding.goal,
    body_reference_id: onboarding.body_reference_id,
    body_style: onboarding.body_style,
    weight_kg: toNumberOrNull(onboarding.weight_kg),
    height_cm: toNumberOrNull(onboarding.height_cm),
    age: toNumberOrNull(onboarding.age),
    sex: onboarding.sex,
    activity_level: onboarding.activity_level,
    meals_per_day: Number(onboarding.meals_per_day) || 4,
    days_per_week: Number(onboarding.days_per_week) || 5,
    equipment_available: onboarding.equipment_available,
  }
}

export function hasPlan(plan) {
  return Boolean(
    plan && (
      plan.goal_normalized ||
      plan.goal ||
      plan.source ||
      plan.rutina_semanal ||
      plan.weekly_plan ||
      plan.rutina_diaria_actual ||
      plan.today_routine ||
      plan.plan_comidas ||
      plan.meal_plan
    )
  )
}

export function isFallbackPlan(plan) {
  if (!plan) return false
  if (String(plan.source || '').toLowerCase() === 'fallback') return true

  const searchable = [
    plan.goal,
    plan.goal_normalized,
    plan.summary_text,
    plan.summary,
    plan.rutina_diaria_actual,
    plan.today_routine,
    plan.rutina_semanal,
    plan.weekly_plan,
    plan.plan_comidas,
    plan.meal_plan,
  ]

  return searchable.some((value) => {
    const text = pickText(value, '').toLowerCase()
    return text.includes('maintain') || text.includes('mantener') || text.includes('fallback')
  })
}

export function normalizeRoutine(day) {
  if (!day) return null
  return {
    ...day,
    exercises: Array.isArray(day.exercises) ? day.exercises : [],
  }
}

export function normalizeWeeklyRoutine(list) {
  if (!Array.isArray(list)) return []
  return list.filter(Boolean).map((day) => ({
    ...day,
    exercises: Array.isArray(day.exercises) ? day.exercises : [],
  }))
}

export function normalizeMealDays(list) {
  if (!Array.isArray(list)) return []

  const groups = new Map()

  list.filter(Boolean).forEach((entry, index) => {
    const dayIndex = entry.day_index ?? entry.dayIndex ?? index
    const dayLabel = pickText(entry.day_label ?? entry.dayLabel, `Día ${Number(dayIndex) + 1}`)
    const meals = Array.isArray(entry.meals)
      ? entry.meals.filter(Boolean)
      : entry.name || entry.title || entry.description
        ? [entry]
        : []

    if (!groups.has(dayIndex)) {
      groups.set(dayIndex, {
        dayIndex,
        dayLabel,
        meals: [],
      })
    }

    const target = groups.get(dayIndex)
    target.dayLabel = dayLabel
    target.meals.push(...meals)
  })

  return [...groups.values()].sort((a, b) => a.dayIndex - b.dayIndex)
}

export function formatMealText(value, fallback = '') {
  const text = pickText(value, fallback)
  const lower = text.toLowerCase()

  if (!text) return fallback
  if (lower.includes('maintain') || lower.includes('mantener')) return 'Opción según tu objetivo'
  if (lower.includes('breakfast')) return 'Desayuno'
  if (lower.includes('lunch')) return 'Almuerzo'
  if (lower.includes('dinner')) return 'Cena'
  if (lower.includes('snack')) return 'Merienda'
  return text
}

export function toNumberOrNull(value) {
  if (value === '' || value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatGoalLabel(goal) {
  const value = pickText(goal, '').trim().toLowerCase()
  if (!value) return ''
  if (value.includes('gain') || value.includes('masa') || value.includes('muscular') || value.includes('aumentar')) {
    return 'Ganar masa muscular'
  }
  if (value.includes('lose') || value.includes('bajar') || value.includes('perder')) {
    return 'Bajar de peso'
  }
  if (value.includes('defin') || value.includes('cut') || value.includes('seco') || value.includes('marked')) {
    return 'Definir'
  }
  if (value.includes('maintain') || value.includes('mantener')) {
    return 'Definir'
  }
  return pickText(goal, '')
}

export function normalizedCompare(left, right) {
  const normalize = (value) =>
    pickText(value, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  return normalize(left) === normalize(right)
}

export function formatWeekday(label) {
  const value = pickText(label, '').toLowerCase()
  if (value.includes('lun')) return 'Lunes'
  if (value.includes('mar')) return 'Martes'
  if (value.includes('mie')) return 'Miércoles'
  if (value.includes('jue')) return 'Jueves'
  if (value.includes('vie')) return 'Viernes'
  if (value.includes('sab')) return 'Sábado'
  if (value.includes('dom')) return 'Domingo'
  return pickText(label, 'Día')
}

export function formatPlanLabel(value) {
  const text = pickText(value, '').trim()
  const lower = text.toLowerCase()

  if (!text) return ''
  if (lower.includes('full body')) return 'Cuerpo completo'
  if (lower.includes('upper body')) return 'Torso superior'
  if (lower.includes('lower body')) return 'Pierna y glúteo'
  if (lower.includes('mobility')) return 'Movilidad'
  if (lower.includes('cardio')) return 'Cardio'
  if (lower.includes('core')) return 'Trabajo de core'
  if (lower.includes('push')) return 'Empuje'
  if (lower.includes('pull')) return 'Tirón'
  if (lower.includes('rest')) return 'Descanso'

  return text
}

export function formatExerciseLabel(value) {
  const text = pickText(value, '').trim()
  const lower = text.toLowerCase()

  if (!text) return 'Ejercicio'
  if (lower.includes('core suave')) return 'Trabajo de core suave'
  if (lower.includes('movilidad')) return 'Movilidad'
  if (lower.includes('press militar')) return 'Press militar'
  if (lower.includes('sentadilla')) return 'Sentadilla'
  if (lower.includes('press banca')) return 'Press banca'
  if (lower.includes('remo')) return 'Remo'
  if (lower.includes('jalón')) return 'Jalón'
  if (lower.includes('caminata')) return 'Caminata'
  if (lower.includes('bicicleta')) return 'Bicicleta'
  if (lower.includes('zancadas')) return 'Zancadas'
  if (lower.includes('prensa')) return 'Prensa'

  return text
}

export function getTodayRoutineIndex(list) {
  const day = new Date().getDay()
  const map = {
    1: ['lun', 'lunes', '0'],
    2: ['mar', 'martes', '1'],
    3: ['mie', 'miércoles', 'miercoles', '2'],
    4: ['jue', 'jueves', '3'],
    5: ['vie', 'viernes', '4'],
    6: ['sab', 'sábado', 'sabado', '5'],
    0: ['dom', 'domingo', '6'],
  }

  const tokens = map[day] || map[1]
  const match = list.find((entry) => {
    const label = pickText(entry.day_label ?? entry.dayLabel, '').toLowerCase()
    const index = String(entry.day_index ?? entry.dayIndex ?? '').toLowerCase()
    return tokens.some((token) => label.includes(token) || index === token)
  })

  return match?.day_index ?? match?.dayIndex ?? null
}

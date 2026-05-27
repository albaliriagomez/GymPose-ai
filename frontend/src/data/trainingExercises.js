const RAW_EXERCISES = [
  'Abducción de Cadera en Polea',
  'Aperturas con Mancuernas',
  'Burpees',
  'Calf Raise en Leg Press',
  'Caminata Activa o Bici Estática',
  'Caminata con Inclinación',
  'Cardio Moderado',
  'Cardio Moderado (Caminata/Bici)',
  'Cruce de Poleas (Cable Fly)',
  'Curl Araña (Spider Curl)',
  'Curl Concentrado',
  'Curl de Bíceps con Barra',
  'Curl de Bíceps con Mancuernas',
  'Curl de Bíceps en Polea',
  'Curl de Bíceps Predicador',
  'Curl Femoral de Pie',
  'Curl Femoral Sentado',
  'Curl Femoral Tumbado',
  'Curl Martillo',
  'Curl Martillo con Cable',
  'Dominadas o Jalón',
  'Dominadas o Jalón al Pecho',
  'Dominadas Supinas',
  'Elevación de Talones de Pie',
  'Elevaciones de Gemelos de Pie',
  'Elevaciones de Gemelos Sentado',
  'Elevaciones de Talones Sentado',
  'Elevaciones Frontales',
  'Elevaciones Laterales',
  'Elevaciones Laterales en Polea',
  'Encogimientos de Hombros',
  'Estiramientos Dinámicos',
  'Estocadas Estáticas',
  'Extensión de Cuádriceps',
  'Extensión de Tríceps en Polea',
  'Extensión Tríceps en Polea',
  'Face Pulls',
  'Flexiones con Lastre',
  'Flexiones de Pecho',
  'Flexiones en Pared o Rodillas',
  'Fondos en Paralelas',
  'Hip Thrust con Barra',
  'Hip Thrust con Mancuerna',
  'Hip Thrust con Peso Corporal',
  'Hip Thrust en Suelo',
  'Jalón Agarre Estrecho',
  'Jalón al Pecho Agarre Ancho',
  'Jalón al Pecho Agarre Cerrado',
  'Jalón con Banda al Pecho',
  'Marcha en Sitio Rodillas Altas',
  'Mountain Climbers',
  'Patada de Tríceps',
  'Peso Muerto con Mancuernas',
  'Peso Muerto Convencional',
  'Peso Muerto Rumano',
  'Peso Muerto Sumo',
  'Plancha Lateral',
  'Plank',
  'Plank con Rotación',
  'Plank en Rodillas',
  'Prensa 45° Pie Alto',
  'Prensa de Piernas',
  'Press Arnold',
  'Press de Banca',
  'Press de Banca con Barra',
  'Press de Banca con Mancuernas',
  'Press de Hombros con Mancuernas',
  'Press de Hombros Sentado',
  'Press de Pecho con Mancuernas en Suelo',
  'Press Declinado con Barra',
  'Press Francés (Skullcrusher)',
  'Press Francés con Barra EZ',
  'Press Inclinado',
  'Press Inclinado con Mancuernas',
  'Press Militar',
  'Press Militar con Barra',
  'Pull-Over con Mancuerna',
  'Remo con Banda o Mancuerna',
  'Remo con Barra',
  'Remo con Barra T',
  'Remo con Mancuerna',
  'Remo en Polea Baja',
  'Remo Invertido en Barra',
  'Remo Sentado con Banda',
  'Saltos en Caja (Step)',
  'Sentadilla al Cajón',
  'Sentadilla al Cajón (Con Mancuernas)',
  'Sentadilla Búlgara',
  'Sentadilla con Barra',
  'Sentadilla con Barra (Moderado)',
  'Sentadilla con Mancuernas (Goblet)',
  'Sentadilla con Salto',
  'Sentadilla Frontal',
  'Sprint en Cinta o Intervalo',
  'Superman',
  'Zancadas Alternadas con Salto',
  'Zancadas con Mancuernas',
]

const CATEGORY_RULES = [
  {
    key: 'Empuje',
    match: (name) =>
      /press|flexion|fondos|aperturas|cruce de poleas|patada de triceps|extension de triceps|elevaciones frontales|elevaciones laterales|press arnold|press frances/i.test(
        normalizeText(name),
      ),
  },
  {
    key: 'Tirón',
    match: (name) =>
      /curl|remo|jalon|dominadas|face pulls|pull-over|encogimientos/i.test(normalizeText(name)),
  },
  {
    key: 'Piernas',
    match: (name) =>
      /sentadilla|zancadas|estocadas|peso muerto|hip thrust|prensa|gemelos|talones|cuadriceps|abduccion/i.test(
        normalizeText(name),
      ),
  },
  {
    key: 'Core',
    match: (name) => /plank|plancha|superman|mountain climbers/i.test(normalizeText(name)),
  },
  {
    key: 'Cardio / Movilidad',
    match: (name) =>
      /burpees|cardio|sprint|caminata|estiramientos|saltos en caja|marcha en sitio/i.test(
        normalizeText(name),
      ),
  },
]

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function inferCategory(name) {
  const rule = CATEGORY_RULES.find((entry) => entry.match(name))
  return rule?.key || 'General'
}

function inferTrackingMode(name) {
  const normalized = normalizeText(name)

  if (/^plank$|plancha/.test(normalized)) {
    return 'core'
  }

  if (/curl/.test(normalized)) {
    return 'curl'
  }

  if (
    /press|flexion|fondos|aperturas|cruce de poleas|patada de triceps|extension de triceps|elevaciones frontales|elevaciones laterales|press arnold|press frances/.test(
      normalized,
    )
  ) {
    return 'press'
  }

  if (
    /sentadilla|zancadas|estocadas|peso muerto|hip thrust|prensa|gemelos|talones|cuadriceps|abduccion/.test(
      normalized,
    )
  ) {
    return 'squat'
  }

  return 'manual'
}

function buildDescription(category, trackingMode) {
  if (trackingMode === 'press' || trackingMode === 'squat' || trackingMode === 'curl' || trackingMode === 'core') {
    return `${category} con seguimiento en cámara`
  }

  return `${category} en modo guía`
}

export const TRAINING_EXERCISES = RAW_EXERCISES.map((name) => {
  const category = inferCategory(name)
  const trackingMode = inferTrackingMode(name)

  return {
    name,
    category,
    trackingMode,
    description: buildDescription(category, trackingMode),
    liveLabel:
      trackingMode === 'manual' ? 'Modo guía' : trackingMode === 'core' ? 'Core' : 'Live',
  }
})

export const TRAINING_EXERCISES_BY_NAME = TRAINING_EXERCISES.reduce((acc, item) => {
  acc[item.name] = item
  return acc
}, {})

export const TRAINING_EXERCISE_GROUPS = Object.entries(
  TRAINING_EXERCISES.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }

    acc[item.category].push(item)
    return acc
  }, {}),
).map(([category, items]) => ({
  category,
  items: items.sort((a, b) => a.name.localeCompare(b.name, 'es')),
}))

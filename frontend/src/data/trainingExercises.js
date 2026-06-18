import exerciseImageFiles from './exerciseImageManifest.json'

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
  'Flexiones Diamante',
  'Flexiones de Pecho',
  'Flexiones en Pared o Rodillas',
  'Flexiones Rusas de Antebrazos',
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
  'Remo con Mancuerna Apoyado en Banco',
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
  'Zancadas Alternas por Tiempo',
  'Zancadas con Mancuernas',
  'Saltos con Zancada Alterna',
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
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizeExerciseName(value) {
  return normalizeText(value).replace(/\s+/g, ' ').trim()
}

const EXERCISE_IMAGE_FOLDER = '/GymImagenes'

function stripAccents(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function removeParentheticalContent(value) {
  return value.replace(/\s*\((.*?)\)\s*/g, ' ')
}

function normalizeImageStem(value) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const EXERCISE_IMAGE_OVERRIDES = {
  [normalizeText('Plank')]: 'Plancha abdominal.jpg',
  [normalizeText('Curl de Bíceps con Mancuernas')]: 'Curl de Bíceps con Mancuernas.png',
  [normalizeText('Remo con Banda o Mancuerna')]: 'Remo con mancuerna.jpg',
  [normalizeText('Marcha en Sitio Rodillas Altas')]: 'Marcha en Sitio Rodillas Altas.jpg',
  [normalizeText('Plank en Rodillas')]: 'Plancha en rodillas.jpg',
}

const IMAGE_INDEX = Array.isArray(exerciseImageFiles)
  ? exerciseImageFiles.map((fileName) => {
      const lastDotIndex = fileName.lastIndexOf('.')
      const stem = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName
      return {
        fileName,
        normalized: normalizeImageStem(stripAccents(removeParentheticalContent(stem))).toLowerCase(),
      }
    })
  : []

function getImageMatchScore(exerciseNormalized, fileNormalized) {
  if (!fileNormalized) return 0
  if (exerciseNormalized === fileNormalized) return 4
  if (exerciseNormalized.includes(fileNormalized)) return 3
  if (fileNormalized.includes(exerciseNormalized)) return 2
  return 0
}

function resolveExerciseImagePath(name) {
  const normalizedName = normalizeImageStem(stripAccents(removeParentheticalContent(name))).toLowerCase()
  const overrideFileName = EXERCISE_IMAGE_OVERRIDES[normalizeText(name)]
  if (overrideFileName) {
    return encodeURI(`${EXERCISE_IMAGE_FOLDER}/${overrideFileName}`)
  }

  const bestMatch = IMAGE_INDEX
    .map((entry) => ({
      ...entry,
      score: getImageMatchScore(normalizedName, entry.normalized),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.normalized.length - a.normalized.length)[0]

  return bestMatch ? encodeURI(`${EXERCISE_IMAGE_FOLDER}/${bestMatch.fileName}`) : null
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

  if (/rusa|antebrazo/.test(normalized)) {
    return 'russian'
  }

  if (
    /press militar|press de hombros|press de banca|press inclinado|press declinado|press arnold|press frances|flexion|fondos|remo/.test(
      normalized,
    )
  ) {
    return 'press'
  }

  if (
    /sentadilla|zancadas|estocadas/.test(
      normalized,
    )
  ) {
    return 'squat'
  }

  return 'manual'
}

function inferCountMode(name, category, trackingMode) {
  const normalized = normalizeText(name)

  if (
    /plank|plancha|wall sit|caminata|caminar|bici|bicicleta|caminadora|cardio|sprint|trote|marcha en sitio|estiramientos|movilidad|rotaci[oó]n|saltos en caja|burpees|mountain climbers|superman hold|hold/.test(
      normalized,
    ) ||
    category === 'Cardio / Movilidad' ||
    normalized.includes('plank')
  ) {
    return 'timer'
  }

  if (trackingMode === 'manual') {
    return 'manual'
  }

  return 'reps'
}

function inferDefaultDurationSeconds(name, countMode) {
  if (countMode !== 'timer') {
  return 0
}

  const normalized = normalizeText(name)
  if (/plank|plancha/.test(normalized)) {
    return 45
  }

  return 60
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
  const countMode = inferCountMode(name, category, trackingMode)
  const imageUrl = resolveExerciseImagePath(name)

  return {
    name,
    category,
    mode: countMode,
    trackingMode,
    countMode,
    requiresPose: countMode === 'reps' && trackingMode !== 'manual',
    defaultDurationSeconds: inferDefaultDurationSeconds(name, countMode),
    description: buildDescription(category, trackingMode),
    imageUrl,
    liveLabel:
      countMode === 'timer'
        ? 'Timer'
        : trackingMode === 'manual'
          ? 'Modo guía'
          : trackingMode === 'core'
            ? 'Core'
            : 'Live',
  }
})

export const TRAINING_EXERCISES_BY_NAME = TRAINING_EXERCISES.reduce((acc, item) => {
  acc[item.name] = item
  return acc
}, {})

export const TRAINING_EXERCISES_BY_NORMALIZED_NAME = TRAINING_EXERCISES.reduce((acc, item) => {
  acc[normalizeExerciseName(item.name)] = item
  return acc
}, {})

export function resolveTrainingExercise(name) {
  const normalizedName = normalizeExerciseName(name)
  if (!normalizedName) return null

  return (
    TRAINING_EXERCISES_BY_NAME[name] ||
    TRAINING_EXERCISES_BY_NORMALIZED_NAME[normalizedName] ||
    TRAINING_EXERCISES.find((item) => normalizeExerciseName(item.name) === normalizedName) ||
    null
  )
}

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

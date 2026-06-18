import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import PoseViewport from '../components/training/PoseViewport'
import TrainingSessionHeader from '../components/training/TrainingSessionHeader'
import { useCameraStream } from '../hooks/useCameraStream'
import { useHandGesture } from '../hooks/useHandGesture'
import { useLivePose } from '../hooks/useLivePose'
import {
  completeRoutineSet,
  completeRoutineDay,
  getCurrentTrainingState,
  getRoutineProgress,
  startRoutineDay,
  recordRoutineReps,
} from '../services/trainingService'

const DEFAULT_EXERCISE_NAME = 'Sentadilla con Barra'

const normalizeTrainingPlan = (planPayload) => {
  if (!planPayload) return null
  const planEnvelope =
    planPayload.planSnapshot ||
    planPayload.selectedPlanSnapshot ||
    planPayload.training_plan_snapshot ||
    planPayload.plan_snapshot ||
    (planPayload.plan?.plan ? planPayload.plan : planPayload)
  const nestedPlan = planEnvelope.plan?.days ? planEnvelope.plan : null
  const resolvedPlan = nestedPlan?.plan || planEnvelope.plan || null
  const days = planEnvelope.days || resolvedPlan?.days || null

  if (!days && !resolvedPlan?.days) return null

  const currentDay = planPayload.current_day || planPayload.currentDay || planEnvelope.current_day || planEnvelope.currentDay || null
  const planVariant = planEnvelope.plan_variant || planEnvelope.variant || planEnvelope.selectedVariant || planPayload.plan_variant || planPayload.variant || planPayload.selectedVariant || null
  const frequency = planEnvelope.frequency || planEnvelope.frequency_level || planPayload.frequency || planPayload.frequency_level || null

  return {
    ...planEnvelope,
    ...(resolvedPlan || {}),
    days: days || resolvedPlan?.days || [],
    plan_type: resolvedPlan?.plan_type || planEnvelope.plan_type || planPayload.plan_type || null,
    plan_variant: planVariant,
    variant: planVariant,
    selectedVariant: planVariant,
    frequency,
    frequency_level: planEnvelope.frequency_level || frequency,
    current_day: currentDay,
  }
}

const resolveRoutineDayNumber = (day) => {
  const rawValue =
    day?.day_number ??
    day?.dayNumber ??
    day?.number ??
    null

  const dayNumber = Number(rawValue)
  return Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : null
}

const getExerciseDisplayName = (exercise) =>
  exercise?.name || exercise?.exercise_name || exercise?.exerciseName || 'Ejercicio'

const getExerciseDisplayGroup = (exercise) =>
  exercise?.muscle_group ||
  exercise?.muscleGroup ||
  exercise?.category ||
  exercise?.group ||
  exercise?.target_muscle ||
  exercise?.targetMuscle ||
  'Ejercicio del plan'

const getExerciseBackendImageUrl = (exercise) =>
  exercise?.image_url ||
  exercise?.imageUrl ||
  exercise?.image ||
  exercise?.image_uri ||
  exercise?.imageUri ||
  null

const EXERCISE_MODE_PATTERNS = [
  { mode: 'core', pattern: /plank|plancha|ab wheel|ab-wheel|hollow|dead bug|bird dog/i },
  { mode: 'press', pattern: /press|overhead|shoulder|military|militar/i },
  { mode: 'curl', pattern: /curl|bíceps|biceps|martillo|hammer/i },
  { mode: 'hold', pattern: /wall sit|sentadilla isom[eé]trica|isometric|iso hold|hold/i },
  { mode: 'squat', pattern: /sentadilla|squat|estocad|zancad|lunge|peso muerto|deadlift|hip thrust|glute bridge|puente de gluteo|gemel|calf|step up|box jump/i },
  { mode: 'squat', pattern: /polichinela|burpee|marcha en sitio|rodillas altas|high knees|mountain climber|mountain climbers/i },
]

const EXERCISE_OVERRIDES = [
  {
    pattern: /sentadilla al caj[oó]n/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /zancadas alternas por tiempo/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /saltos con zancada alterna/i,
    trackingMode: 'squat',
    countMode: 'timer',
    defaultDurationSeconds: 30,
  },
  {
    pattern: /polichinelas?/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /burpees?/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /marcha en sitio rodillas altas|rodillas altas|high knees/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /mountain climbers?|escaladores?/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /estocadas est[aá]ticas/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /flexiones en pared o rodillas/i,
    trackingMode: 'press',
    countMode: 'reps',
  },
  {
    pattern: /flexiones de pecho/i,
    trackingMode: 'press',
    countMode: 'reps',
  },
  {
    pattern: /flexiones diamante/i,
    trackingMode: 'press',
    countMode: 'reps',
  },
  {
    pattern: /remo sentado con banda/i,
    trackingMode: 'row',
    countMode: 'reps',
  },
  {
    pattern: /elevaciones de talones sentado/i,
    trackingMode: 'squat',
    countMode: 'reps',
  },
  {
    pattern: /flexiones rusas de antebrazos/i,
    trackingMode: 'russian',
    countMode: 'reps',
  },
  {
    pattern: /remo con mancuerna apoyado en banco/i,
    trackingMode: 'row',
    countMode: 'reps',
  },
  {
    pattern: /remo con banda o mancuerna/i,
    trackingMode: 'row',
    countMode: 'reps',
  },
  {
    pattern: /hip thrust en suelo/i,
    trackingMode: 'manual',
    countMode: 'timer',
    defaultDurationSeconds: 60,
  },
  {
    pattern: /elevaciones de talones sentado/i,
    trackingMode: 'manual',
    countMode: 'timer',
    defaultDurationSeconds: 60,
  },
]

const resolveExerciseOverride = (exercise) => {
  const searchable = normalizeExerciseLabel(`${getExerciseDisplayName(exercise)} ${getExerciseDisplayGroup(exercise)}`)
  return EXERCISE_OVERRIDES.find((item) => item.pattern.test(searchable)) || null
}

const resolveExerciseTrackingMode = (exercise) => {
  const override = resolveExerciseOverride(exercise)
  if (override?.trackingMode) return override.trackingMode

  const directMode = String(exercise?.trackingMode || exercise?.mode || exercise?.countMode || '').trim().toLowerCase()
  if (directMode) {
    if (['squat', 'press', 'curl', 'core', 'manual', 'hold', 'russian', 'row'].includes(directMode)) return directMode
    if (directMode === 'timer') return 'core'
  }

  const displayName = String(getExerciseDisplayName(exercise)).trim().toLowerCase()
  const category = String(getExerciseDisplayGroup(exercise)).trim().toLowerCase()
  const searchable = `${displayName} ${category}`

  const match = EXERCISE_MODE_PATTERNS.find((item) => item.pattern.test(searchable))
  return match?.mode || 'manual'
}

const buildRuntimeExerciseDefinition = (exercise, fallbackName = '') => {
  const displayName = getExerciseDisplayName(exercise) || fallbackName || DEFAULT_EXERCISE_NAME
  const backendImageUrl = getExerciseBackendImageUrl(exercise)
  const imageUrl = backendImageUrl || null
  const category = getExerciseDisplayGroup(exercise) || 'Ejercicio del plan'
  const override = resolveExerciseOverride({ ...exercise, name: displayName, category })
  const directCountMode = exercise?.mode || exercise?.countMode || null
  const trackingMode = resolveExerciseTrackingMode({ ...exercise, name: displayName, category })
  const countMode = directCountMode || override?.countMode || inferExerciseCountMode(exercise)
  const defaultDurationSeconds =
    Number(override?.defaultDurationSeconds || 0) ||
    Number(exercise?.defaultDurationSeconds ?? exercise?.duration_seconds ?? exercise?.durationSeconds ?? exercise?.duration ?? 0) ||
    getExerciseDefaultDurationSeconds({ ...exercise, name: displayName, mode: countMode })

  return {
    ...exercise,
    name: displayName,
    category,
    trackingMode: trackingMode || 'manual',
    mode: countMode,
    countMode,
    requiresPose:
      exercise?.requiresPose ??
      (trackingMode !== 'manual'),
    defaultDurationSeconds,
    description:
      exercise?.description ||
      `${category} en modo ${trackingMode || 'guía'}`,
    imageUrl,
    liveLabel:
      exercise?.liveLabel ||
      (countMode === 'timer'
        ? 'Timer'
        : trackingMode === 'manual'
          ? 'Modo guía'
          : trackingMode === 'core'
            ? 'Core'
            : 'Live'),
  }
}

const parseExerciseDurationSeconds = (value) => {
  if (value == null) return 0

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : 0
  }

  const text = String(value).trim().toLowerCase()
  if (!text) return 0

  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(seg(?:undos?)?|sec(?:onds?)?|s|min(?:utos?)?|m)\b/)
  if (!match) return 0

  const amount = Number(match[1].replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return 0

  const unit = match[2]
  return unit.startsWith('min') || unit === 'm' ? Math.round(amount * 60) : Math.round(amount)
}

const TIMER_EXERCISE_PATTERN =
  /plank|plancha|caminata|bici|cardio|sprint|marcha en sitio|estiramientos|saltos en caja|burpees|mountain climbers|remo/

const inferExerciseCountMode = (exercise) => {
  const override = resolveExerciseOverride(exercise)
  if (override?.countMode) return override.countMode

  const directMode = exercise?.mode || exercise?.countMode
  if (directMode) return directMode

  const displayName = String(getExerciseDisplayName(exercise) || '').trim().toLowerCase()
  const displayGroup = String(getExerciseDisplayGroup(exercise) || '').trim().toLowerCase()

  if (/\b(?:por\s+tiempo|tiempo|seg(?:undos?)?|seconds?|s)\b/i.test(displayName) || /\b(?:por\s+tiempo|tiempo|seg(?:undos?)?|seconds?|s)\b/i.test(displayGroup)) {
    return 'timer'
  }

  if (TIMER_EXERCISE_PATTERN.test(displayName) || displayGroup.includes('cardio') || displayGroup.includes('core')) {
    return 'timer'
  }

  if (exercise?.trackingMode === 'manual') {
    return 'manual'
  }

  return 'reps'
}

const getExerciseDefaultDurationSeconds = (exercise) => {
  const override = resolveExerciseOverride(exercise)
  if (override?.defaultDurationSeconds) {
    return Number(override.defaultDurationSeconds) || 0
  }

  if (exercise?.defaultDurationSeconds) {
    return Number(exercise.defaultDurationSeconds) || 0
  }

  const directMode = String(exercise?.mode || exercise?.countMode || '').trim().toLowerCase()
  const displayName = String(getExerciseDisplayName(exercise) || '').trim().toLowerCase()
  if (directMode === 'hold') {
    return 30
  }

  if (/plank|plancha/.test(displayName)) {
    return 45
  }

  if (TIMER_EXERCISE_PATTERN.test(displayName)) {
    return 60
  }

  return 0
}

const getExerciseImageUrl = (exercise) => {
  return getExerciseBackendImageUrl(exercise)
}

function ExerciseGuideImage({ src, alt, wrapperClassName = '', imageClassName = '', placeholderClassName = '' }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.10),transparent_42%),linear-gradient(135deg,#0a1220_0%,#111c33_45%,#08101d_100%)] text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted ${placeholderClassName}`}
      >
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] text-white/60">
          Sin imagen precisa
        </span>
      </div>
    )
  }

  return (
    <div className={wrapperClassName}>
      <img
        src={src}
        alt={alt}
        className={imageClassName}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  )
}

const normalizeExerciseLabel = (value) => String(value || '').trim().toLowerCase()

const createClientEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const COMPLETED_ROUTINE_STORAGE_KEY = 'gympose_last_completed_routine'

const saveCompletedRoutineSummary = ({
  day,
  plan,
  summary,
  exercisesCount,
}) => {
  if (typeof window === 'undefined') return

  const payload = {
    day_number: day?.day_number ?? day?.day_id ?? day?.id ?? null,
    day_name: day?.day_name || day?.day_label || 'Rutina completada',
    plan_type: plan?.plan_type || plan?.type || 'Plan de entrenamiento',
    variant: plan?.variant || plan?.selectedVariant || null,
    completed_at: summary?.completed_at || day?.completed_at || new Date().toISOString(),
    progress_pct: Number(summary?.progress_pct ?? day?.progress_pct ?? 100),
    total_exercises: Number(summary?.total_exercises ?? day?.total_exercises ?? exercisesCount ?? 0),
    total_sets: Number(summary?.total_sets ?? day?.total_sets ?? 0),
    total_reps: Number(summary?.total_reps ?? day?.total_reps_completed ?? 0),
  }

  localStorage.setItem(COMPLETED_ROUTINE_STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new Event('gympose-routine-completed'))
}

const getRoutineExerciseIdentity = (exercise) => {
  if (!exercise) return ''
  const rawValue =
    exercise.id ??
    exercise.exercise_id ??
    exercise.exerciseId ??
    exercise.name ??
    exercise.exercise_name ??
    exercise.title ??
    ''
  return String(rawValue).trim().toLowerCase()
}

const mergeRoutineExerciseLists = (previousExercises = [], nextExercises = []) => {
  const mergedByKey = new Map()

  previousExercises.forEach((exercise) => {
    const key = getRoutineExerciseIdentity(exercise)
    if (key) mergedByKey.set(key, { ...exercise })
  })

  nextExercises.forEach((exercise) => {
    const key = getRoutineExerciseIdentity(exercise)
    if (!key) return
    const current = mergedByKey.get(key) || {}
    mergedByKey.set(key, { ...current, ...exercise })
  })

  return Array.from(mergedByKey.values())
}

const mergeRoutineDayProgress = (previousDay, nextDay) => {
  if (!nextDay) return previousDay || null
  if (!previousDay) return nextDay

  const previousDayNumber = resolveRoutineDayNumber(previousDay)
  const nextDayNumber = resolveRoutineDayNumber(nextDay)
  if (previousDayNumber != null && nextDayNumber != null && previousDayNumber !== nextDayNumber) {
    return nextDay
  }

  const previousExercises = Array.isArray(previousDay.exercises) ? previousDay.exercises : []
  const nextExercises = Array.isArray(nextDay.exercises) ? nextDay.exercises : []
  const currentExercise = nextDay.current_exercise || nextDay.currentExercise || null

  const mergedExercises = mergeRoutineExerciseLists(previousExercises, nextExercises)
  if (currentExercise) {
    const currentKey = getRoutineExerciseIdentity(currentExercise)
    const currentIndex = mergedExercises.findIndex((exercise) => getRoutineExerciseIdentity(exercise) === currentKey)
    if (currentIndex >= 0) {
      mergedExercises[currentIndex] = {
        ...mergedExercises[currentIndex],
        ...currentExercise,
      }
    } else if (currentKey) {
      mergedExercises.push({ ...currentExercise })
    }
  }

  const mergedSessionSummary = {
    ...(previousDay.session_summary || previousDay.sessionSummary || {}),
    ...(nextDay.session_summary || nextDay.sessionSummary || {}),
  }

  const mergedCurrentExercise = currentExercise
    ? {
        ...(previousDay.current_exercise || previousDay.currentExercise || {}),
        ...currentExercise,
      }
    : (previousDay.current_exercise || previousDay.currentExercise || null)

  return {
    ...previousDay,
    ...nextDay,
    exercises: mergedExercises.length ? mergedExercises : (nextExercises.length ? nextExercises : previousExercises),
    current_exercise: mergedCurrentExercise,
    currentExercise: mergedCurrentExercise,
    session_summary: mergedSessionSummary,
    sessionSummary: mergedSessionSummary,
  }
}

const mergeRoutineProgressPayload = (previousProgress, payload) => {
  if (!payload) return previousProgress || null
  if (!previousProgress) return payload

  const previousDay =
    previousProgress.current_day ||
    previousProgress.currentDay ||
    previousProgress.day ||
    previousProgress.current_routine_day ||
    null
  const nextDay =
    payload.current_day ||
    payload.currentDay ||
    payload.day ||
    payload.current_routine_day ||
    null

  if (!previousDay || !nextDay) {
    return {
      ...previousProgress,
      ...payload,
    }
  }

  const mergedDay = mergeRoutineDayProgress(previousDay, nextDay)
  const mergedSummary = {
    ...(previousProgress.session_summary || previousProgress.sessionSummary || {}),
    ...(payload.session_summary || payload.sessionSummary || {}),
    ...(mergedDay?.session_summary || mergedDay?.sessionSummary || {}),
  }

  return {
    ...previousProgress,
    ...payload,
    current_day: mergedDay,
    currentDay: mergedDay,
    day: mergedDay,
    current_routine_day: mergedDay,
    exercises: mergedDay?.exercises || payload.exercises || previousProgress.exercises || [],
    session_summary: mergedSummary,
    sessionSummary: mergedSummary,
  }
}

const formatDuration = (totalSeconds) => {
  const seconds = Number(totalSeconds || 0)
  if (!seconds || seconds < 0) return '0 min'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m${remainingSeconds ? ` ${remainingSeconds}s` : ''}`
  }

  return `${remainingSeconds}s`
}

const formatCountdown = (totalSeconds) => {
  const seconds = Math.max(0, Number(totalSeconds || 0))
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const formatSetLabel = (currentSet, targetSet) => {
  const current = Math.max(Number(currentSet || 0), 1)
  const target = Math.max(Number(targetSet || 0), current)
  return `Serie ${current}/${target}`
}

const getExerciseMetricLabel = (mode) => {
  if (mode === 'hold') return 'Sostén'
  if (mode === 'timer') return 'Tiempo'
  return 'Reps'
}

const getPoseCorrectionPrefix = ({ trackingMode, exerciseName, exerciseCountMode }) => {
  const label = String(exerciseName || '').toLowerCase()
  if (/curl|bíceps|biceps|martillo|hammer/.test(label) || trackingMode === 'curl') {
    return 'Corrige el curl: baja el brazo completo y vuelve a extenderlo'
  }
  if (/remo|row/.test(label) || trackingMode === 'row') {
    return 'Corrige el remo: lleva el codo hacia atrás y controla la vuelta'
  }
  if (/rusa|antebrazo/.test(label) || trackingMode === 'russian') {
    return 'Corrige la flexión rusa: baja al antebrazo y regresa con control'
  }
  if (/press|overhead|shoulder|military|militar/.test(label) || trackingMode === 'press') {
    return 'Corrige el press: sube recto por encima de la cabeza y evita inclinarte'
  }
  if (/plank|plancha/.test(label) || trackingMode === 'core') {
    return 'Corrige el core: alinea hombros, cadera y talones'
  }
  if (/polichinela|jumping jack/.test(label)) {
    return 'Corrige el polichinela: abre y cierra brazos y piernas por completo'
  }
  if (/burpee/.test(label)) {
    return 'Corrige el burpee: baja al suelo y vuelve a subir completo'
  }
  if (/rodillas altas|high knees|marcha en sitio/.test(label)) {
    return 'Corrige las rodillas altas: eleva la rodilla por encima de la cadera'
  }
  if (/mountain climber|mountain climbers|escalador/.test(label)) {
    return 'Corrige el mountain climber: acerca la rodilla al pecho y alterna'
  }
  if (exerciseCountMode === 'timer' || exerciseCountMode === 'hold') return 'Corrige el tiempo: mantén el ritmo y completa el contador'
  return 'Corrige la postura: ajusta tu posición y repite'
}

const formatPoseFeedbackMessage = ({ message, requiresPose, isValid, trackingMode, exerciseName, exerciseCountMode }) => {
  const text = String(message || '').trim()
  if (!text) return text
  if (!requiresPose || isValid || text.toLowerCase().startsWith('corrige')) return text

  const prefix = getPoseCorrectionPrefix({ trackingMode, exerciseName, exerciseCountMode })
  return `${prefix}: ${text}`
}

const getSetCompletionCopy = ({ currentSet, targetSets, restSeconds, isCompleted }) => {
  const current = Math.max(Number(currentSet || 0), 1)
  const target = Math.max(Number(targetSets || 0), current)
  const nextSet = Math.min(current + 1, target)

  if (isCompleted) {
    return {
      title: 'Ejercicio completado',
      message: 'Ya guardamos este ejercicio como completado en el backend.',
    }
  }

  if (Number(target) > current && Number(restSeconds || 0) > 0) {
    return {
      title: 'Serie completada',
      message: `Descanso antes de la siguiente serie: ${formatDuration(restSeconds)}. Luego continúa con ${formatSetLabel(nextSet, target)}.`,
    }
  }

  return {
    title: 'Serie completada',
    message:
      Number(target) > current
        ? `Prepara ${formatSetLabel(nextSet, target)}.`
        : 'La serie quedó guardada y puedes continuar con el siguiente ejercicio.',
  }
}

const formatDateTime = (value) => {
  if (!value) return 'Pendiente'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Pendiente'

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function Training() {
  const location = useLocation()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lastFeedbackRef = useRef('')
  const lastRepCountRef = useRef(0)
  const lastCompletionRef = useRef(false)
  const lastSyncedRoutineExerciseRef = useRef('')
  const lastSyncedRoutineSetRef = useRef('')
  const lastCompletedSetRef = useRef('')
  const lastCompletedDayRef = useRef('')
  const hasManualExerciseSelectionRef = useRef(false)
  const plankTimerRef = useRef(null)
  const lastLoadedRoutineDayRef = useRef('')
  const token = localStorage.getItem('gympose_token')

  const [isSessionLive, setIsSessionLive] = useState(false)
  const [isSessionPaused, setIsSessionPaused] = useState(false)
  const [notice, setNotice] = useState(null)
  const [selectedRoutineDay, setSelectedRoutineDay] = useState(location.state?.routineDay || null)
  const [selectedRoutineDayId, setSelectedRoutineDayId] = useState(
    resolveRoutineDayNumber(location.state?.routineDay) || location.state?.routineDayId || null,
  )
  const [exerciseName, setExerciseName] = useState(() => {
    const routineDay = location.state?.routineDay || null
    const firstExerciseName = routineDay?.exercises?.[0]?.name
    return firstExerciseName || DEFAULT_EXERCISE_NAME
  })
  const [curlStartArm, setCurlStartArm] = useState('left')
  const [curlRepsPerArm, setCurlRepsPerArm] = useState(10)
  const [plankSeconds, setPlankSeconds] = useState(0)
  const [plankStarted, setPlankStarted] = useState(false)
  const [timedExerciseSeconds, setTimedExerciseSeconds] = useState(0)
  const [manualTimerMinutesByExercise, setManualTimerMinutesByExercise] = useState({})
  const [isSetResting, setIsSetResting] = useState(false)
  const [restCountdown, setRestCountdown] = useState(0)
  const showExerciseCatalog = false
  const [routineProgress, setRoutineProgress] = useState(null)
  const [routineLoading, setRoutineLoading] = useState(false)
  const [routineError, setRoutineError] = useState(null)
  const [isCompletingRoutine, setIsCompletingRoutine] = useState(false)
  const [selectedTrainingPlan, setSelectedTrainingPlan] = useState(location.state?.trainingPlan || null)
  const [hasBootstrappedRoutine, setHasBootstrappedRoutine] = useState(false)
  const hasRouteTrainingPlan = Boolean(location.state?.trainingPlan)
  const routeRoutineDay = location.state?.routineDay || null

  useEffect(() => {
    if (selectedRoutineDayId || !selectedTrainingPlan?.current_day) return

    const cachedCurrentDay = selectedTrainingPlan.current_day
    setSelectedRoutineDay(cachedCurrentDay)
    setSelectedRoutineDayId(resolveRoutineDayNumber(cachedCurrentDay))
  }, [selectedRoutineDayId, selectedTrainingPlan])

  const savedRoutineDays = useMemo(
    () => (Array.isArray(selectedTrainingPlan?.days) ? selectedTrainingPlan.days : []),
    [selectedTrainingPlan],
  )
  const savedRoutineDayNumbers = useMemo(
    () =>
      new Set(
        savedRoutineDays
          .map((day) => resolveRoutineDayNumber(day))
          .filter((value) => value != null),
      ),
    [savedRoutineDays],
  )
  const routineProgressDayState = routineProgress?.current_day || routineProgress?.currentDay || null
  const routineProgressDayNumber = resolveRoutineDayNumber(routineProgressDayState)
  const selectedRoutineDayMatchesProgress =
    selectedRoutineDayId != null &&
    routineProgressDayNumber != null &&
    Number(selectedRoutineDayId) === Number(routineProgressDayNumber)
  const routineDayState =
    selectedRoutineDayId == null || selectedRoutineDayMatchesProgress ? routineProgressDayState : null
  const routineCurrentExerciseState = routineDayState?.current_exercise || routineDayState?.currentExercise || null
  const sessionSummary =
    routineDayState?.session_summary ||
    routineDayState?.sessionSummary ||
    routineProgress?.session_summary ||
    routineProgress?.sessionSummary ||
    null
  const routineCurrentExerciseName =
    routineCurrentExerciseState?.name ||
    routineCurrentExerciseState?.exercise_name ||
    routineCurrentExerciseState?.exerciseName ||
    null
  const selectedRoutineDayNumber = resolveRoutineDayNumber(selectedRoutineDay)
  const planRoutineDay =
    (hasRouteTrainingPlan ? routeRoutineDay : null) ||
    savedRoutineDays.find((day) => resolveRoutineDayNumber(day) === selectedRoutineDayNumber) ||
    selectedRoutineDay ||
    savedRoutineDays[0] ||
    null
  const routineExerciseCandidates = [
    routineDayState?.exercises,
    selectedRoutineDay?.exercises,
    planRoutineDay?.exercises,
  ]
  const routineExerciseEntries =
    routineExerciseCandidates.find((entries) => Array.isArray(entries) && entries.length > 0) || []
  const activeRoutineDay =
    (routineDayState &&
    (Array.isArray(routineDayState.exercises) ? routineDayState.exercises.length > 0 : true)
      ? routineDayState
      : null) ||
    selectedRoutineDay ||
    planRoutineDay
  const routineWeekDays = savedRoutineDays.slice(0, 7)
  const routineTodayLabel = activeRoutineDay?.day_name || activeRoutineDay?.day_label || 'Rutina de hoy'
  const activeRoutineExerciseIndex = routineExerciseEntries.findIndex((entry) => {
    const entryName = getExerciseDisplayName(entry)
    return normalizeExerciseLabel(entryName) === normalizeExerciseLabel(exerciseName)
  })
  const showExerciseDebugControls = import.meta.env.DEV || localStorage.getItem('gympose_routine_debug') === '1'

  const selectRoutineExerciseAtIndex = useCallback(
    (nextIndex) => {
      if (!routineExerciseEntries.length) return

      const totalExercises = routineExerciseEntries.length
      const normalizedIndex = ((nextIndex % totalExercises) + totalExercises) % totalExercises
      const nextExercise = routineExerciseEntries[normalizedIndex]
      if (!nextExercise) return

      const displayName = getExerciseDisplayName(nextExercise)

      hasManualExerciseSelectionRef.current = true
      setExerciseName(displayName)
    },
    [routineExerciseEntries],
  )

  const handlePreviousExercise = useCallback(() => {
    const baseIndex = activeRoutineExerciseIndex >= 0 ? activeRoutineExerciseIndex : 0
    selectRoutineExerciseAtIndex(baseIndex - 1)
  }, [activeRoutineExerciseIndex, selectRoutineExerciseAtIndex])

  const handleNextExercise = useCallback(() => {
    const baseIndex = activeRoutineExerciseIndex >= 0 ? activeRoutineExerciseIndex : -1
    selectRoutineExerciseAtIndex(baseIndex + 1)
  }, [activeRoutineExerciseIndex, selectRoutineExerciseAtIndex])

  const activeRoutineExerciseProgress =
    routineCurrentExerciseState ||
    routineExerciseEntries.find((entry) => {
      const entryName = entry?.name || entry?.exercise_name
      return entryName && entryName === routineCurrentExerciseName
    }) ||
    null
  const activeRoutineExercisePlanEntry =
    routineExerciseEntries.find((entry) => {
      const entryName = entry?.name || entry?.exercise_name
      return entryName && normalizeExerciseLabel(entryName) === normalizeExerciseLabel(routineCurrentExerciseName)
    }) || null
  const manuallySelectedExerciseSource = hasManualExerciseSelectionRef.current
    ? routineExerciseEntries.find((entry) => {
        const entryName = entry?.name || entry?.exercise_name
        return entryName && normalizeExerciseLabel(entryName) === normalizeExerciseLabel(exerciseName)
      }) || { name: exerciseName }
    : null
  const activeExerciseSource =
    manuallySelectedExerciseSource ||
    activeRoutineExerciseProgress ||
    activeRoutineExercisePlanEntry ||
    routineCurrentExerciseState ||
    selectedRoutineDay ||
    { name: exerciseName }
  const activeExercise = buildRuntimeExerciseDefinition(activeExerciseSource, exerciseName)
  const trackingMode = activeExercise.trackingMode
  const exerciseCountMode = inferExerciseCountMode(activeExercise)
  const requiresPose = Boolean(activeExercise.requiresPose && exerciseCountMode === 'reps')
  const poseExerciseMode = requiresPose ? trackingMode : 'manual'
  const isTimerExercise = exerciseCountMode === 'timer'
  const isHoldExercise = exerciseCountMode === 'hold'
  const isManualTimedExercise = isTimerExercise && trackingMode === 'manual'
  const isManualExercise = exerciseCountMode === 'manual'
  const isPlankExercise = (isTimerExercise || isHoldExercise) && /plank|plancha/i.test(activeExercise.name)
  const activeExerciseTimerKey = normalizeExerciseLabel(activeExercise.name)
  const currentSetValue =
    activeRoutineExerciseProgress?.current_set ??
      activeRoutineExerciseProgress?.currentSet ??
      activeRoutineExerciseProgress?.set_number ??
    activeRoutineExerciseProgress?.setNumber ??
    null
  const setsTargetValue =
    activeRoutineExerciseProgress?.sets_target ??
    activeRoutineExerciseProgress?.setsTarget ??
    activeRoutineExerciseProgress?.sets ??
    null
  const repsCompletedValue =
    activeRoutineExerciseProgress?.reps_completed_current_set ??
    activeRoutineExerciseProgress?.repsCompletedCurrentSet ??
    activeRoutineExerciseProgress?.reps_completed ??
    activeRoutineExercisePlanEntry?.reps_completed_current_set ??
    activeRoutineExercisePlanEntry?.repsCompletedCurrentSet ??
    activeRoutineExercisePlanEntry?.reps_completed ??
    0
  const repsTargetValue =
    activeRoutineExerciseProgress?.reps_target_value ??
    activeRoutineExerciseProgress?.repsTargetValue ??
    activeRoutineExerciseProgress?.reps_target ??
    activeRoutineExerciseProgress?.reps ??
    activeRoutineExercisePlanEntry?.reps_target_value ??
    activeRoutineExercisePlanEntry?.repsTargetValue ??
    activeRoutineExercisePlanEntry?.reps_target ??
    activeRoutineExercisePlanEntry?.reps ??
    null
  const restSecondsValue = Number(
    activeRoutineExerciseProgress?.rest_seconds ??
    activeRoutineExerciseProgress?.restSeconds ??
    activeRoutineExerciseProgress?.exercise?.rest_seconds ??
      activeRoutineExercisePlanEntry?.rest_seconds ??
      0,
  )
  const manualTimerMinutes = Number(manualTimerMinutesByExercise[activeExerciseTimerKey] || 1)
  const manualTimerTargetSeconds = Math.max(60, manualTimerMinutes * 60)
  const timedTargetSeconds = isManualTimedExercise
    ? manualTimerTargetSeconds
    : (parseExerciseDurationSeconds(
        activeRoutineExerciseProgress?.duration_seconds ??
          activeRoutineExercisePlanEntry?.duration_seconds ??
          activeRoutineExercisePlanEntry?.time ??
          activeRoutineExercisePlanEntry?.duration ??
          0,
      ) || ((isTimerExercise || isHoldExercise) ? getExerciseDefaultDurationSeconds(activeExercise) : 0))
  const isTimedExercise = isTimerExercise || isHoldExercise || timedTargetSeconds > 0
  const timedRemainingSeconds = Math.max(timedTargetSeconds - timedExerciseSeconds, 0)
  const routineStatus = routineDayState?.status || routineCurrentExerciseState?.status || null
  const isRoutineActive = routineStatus === 'in_progress'
  const isRoutineCompleted = routineStatus === 'completed'
  const currentExerciseStatus = activeRoutineExerciseProgress?.status || routineCurrentExerciseState?.status || null
  const currentExerciseCompletedSets = Number(
    activeRoutineExerciseProgress?.sets_completed ??
      activeRoutineExerciseProgress?.setsCompleted ??
      routineCurrentExerciseState?.sets_completed ??
      routineCurrentExerciseState?.setsCompleted ??
      activeRoutineExercisePlanEntry?.sets_completed ??
      activeRoutineExercisePlanEntry?.setsCompleted ??
      0,
  )
  const currentSeriesValue = Number(currentSetValue || (currentExerciseCompletedSets > 0 ? currentExerciseCompletedSets + 1 : 1))
  const plannedSeriesValue = Number(setsTargetValue || activeExercise.sets || activeRoutineExercisePlanEntry?.sets || 1)
  const isSetRestActive = isSetResting && restCountdown > 0
  const isCurrentExerciseCompleted =
    currentExerciseStatus === 'completed' ||
    (Number(setsTargetValue || 0) > 0 && currentExerciseCompletedSets >= Number(setsTargetValue || 0))
  const isCurrentSetCompleted =
    !isCurrentExerciseCompleted &&
    (isSetRestActive ||
      (isTimedExercise
        ? timedExerciseSeconds >= timedTargetSeconds && timedTargetSeconds > 0
        : Number(repsTargetValue || 0) > 0 && Number(repsCompletedValue || 0) >= Number(repsTargetValue || 0)))
  const totalExercisesPlanned = Number(
    sessionSummary?.total_exercises ??
      routineDayState?.total_exercises ??
      routineExerciseEntries.length ??
      0,
  )
  const completedExercisesCount = Number(
    sessionSummary?.completed_exercises ??
      routineDayState?.completed_exercises_count ??
      routineExerciseEntries.filter((exercise) => exercise.status === 'completed').length ??
      0,
  )
  const totalSetsTarget = Number(
    sessionSummary?.total_sets ??
      routineExerciseEntries.reduce((sum, exercise) => sum + Number(exercise.sets_target || 0), 0) ??
      0,
  )
  const totalSetsCompleted = Number(
    sessionSummary?.completed_sets ??
      routineExerciseEntries.reduce((sum, exercise) => sum + Number(exercise.sets_completed || 0), 0) ??
      0,
  )
  const totalRepsCompleted = Number(
    sessionSummary?.total_reps ??
      routineDayState?.total_reps_completed ??
      routineExerciseEntries.reduce((sum, exercise) => sum + Number(exercise.reps_completed_current_set || 0), 0) ??
      0,
  )
  const progressPct = Number(
    sessionSummary?.progress_pct ??
      routineDayState?.progress_pct ??
      (totalExercisesPlanned > 0 ? Math.round((completedExercisesCount / totalExercisesPlanned) * 100) : 0),
  )

  useEffect(() => {
    if (!isManualTimedExercise) return

    setManualTimerMinutesByExercise((current) => {
      if (current[activeExerciseTimerKey]) return current
      return {
        ...current,
        [activeExerciseTimerKey]: Math.max(1, Math.round(Number(activeExercise.defaultDurationSeconds || 60) / 60) || 1),
      }
    })
    setTimedExerciseSeconds(0)
  }, [activeExercise.defaultDurationSeconds, activeExerciseTimerKey, isManualTimedExercise])
  const hasFinalSummary = Boolean(
    sessionSummary?.day_completed || routineDayState?.completed_at || isRoutineCompleted,
  )

  const hydrateRoutineFromResponse = useCallback((data) => {
    if (!data) return null

    const plan = data.plan || data.training_plan || data.active_plan || data.current_plan || null
    const normalizedPlan = normalizeTrainingPlan(plan)
    const looksLikeTopLevelDay =
      data.day_number != null ||
      data.plan_day_number != null ||
      data.routine_id != null ||
      Array.isArray(data.exercises)
    const currentDay =
      data.current_day ||
      data.currentDay ||
      data.day ||
      data.current_routine_day ||
      (looksLikeTopLevelDay ? data : null) ||
      null
    const currentDayNumber = resolveRoutineDayNumber(currentDay)
    if (normalizedPlan && !hasRouteTrainingPlan) {
      setSelectedTrainingPlan(normalizedPlan)
    }

    if (currentDay) {
      setRoutineProgress((currentProgress) => mergeRoutineProgressPayload(currentProgress, data))
      setSelectedRoutineDay(currentDay)
    }

    if (currentDayNumber != null) {
      setSelectedRoutineDayId(currentDayNumber)
      lastLoadedRoutineDayRef.current = String(currentDayNumber)
    }

    const backendExerciseName =
      currentDay?.current_exercise?.name ||
      currentDay?.current_exercise?.exercise_name ||
      currentDay?.currentExercise?.name ||
      currentDay?.currentExercise?.exercise_name ||
      null

    if (backendExerciseName) {
      setExerciseName(backendExerciseName)
      hasManualExerciseSelectionRef.current = false
    }

    return { plan: normalizedPlan, currentDay, currentDayNumber }
  }, [hasRouteTrainingPlan, selectedRoutineDay])

  const syncRoutineProgressFromResponse = useCallback((payload) => {
    if (!payload) return null

    const normalizedPayload =
      payload.current_day || payload.currentDay || payload.day
        ? payload
        : {
            ...payload,
            current_day: payload,
            currentDay: payload,
          }

    return hydrateRoutineFromResponse(normalizedPayload)
  }, [hydrateRoutineFromResponse])

  const loadRoutineProgress = useCallback(async (dayId) => {
    if (!dayId || !token) return null

    setRoutineLoading(true)
    setRoutineError(null)
    try {
      const data = await getRoutineProgress(token, dayId)
      return hydrateRoutineFromResponse(data)
    } catch (error) {
      setRoutineError(error.response?.data?.detail || 'No se pudo cargar el progreso de la rutina')
      return null
    } finally {
      setRoutineLoading(false)
    }
  }, [hydrateRoutineFromResponse, token])

  const loadCurrentTrainingState = useCallback(async () => {
    if (!token) return null

    setRoutineLoading(true)
    setRoutineError(null)
    try {
      const data = await getCurrentTrainingState(token)
      return hydrateRoutineFromResponse(data)
    } catch (error) {
      setRoutineError(error.response?.data?.detail || 'No se pudo cargar la rutina actual')
      return null
    } finally {
      setRoutineLoading(false)
    }
  }, [hydrateRoutineFromResponse, token])

  useEffect(() => {
    if (!token || hasBootstrappedRoutine) return

    let cancelled = false

    const bootstrapPlan = async () => {
      setHasBootstrappedRoutine(true)

      const currentState = await loadCurrentTrainingState()
      if (cancelled) return

      if (currentState?.plan) {
        setSelectedTrainingPlan(currentState.plan)
      }

      if (!selectedRoutineDayId && !currentState?.currentDay && currentState?.plan?.current_day) {
        const backendCurrentDay = currentState.plan.current_day
        setSelectedRoutineDay(backendCurrentDay)
        setSelectedRoutineDayId(resolveRoutineDayNumber(backendCurrentDay))
      }
    }

    void bootstrapPlan()

    return () => {
      cancelled = true
    }
  }, [hasBootstrappedRoutine, loadCurrentTrainingState, selectedRoutineDayId, token])

  const {
    status: cameraStatus,
    error: cameraError,
    startCamera,
    stopCamera,
    isActive: isCameraActive,
    isStarting,
  } = useCameraStream(videoRef)

  useEffect(() => {
    if (!token || !selectedRoutineDayId) return

    const dayKey = String(selectedRoutineDayId)
    if (lastLoadedRoutineDayRef.current === dayKey) {
      return
    }

    let cancelled = false

    const syncSelectedDay = async () => {
      const result = await loadRoutineProgress(selectedRoutineDayId)
      if (cancelled || !result) return
      lastLoadedRoutineDayRef.current = dayKey
    }

    void syncSelectedDay()

    return () => {
      cancelled = true
    }
  }, [loadRoutineProgress, selectedRoutineDayId, token])

  useEffect(() => {
    if (!routineCurrentExerciseName) return

    if (
      hasManualExerciseSelectionRef.current &&
      normalizeExerciseLabel(exerciseName) !== normalizeExerciseLabel(routineCurrentExerciseName)
    ) {
      return
    }

    const nextExerciseName = routineCurrentExerciseName
    if (nextExerciseName !== exerciseName) {
      setExerciseName(nextExerciseName)
    }

    hasManualExerciseSelectionRef.current = false

    if (lastSyncedRoutineExerciseRef.current !== nextExerciseName) {
      lastSyncedRoutineExerciseRef.current = nextExerciseName
      lastRepCountRef.current = 0
      lastCompletedSetRef.current = ''
      setTimedExerciseSeconds(0)
    }
  }, [exerciseName, routineCurrentExerciseName])

  useEffect(() => {
    const nextSetKey = `${routineCurrentExerciseName || ''}:${currentSetValue ?? 'none'}:${setsTargetValue ?? 'none'}`
    if (lastSyncedRoutineSetRef.current === nextSetKey) return

    lastSyncedRoutineSetRef.current = nextSetKey
    lastRepCountRef.current = 0
    lastCompletedSetRef.current = ''
    resetRepCounter?.()
    setTimedExerciseSeconds(0)
  }, [currentSetValue, routineCurrentExerciseName, setsTargetValue])

  useEffect(() => {
    if (routineDayState || selectedRoutineDayId || !savedRoutineDays.length) {
      return
    }

    const firstDay = savedRoutineDays[0]
    if (!firstDay) return

    setSelectedRoutineDay(firstDay)
    setSelectedRoutineDayId(resolveRoutineDayNumber(firstDay))
  }, [routineDayState, savedRoutineDays, selectedRoutineDayId])

  const handleSelectRoutineDay = (day) => {
    if (!day) return
    setSelectedRoutineDay(day)
    const nextDayId = resolveRoutineDayNumber(day)
    setSelectedRoutineDayId(nextDayId)
    hasManualExerciseSelectionRef.current = false

    if (nextDayId) {
      lastLoadedRoutineDayRef.current = String(nextDayId)
      void loadRoutineProgress(nextDayId)
    }
  }

  const handleStartRoutine = async () => {
    if (!selectedRoutineDayId || !token) return

    try {
      setRoutineLoading(true)
      setRoutineError(null)
      const data = await startRoutineDay(token, selectedRoutineDayId, {
        client_event_id: createClientEventId(),
      })
      hydrateRoutineFromResponse(data)

      setNotice({
        tone: 'success',
        title: 'Rutina iniciada',
        message: 'El progreso diario quedó en estado activo.',
      })
    } catch (error) {
      setRoutineError(error.response?.data?.detail || 'No se pudo iniciar la rutina')
    } finally {
      setRoutineLoading(false)
    }
  }

  const shouldTrackHands = isSessionLive && isCameraActive && !isSetRestActive

  const {
    status: poseStatus,
    error: poseError,
    insights,
    repCount,
    repPlan,
    squatValidation,
    resetRepCounter,
  } = useLivePose({
    videoRef,
    canvasRef,
    isRunning: isSessionLive && isCameraActive && !isSessionPaused && !isSetRestActive,
    exerciseMode: poseExerciseMode,
    exerciseLabel: activeExercise.name,
    enablePose: requiresPose,
    curlArmSide: curlStartArm,
    curlRepsPerArm,
  })

  const {
    error: handError,
    isOkGesture,
    gestureConfidence,
  } = useHandGesture({
    videoRef,
    isRunning: shouldTrackHands,
  })

  const beginSetRest = useCallback((seconds) => {
    const duration = Number(seconds || 0)
    if (!duration) return

    lastRepCountRef.current = 0
    resetRepCounter?.()
    setTimedExerciseSeconds(0)
    setIsSetResting(true)
    setRestCountdown(duration)
    queueMicrotask(() => {
      setNotice({
        tone: 'info',
        title: 'Descanso entre series',
        message: `Toma ${formatDuration(duration)} antes de la siguiente serie.`,
      })
    })
  }, [])

  const handleStartNextSeries = useCallback(() => {
    if (!isCurrentSetCompleted || isCurrentExerciseCompleted) return

    lastRepCountRef.current = 0
    lastCompletedSetRef.current = ''
    resetRepCounter?.()
    setTimedExerciseSeconds(0)
    setIsSetResting(false)
    setRestCountdown(0)
    queueMicrotask(() => {
      setNotice({
        tone: 'info',
        title: 'Siguiente serie',
        message: `Prepara ${formatSetLabel(Math.min(currentSeriesValue + 1, plannedSeriesValue), plannedSeriesValue)} de ${activeExercise.name}.`,
      })
    })
  }, [activeExercise.name, currentSeriesValue, isCurrentExerciseCompleted, isCurrentSetCompleted, plannedSeriesValue, resetRepCounter])

  useEffect(() => {
    if (!isSetRestActive || !isSessionLive || !isCameraActive || isSessionPaused) return undefined
    if (!restCountdown) return undefined

    const timerId = window.setInterval(() => {
      setRestCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timerId)
          queueMicrotask(() => {
            setIsSetResting(false)
            setNotice({
              tone: 'success',
              title: 'Descanso finalizado',
              message: 'Continúa con la siguiente serie.',
            })
          })
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [isCameraActive, isSetRestActive, isSessionLive, isSessionPaused, restCountdown])

  useEffect(() => {
    if (!isTimedExercise || !isSessionLive || !isCameraActive || isSessionPaused || isSetRestActive) return undefined
    if (timedExerciseSeconds >= timedTargetSeconds) return undefined

    const timerId = window.setInterval(() => {
      setTimedExerciseSeconds((current) => current + 1)
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [isCameraActive, isSessionLive, isSessionPaused, isSetRestActive, isTimedExercise, currentSetValue, exerciseName, timedExerciseSeconds, timedTargetSeconds])

  useEffect(() => {
    if (!isTimedExercise || !selectedRoutineDayId || !token || !isSessionLive || !routineCurrentExerciseState) return
    if (timedExerciseSeconds < timedTargetSeconds) return

    const currentExerciseKey =
      routineCurrentExerciseState.id ||
      routineCurrentExerciseState.exercise_id ||
      exerciseName
    const setKey = `${currentExerciseKey}:${currentSetValue || 1}`
    if (lastCompletedSetRef.current === setKey) return

    lastCompletedSetRef.current = setKey
    const shouldRestBeforeNextSet =
      Number(restSecondsValue || 0) > 0 &&
      Number(setsTargetValue || 0) > Number(currentSetValue || 0)

    void completeRoutineSet(token, selectedRoutineDayId, {
      exercise_id: routineCurrentExerciseState.id || routineCurrentExerciseState.exercise_id || null,
      exercise_name: exerciseName,
      exercise_mode: exerciseCountMode,
      tracking_mode: trackingMode,
      current_set: currentSetValue,
      sets_target: setsTargetValue,
      reps_completed_current_set: timedTargetSeconds,
      reps_target_value: timedTargetSeconds,
      duration_seconds: timedTargetSeconds,
      seconds_elapsed: timedExerciseSeconds,
      client_event_id: createClientEventId(),
    })
      .then((data) => {
        syncRoutineProgressFromResponse(data)
        const responseExercise =
          data?.current_day?.current_exercise ||
          data?.currentDay?.currentExercise ||
          data?.current_exercise ||
          data?.currentExercise ||
          null
        const responseExerciseStatus = responseExercise?.status || null
        if (shouldRestBeforeNextSet) {
          const copy = getSetCompletionCopy({
            currentSet: currentSetValue,
            targetSets: setsTargetValue,
            restSeconds: restSecondsValue,
            isCompleted: responseExerciseStatus === 'completed',
          })
          setNotice({
            tone: 'success',
            title: copy.title,
            message: copy.message,
          })
          beginSetRest(restSecondsValue)
        } else {
          resetRepCounter?.()
          setTimedExerciseSeconds(0)
          const copy = getSetCompletionCopy({
            currentSet: currentSetValue,
            targetSets: setsTargetValue,
            restSeconds: restSecondsValue,
            isCompleted: responseExerciseStatus === 'completed',
          })
          setNotice({
            tone: 'success',
            title: copy.title,
            message: copy.message,
          })
        }
      })
      .catch(() => {})
  }, [
    beginSetRest,
    currentSetValue,
    exerciseName,
    isSessionLive,
    isTimedExercise,
    restSecondsValue,
    routineCurrentExerciseState,
    selectedRoutineDayId,
    setsTargetValue,
    syncRoutineProgressFromResponse,
    timedExerciseSeconds,
    timedTargetSeconds,
    token,
  ])

  async function handleToggleSession() {
    if (isSessionLive) {
      setIsSessionLive(false)
      setIsSessionPaused(false)
      setIsSetResting(false)
      setRestCountdown(0)
      stopCamera()
      return
    }

  const started = await startCamera()
    setIsSessionLive(started)
    setIsSessionPaused(false)
    setIsSetResting(false)
    setRestCountdown(0)
  }

  const statusMessage = getStatusMessage({
    cameraError,
    poseError,
    cameraStatus,
    poseStatus,
    isSessionLive,
    hasPose: insights.hasPose,
    exerciseLabel: activeExercise.name,
    requiresPose,
    exerciseCountMode,
  })

  useEffect(() => {
    lastFeedbackRef.current = ''
    lastRepCountRef.current = 0
    lastCompletionRef.current = false
    lastSyncedRoutineSetRef.current = ''
    queueMicrotask(() => setPlankSeconds(0))
    queueMicrotask(() => setTimedExerciseSeconds(0))
    queueMicrotask(() => setPlankStarted(false))
    queueMicrotask(() => {
      setIsSetResting(false)
      setRestCountdown(0)
    })
    if (plankTimerRef.current) {
      window.clearInterval(plankTimerRef.current)
      plankTimerRef.current = null
    }
    queueMicrotask(() => setNotice(null))
  }, [exerciseName, curlStartArm, curlRepsPerArm, trackingMode])

  useEffect(() => {
    if (!isPlankExercise || !isSessionLive || !isCameraActive || !plankStarted || isSessionPaused) {
      if (plankTimerRef.current) {
        window.clearInterval(plankTimerRef.current)
        plankTimerRef.current = null
      }
      return undefined
    }

    plankTimerRef.current = window.setInterval(() => {
      setPlankSeconds((current) => current + 1)
    }, 1000)

    return () => {
      if (plankTimerRef.current) {
        window.clearInterval(plankTimerRef.current)
        plankTimerRef.current = null
      }
    }
  }, [isCameraActive, isPlankExercise, isSessionLive, plankStarted, isSessionPaused])

  useEffect(() => {
    if (!isPlankExercise || !shouldTrackHands || isSessionPaused) return

    if (isOkGesture && !plankStarted) {
      queueMicrotask(() => setPlankSeconds(0))
      queueMicrotask(() => setPlankStarted(true))
      queueMicrotask(() => {
        setNotice({
          tone: 'success',
          title: 'Señal OK detectada',
          message: 'Plank activado. Mantén la postura para iniciar el conteo.',
        })
      })
    }
  }, [isOkGesture, isPlankExercise, plankStarted, shouldTrackHands, isSessionPaused])

  useEffect(() => {
    if (!requiresPose) return
    const feedback = formatPoseFeedbackMessage({
      message: squatValidation?.feedback || insights.feedback || '',
      requiresPose,
      isValid: Boolean(squatValidation?.isValid),
      trackingMode,
      exerciseName: activeExercise.name,
      exerciseCountMode,
    })
    if (!feedback || feedback === lastFeedbackRef.current) return

    lastFeedbackRef.current = feedback
    queueMicrotask(() => {
      setNotice({
        tone: squatValidation?.isValid ? 'success' : 'info',
        title:
          trackingMode === 'curl'
            ? !squatValidation?.hasRequiredView
              ? 'Bíceps incompletos'
              : squatValidation?.isValid
                ? 'Curl detectado'
                : 'Aviso de bíceps'
            : trackingMode === 'core'
              ? !squatValidation?.hasRequiredView
                ? 'Core incompleto'
                : squatValidation?.isValid
                  ? 'Plank detectado'
                  : 'Aviso de core'
              : !squatValidation?.hasRequiredView
                ? trackingMode === 'press' || trackingMode === 'russian'
                  ? 'Press incompleto'
                  : trackingMode === 'squat'
                    ? 'Pierna incompleta'
                    : 'Cuerpo incompleto'
                : squatValidation?.isValid
                  ? trackingMode === 'press' || trackingMode === 'russian'
                    ? 'Press detectado'
                    : trackingMode === 'squat'
                      ? 'Sentadilla detectada'
                      : 'Ejercicio detectado'
                  : 'Aviso postural',
        message: feedback,
      })
    })
  }, [activeExercise.name, exerciseCountMode, insights.feedback, requiresPose, squatValidation?.feedback, squatValidation?.hasRequiredView, squatValidation?.isValid, trackingMode])

  useEffect(() => {
    if (!requiresPose) return
    if (repCount <= lastRepCountRef.current) return

    lastRepCountRef.current = repCount
    queueMicrotask(() => {
      setNotice({
        tone: 'success',
        title: 'Repetición contabilizada',
        message: `Llevas ${repCount} repeticiones de ${activeExercise.name}.`,
      })
    })
  }, [activeExercise.name, repCount, requiresPose])

  useEffect(() => {
    if (!selectedRoutineDayId || !token || !isSessionLive || !routineCurrentExerciseState) return

    const currentExerciseKey =
      routineCurrentExerciseState.id ||
      routineCurrentExerciseState.exercise_id ||
      exerciseName
    const targetReps = Number(repsTargetValue || 0)
    if (!targetReps || repCount <= 0) return

    const previousCount = lastRepCountRef.current
    if (repCount <= previousCount) return

    const delta = repCount - previousCount
    lastRepCountRef.current = repCount

    void recordRoutineReps(token, selectedRoutineDayId, {
      exercise_id: routineCurrentExerciseState.id || routineCurrentExerciseState.exercise_id || null,
      exercise_name: exerciseName,
      exercise_mode: exerciseCountMode,
      tracking_mode: trackingMode,
      current_set: currentSetValue,
      sets_target: setsTargetValue,
      reps_delta: delta,
      reps_completed_current_set: repCount,
      client_event_id: createClientEventId(),
      reps_target_value: targetReps,
      })
      .then((data) => {
        syncRoutineProgressFromResponse(data)
      })
      .catch(() => {})

    if (repCount >= targetReps) {
      const setKey = `${currentExerciseKey}:${currentSetValue || 1}`
      if (lastCompletedSetRef.current !== setKey) {
        lastCompletedSetRef.current = setKey
        const shouldRestBeforeNextSet =
          Number(restSecondsValue || 0) > 0 &&
          Number(setsTargetValue || 0) > Number(currentSetValue || 0)
        void completeRoutineSet(token, selectedRoutineDayId, {
          exercise_id: routineCurrentExerciseState.id || routineCurrentExerciseState.exercise_id || null,
          exercise_name: exerciseName,
          exercise_mode: exerciseCountMode,
          tracking_mode: trackingMode,
          current_set: currentSetValue,
          sets_target: setsTargetValue,
          reps_completed_current_set: repCount,
          reps_target_value: targetReps,
          client_event_id: createClientEventId(),
        })
      .then((data) => {
            if (data) {
              setRoutineProgress((currentProgress) => mergeRoutineProgressPayload(currentProgress, data))
            }
            const responseExercise =
              data?.current_day?.current_exercise ||
              data?.currentDay?.currentExercise ||
              data?.current_exercise ||
              data?.currentExercise ||
              null
            const responseExerciseStatus = responseExercise?.status || null
            if (shouldRestBeforeNextSet) {
              const copy = getSetCompletionCopy({
                currentSet: currentSetValue,
                targetSets: setsTargetValue,
                restSeconds: restSecondsValue,
                isCompleted: responseExerciseStatus === 'completed',
              })
              setNotice({
                tone: 'success',
                title: copy.title,
                message: copy.message,
              })
              beginSetRest(restSecondsValue)
            } else {
              resetRepCounter?.()
              const copy = getSetCompletionCopy({
                currentSet: currentSetValue,
                targetSets: setsTargetValue,
                restSeconds: restSecondsValue,
                isCompleted: responseExerciseStatus === 'completed',
              })
              setNotice({
                tone: 'success',
                title: copy.title,
                message: copy.message,
              })
            }
          })
          .catch(() => {})
      }
    }
  }, [
    currentSetValue,
    exerciseName,
    isSessionLive,
    repCount,
    repsTargetValue,
    routineCurrentExerciseName,
    routineCurrentExerciseState,
    selectedRoutineDayId,
    setsTargetValue,
    syncRoutineProgressFromResponse,
    beginSetRest,
    restSecondsValue,
    token,
  ])

  useEffect(() => {
    if (trackingMode !== 'curl' || !repPlan?.isComplete || lastCompletionRef.current) return

    lastCompletionRef.current = true
    queueMicrotask(() => {
      setNotice({
        tone: 'success',
        title: 'Serie completada',
        message: `Terminaste ${curlRepsPerArm} con el primer brazo y ${curlRepsPerArm} con el segundo.`,
      })
    })
  }, [curlRepsPerArm, curlStartArm, repPlan?.isComplete, trackingMode])

  useEffect(() => {
    if (!token || !selectedRoutineDayId || !selectedTrainingPlan) return
    if (!routineExerciseEntries.length) return
    if (!routineExerciseEntries.every((exercise) => exercise.status === 'completed')) return

    const dayKey = `${selectedRoutineDayId}:${activeRoutineDay?.day_number || ''}`
    if (lastCompletedDayRef.current === dayKey) return
    lastCompletedDayRef.current = dayKey

    void completeRoutineDay(token, selectedRoutineDayId, {
      completed_exercises_count: routineExerciseEntries.length,
      total_exercises: routineExerciseEntries.length,
      client_event_id: createClientEventId(),
    })
      .then((data) => {
        if (data) {
          syncRoutineProgressFromResponse(data)
          saveCompletedRoutineSummary({
            day: data,
            plan: selectedTrainingPlan,
            summary: data?.current_day?.session_summary || data?.currentDay?.sessionSummary || data?.session_summary || data?.sessionSummary || null,
            exercisesCount: routineExerciseEntries.length,
          })
          setNotice({
            tone: 'success',
            title: 'Rutina completada',
            message: `Se guardó ${activeRoutineDay?.day_name || 'la rutina de hoy'} con ${routineExerciseEntries.length} ejercicios completados.`,
          })
        }
      })
      .catch((error) => {
        lastCompletedDayRef.current = ''
        setRoutineError(error.response?.data?.detail || 'No se pudo completar la rutina del día')
      })
  }, [activeRoutineDay?.day_name, activeRoutineDay?.day_number, routineExerciseEntries, selectedRoutineDayId, selectedTrainingPlan, syncRoutineProgressFromResponse, token])

  const handleCompleteCurrentExercise = useCallback(async () => {
    if (!token || !selectedRoutineDayId || !routineCurrentExerciseState) return

    try {
      setIsCompletingRoutine(true)
      setRoutineError(null)
      const data = await completeRoutineSet(token, selectedRoutineDayId, {
        exercise_id: routineCurrentExerciseState.id || routineCurrentExerciseState.exercise_id || null,
        exercise_name: exerciseName,
        exercise_mode: exerciseCountMode,
        tracking_mode: trackingMode,
        current_set: currentSetValue,
        sets_target: setsTargetValue,
        reps_completed_current_set: isTimedExercise ? timedTargetSeconds : repCount,
        reps_target_value: isTimedExercise ? timedTargetSeconds : repsTargetValue,
        duration_seconds: isTimedExercise ? timedTargetSeconds : null,
        seconds_elapsed: isTimedExercise ? timedExerciseSeconds : null,
        client_event_id: createClientEventId(),
      })

      if (data) {
        syncRoutineProgressFromResponse(data)
        const responseExercise =
          data?.current_day?.current_exercise ||
          data?.currentDay?.currentExercise ||
          data?.current_exercise ||
          data?.currentExercise ||
          null
        const responseExerciseStatus = responseExercise?.status || null
        setNotice({
          tone: 'success',
          title: responseExerciseStatus === 'completed' ? 'Ejercicio completado' : 'Serie guardada',
          message: responseExerciseStatus === 'completed'
            ? `Se guardó ${activeExercise.name} como completado.`
            : `Se guardó la serie actual de ${activeExercise.name}.`,
        })
      }
    } catch (error) {
      setRoutineError(error.response?.data?.detail || 'No se pudo completar el ejercicio')
    } finally {
      setIsCompletingRoutine(false)
    }
  }, [
    activeExercise.name,
    currentSetValue,
    exerciseName,
    exerciseCountMode,
    isTimedExercise,
    repCount,
    repsTargetValue,
    routineCurrentExerciseState,
    selectedRoutineDayId,
    setsTargetValue,
    syncRoutineProgressFromResponse,
    timedExerciseSeconds,
    timedTargetSeconds,
    token,
    trackingMode,
  ])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {(selectedTrainingPlan || routineWeekDays.length > 0) && (
          <section className="rounded-3xl border border-gym-cyan/20 bg-gym-sidebar p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">
                  Tu rutina de hoy
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-white">
                  {routineTodayLabel}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gym-muted">
                  {activeRoutineDay?.focus || 'Aquí ves el día activo de tu plan y lo que toca en la semana.'}
                </p>
                {selectedTrainingPlan && (
                  <p className="mt-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-muted">
                    {selectedTrainingPlan.plan_type || 'Plan'} · Variante {selectedTrainingPlan.variant || selectedTrainingPlan.selectedVariant || 'A'} · {selectedTrainingPlan.frequency_level || selectedTrainingPlan.frequency || 'media'}
                  </p>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:w-[24rem]">
                {[
                  {
                    label: 'Día actual',
                    value: activeRoutineDay?.day_number ? `D${activeRoutineDay.day_number}` : 'Pendiente',
                    tone: 'text-gym-cyan',
                  },
                  {
                    label: 'Ejercicios hoy',
                    value: routineExerciseEntries.length || routineWeekDays[0]?.exercises?.length || 0,
                    tone: 'text-white',
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">{item.label}</p>
                    <p className={`mt-1 font-display text-2xl font-bold ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

          </section>
        )}

        {activeRoutineDay && (
          <section className="rounded-3xl border border-gym-cyan/20 bg-gym-sidebar p-4 sm:p-5">
            <div className="grid gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">
                  Ejercicios del día
                </p>
                <p className="mt-2 text-sm text-gym-muted">
                  {activeRoutineDay.focus || 'Ejercicios del plan listos para empezar'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-gym-cyan/15 bg-[linear-gradient(180deg,rgba(18,28,50,0.92)_0%,rgba(10,16,29,0.96)_100%)] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-gym-cyan">
                      Cambiar día
                    </p>
                    <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      {routineExerciseEntries.length} ejercicios activos
                    </span>
                    {activeRoutineDay?.day_number != null && (
                      <span className="rounded-full border border-gym-cyan/25 bg-gym-cyan/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-gym-cyan">
                        D{activeRoutineDay.day_number}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gym-muted">
                    Selecciona un día para cargar sus ejercicios y trabajar solo con ese bloque.
                  </p>
                </div>
              </div>

              {routineWeekDays.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {routineWeekDays.map((day) => {
                    const isActive = Number(activeRoutineDay?.day_number) === Number(day.day_number)
                    return (
                      <button
                        key={day.day_number}
                        type="button"
                        onClick={() => handleSelectRoutineDay(day)}
                        className={`min-h-[6.5rem] rounded-2xl border px-4 py-3 text-left transition-all ${
                          isActive
                            ? 'border-gym-cyan bg-gym-cyan/10 text-white shadow-[0_0_0_1px_rgba(0,229,255,0.15),0_12px_25px_rgba(0,229,255,0.08)]'
                            : 'border-gym-border bg-gym-sidebar text-gym-muted hover:-translate-y-0.5 hover:border-gym-cyan/40 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-inherit/70">
                            D{day.day_number}
                          </span>
                          {isActive && (
                            <span className="rounded-full border border-gym-cyan/30 bg-gym-cyan/15 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.16em] text-gym-cyan">
                              Activo
                            </span>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 font-semibold leading-6 text-white">
                          {day.day_name || `Día ${day.day_number}`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartRoutine}
                disabled={!selectedRoutineDayId || routineLoading || isRoutineActive || isRoutineCompleted}
                className="rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gym-cyan/15"
              >
                {isRoutineCompleted ? 'Rutina completada' : isRoutineActive ? 'Rutina en progreso' : 'Comenzar rutina'}
              </button>
              <button
                type="button"
                onClick={handleCompleteCurrentExercise}
                disabled={!token || !selectedRoutineDayId || !routineCurrentExerciseState || isCurrentExerciseCompleted || isCompletingRoutine}
                className="rounded-xl border border-gym-border bg-gym-accent px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:border-gym-cyan/40 hover:text-white"
              >
                {isCompletingRoutine ? 'Guardando...' : 'Completar ejercicio'}
              </button>
              {routineLoading && (
                <span className="text-xs font-mono uppercase tracking-[0.18em] text-gym-muted">Sincronizando progreso...</span>
              )}
              {routineError && (
                <span className="text-xs font-mono uppercase tracking-[0.18em] text-red-400">{routineError}</span>
              )}
            </div>
            <p className="mt-2 text-xs font-mono uppercase tracking-[0.16em] text-gym-muted">
              OK sigue siendo solo para iniciar el plank. La pausa se controla con el botón.
            </p>

            {hasFinalSummary && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/8 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300">
                      Resumen de sesión
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-bold text-white">
                      {sessionSummary?.day_name || activeRoutineDay?.day_name || 'Rutina completada'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gym-muted">
                      {sessionSummary?.day_completed
                        ? 'El backend marcó este día como completado.'
                        : 'El progreso quedó guardado y se puede rehidratar al volver a entrar.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gym-border bg-gym-sidebar px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">Progreso</p>
                    <p className="mt-1 font-display text-3xl font-bold text-emerald-300">{progressPct}%</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Ejercicios', value: `${completedExercisesCount}/${totalExercisesPlanned || routineExerciseEntries.length || 0}` },
                    { label: 'Series', value: `${totalSetsCompleted}/${totalSetsTarget || 0}` },
                    { label: 'Reps', value: `${totalRepsCompleted}` },
                    { label: 'Duración', value: formatDuration(sessionSummary?.duration_seconds) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-gym-border bg-gym-accent px-4 py-3">
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">{item.label}</p>
                      <p className="mt-1 font-display text-xl font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 text-xs font-mono text-gym-muted sm:grid-cols-2">
                  <p>
                    Inicio: <span className="text-white">{formatDateTime(sessionSummary?.started_at || routineDayState?.started_at)}</span>
                  </p>
                  <p>
                    Fin: <span className="text-white">{formatDateTime(sessionSummary?.completed_at || routineDayState?.completed_at)}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-gym-cyan">
                    Cambiar ejercicio
                  </p>
                  <p className="mt-1 text-xs font-mono uppercase tracking-[0.18em] text-gym-muted">
                    {routineExerciseEntries.length > 0
                      ? `Ejercicio ${Math.max(activeRoutineExerciseIndex + 1, 1)}/${routineExerciseEntries.length}`
                      : 'Sin ejercicios cargados'}
                  </p>
                </div>
                {showExerciseDebugControls && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handlePreviousExercise}
                      disabled={!routineExerciseEntries.length}
                      className="rounded-xl border border-gym-border bg-gym-accent px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:border-gym-cyan/40 hover:text-white"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={handleNextExercise}
                      disabled={!routineExerciseEntries.length}
                      className="rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gym-cyan/15"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {routineExerciseEntries.map((exercise, index) => (
                (() => {
                  const displayName = getExerciseDisplayName(exercise)
                  const imageUrl = getExerciseImageUrl(exercise)
                  const isSelected = normalizeExerciseLabel(displayName) === normalizeExerciseLabel(exerciseName)
                  const isCurrentDayExercise =
                    normalizeExerciseLabel(displayName) === normalizeExerciseLabel(routineCurrentExerciseName)
                  const isActiveExercise = isSelected
                  const isCurrentExerciseOnly = !isSelected && isCurrentDayExercise
                  const exerciseCountModeLocal = inferExerciseCountMode(exercise)
                  const plannedSets = Number(
                    exercise.sets_target ??
                      exercise.setsTarget ??
                      exercise.sets ??
                      0,
                  )
                  const completedSets = Number(
                    exercise.sets_completed ??
                      exercise.setsCompleted ??
                      0,
                  )
                  const plannedRepsOrSeconds = Number(
                    exercise.reps_target_value ??
                      exercise.repsTargetValue ??
                      exercise.reps_target ??
                      exercise.reps ??
                      0,
                  )
                  const completedRepsOrSeconds = Number(
                    exercise.reps_completed_current_set ??
                      exercise.repsCompletedCurrentSet ??
                      exercise.reps_completed ??
                      0,
                  )
                  const plannedDurationSeconds = parseExerciseDurationSeconds(
                    exercise.duration_seconds ??
                      exercise.durationSeconds ??
                      exercise.time ??
                      exercise.duration ??
                      0,
                  ) || getExerciseDefaultDurationSeconds(exercise)

                  return (
                  <button
                  key={`${activeRoutineDay.day_label || activeRoutineDay.day_name || 'day'}-${index}-${displayName}`}
                  type="button"
                  onClick={() => {
                    hasManualExerciseSelectionRef.current = true
                    setExerciseName(displayName)
                  }}
                  aria-pressed={isActiveExercise}
                  className={`group relative overflow-hidden rounded-2xl border px-3 py-3 text-left transition-all duration-300 ${
                    isActiveExercise
                      ? 'scale-[1.01] border-gym-cyan bg-[linear-gradient(180deg,rgba(0,229,255,0.14)_0%,rgba(7,16,30,0.98)_100%)] text-white shadow-[0_0_0_1px_rgba(0,229,255,0.35),0_0_30px_rgba(0,229,255,0.18)] ring-1 ring-gym-cyan/30'
                      : isCurrentExerciseOnly
                        ? 'border-gym-cyan/40 bg-[linear-gradient(180deg,rgba(8,26,45,0.95)_0%,rgba(11,18,34,0.98)_100%)] text-white shadow-[0_0_0_1px_rgba(0,229,255,0.12)]'
                        : 'border-gym-border bg-[linear-gradient(180deg,rgba(13,20,34,0.98)_0%,rgba(8,13,24,0.98)_100%)] text-gym-muted hover:-translate-y-0.5 hover:border-gym-cyan/40 hover:text-white hover:shadow-[0_18px_30px_rgba(0,0,0,0.28)]'
                  }`}
                >
                  {(isActiveExercise || isCurrentExerciseOnly) && (
                    <span className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gym-cyan shadow-[0_0_16px_rgba(0,229,255,0.6)]" />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gym-cyan/80 to-transparent opacity-70" />
                  <div className="relative z-10 mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted">
                        {exerciseCountModeLocal === 'timer'
                          ? 'Timer'
                          : exerciseCountModeLocal === 'hold'
                            ? 'Hold'
                            : exercise.trackingMode === 'manual'
                              ? 'Guía'
                              : exercise.trackingMode === 'core'
                                ? 'Core'
                                : 'Live'}
                      </p>
                      <p className="mt-2 truncate font-display text-lg font-bold leading-tight text-white">
                        {displayName}
                      </p>
                      <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-gym-cyan/90">
                        {exercise?.category || exercise?.muscle_group || 'Ejercicio del plan'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {(isActiveExercise || isCurrentExerciseOnly) && (
                        <span className="rounded-full border border-gym-cyan/40 bg-gym-cyan/15 px-2.5 py-1 text-[8px] font-mono uppercase tracking-[0.22em] text-gym-cyan backdrop-blur">
                          En foco
                        </span>
                      )}
                      {exercise.status === 'completed' && (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.18em] text-emerald-200">
                          Completado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]">
                          {displayName}
                        </p>
                        {isActiveExercise && (
                          <span className="shrink-0 rounded-full border border-gym-cyan/40 bg-gym-cyan px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] text-black">
                            Seleccionado
                          </span>
                        )}
                        {isCurrentExerciseOnly && (
                          <span className="shrink-0 rounded-full border border-gym-cyan/30 bg-gym-cyan/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] text-gym-cyan">
                            Actual
                          </span>
                        )}
                        {(isActiveExercise || isCurrentExerciseOnly) && isCurrentExerciseCompleted && (
                          <span className="shrink-0 rounded-full border border-gym-green/30 bg-gym-green/15 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] text-gym-green">
                            Completado
                          </span>
                        )}
                        {(isActiveExercise || isCurrentExerciseOnly) && !isCurrentExerciseCompleted && isCurrentSetCompleted && (
                          <span className="shrink-0 rounded-full border border-gym-cyan/30 bg-gym-cyan/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] text-gym-cyan">
                            Serie completada
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 text-[10px] font-mono uppercase tracking-[0.16em] ${isActiveExercise || isCurrentExerciseOnly ? 'text-gym-cyan/90' : 'text-gym-muted'}`}>
                        {getExerciseDisplayGroup(exercise)}
                      </p>
                      <p className={`mt-1 text-[10px] font-mono uppercase tracking-[0.16em] ${isActiveExercise || isCurrentExerciseOnly ? 'text-white/80' : 'text-gym-muted/80'}`}>
                        {plannedSets > 0 ? `${formatSetLabel(completedSets || 0, plannedSets)} · ` : ''}
                        {exerciseCountModeLocal === 'timer' || exerciseCountModeLocal === 'hold'
                          ? `${getExerciseMetricLabel(exerciseCountModeLocal)} ${formatCountdown(completedRepsOrSeconds || timedTargetSeconds || plannedDurationSeconds)}/${formatCountdown(timedTargetSeconds || plannedDurationSeconds || completedRepsOrSeconds)}`
                          : `${getExerciseMetricLabel(exerciseCountModeLocal)} ${completedRepsOrSeconds || 0}/${plannedRepsOrSeconds || 0}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px] font-mono uppercase tracking-[0.16em] text-gym-cyan">
                      {plannedSets > 0 && (
                        <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1">
                          {formatSetLabel(completedSets || 0, plannedSets)}
                        </span>
                      )}
                      {(exerciseCountModeLocal === 'timer' || exerciseCountModeLocal === 'hold' || plannedRepsOrSeconds > 0) && (
                        <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1">
                          {exerciseCountModeLocal === 'timer' || exerciseCountModeLocal === 'hold'
                            ? `${getExerciseMetricLabel(exerciseCountModeLocal)} ${formatCountdown(timedTargetSeconds || plannedDurationSeconds)}`
                            : `${getExerciseMetricLabel(exerciseCountModeLocal)} ${plannedRepsOrSeconds}`}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                  )
                })()
              ))}
            </div>
          </section>
        )}

        {showExerciseCatalog && (
        <div className="rounded-3xl border border-gym-border bg-gym-sidebar p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-[220px]">
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">
                Selecciona el ejercicio
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                Modo de entrenamiento
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-gym-muted">
                Usa el filtro para reducir la lista. Los ejercicios con <span className="text-white">Live</span> tienen seguimiento en cámara.
              </p>
            </div>

            <div className="w-full max-w-4xl space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                    Filtro rápido
                  </span>
                  <input
                    value={exerciseFilter}
                    onChange={(event) => setExerciseFilter(event.target.value)}
                    placeholder="Busca por nombre, grupo o tipo..."
                    className="w-full rounded-2xl border border-gym-border bg-gym-accent px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gym-muted focus:border-gym-cyan"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 sm:self-end">
                  <button
                    type="button"
                    onClick={() => setExerciseTypeFilter('all')}
                    className={`rounded-2xl border px-3 py-3 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
                      exerciseTypeFilter === 'all'
                        ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                        : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-cyan/40 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setExerciseTypeFilter('manual')}
                    className={`rounded-2xl border px-3 py-3 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
                      exerciseTypeFilter === 'manual'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                        : 'border-gym-border bg-gym-accent text-gym-muted hover:border-amber-400/40 hover:text-white'
                    }`}
                  >
                    Guía
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                {categoryOptions.map((category) => {
                  const active = exerciseCategoryFilter === category
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setExerciseCategoryFilter(category)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] transition-colors ${
                        active
                          ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                          : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-cyan/30 hover:text-white'
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>

              <div className="rounded-2xl border border-gym-border bg-gym-accent/70 px-4 py-3">
                <p className="text-xs leading-6 text-gym-muted">
                  <span className="font-semibold text-white">Modo guía</span> es un ejercicio que aparece en el plan, pero todavía no tiene conteo automático propio.
                  Sirve como referencia visual mientras el sistema lo sigue de forma manual.
                </p>
              </div>

              <div className="max-h-[340px] overflow-y-auto pr-1">
                {filteredExerciseGroups.length === 0 ? (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-5 text-sm text-gym-muted">
                    No hay ejercicios que coincidan con ese filtro.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredExerciseGroups.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gym-muted">
                          {group.category}
                        </p>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {group.items.map((item) => {
                            const active = exerciseName === item.name
                            return (
                              <button
                                key={item.name}
                                onClick={() => setExerciseName(item.name)}
                                className={`rounded-xl border px-3 py-2 text-left transition-all ${
                                  active
                                    ? 'border-gym-cyan bg-gym-cyan/10 text-white shadow-[0_0_25px_rgba(0,229,255,0.14)]'
                                    : 'border-gym-border bg-gym-sidebar text-gym-muted hover:border-gym-cyan/30 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="min-w-0 flex-1 text-sm font-display font-bold leading-tight">
                                    {item.name}
                                  </div>
                                  <span
                                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] ${
                                      item.trackingMode === 'manual'
                                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                                    }`}
                                  >
                                    {item.liveLabel}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        <TrainingSessionHeader
          isLive={isSessionLive}
          onToggleSession={handleToggleSession}
          exerciseLabel={activeExercise.name}
          disabled={cameraStatus === 'requesting' || isStarting}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <PoseViewport
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraError={cameraError}
            poseError={poseError}
            isLive={isSessionLive}
            statusMessage={statusMessage}
            exerciseLabel={activeExercise.name}
          />

          <aside className="xl:sticky xl:top-6">
            <section className="rounded-2xl border border-gym-border bg-gym-sidebar px-5 py-4">
              <div className="flex flex-col gap-4">
                {isTimedExercise ? (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      {isHoldExercise ? 'Sostén' : isManualTimedExercise ? 'Cronómetro manual' : 'Cronómetro'}
                    </p>
                    {isManualTimedExercise && (
                      <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-3 text-left">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                              Duración
                            </p>
                            <p className="mt-1 text-xs text-white/70">
                              Elige los minutos del ejercicio manual.
                            </p>
                          </div>
                          <label className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="60"
                              step="1"
                              value={manualTimerMinutes}
                              onChange={(event) => {
                                const nextMinutes = Math.max(1, Math.min(60, Number(event.target.value) || 1))
                                setManualTimerMinutesByExercise((current) => ({
                                  ...current,
                                  [activeExerciseTimerKey]: nextMinutes,
                                }))
                                setTimedExerciseSeconds(0)
                              }}
                              className="w-20 rounded-xl border border-gym-border bg-gym-sidebar px-3 py-2 text-center text-sm font-semibold text-white outline-none transition-colors focus:border-gym-cyan"
                            />
                            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                              min
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                    <p className="mt-2 font-display text-5xl font-bold leading-none text-white">
                      {formatCountdown(timedRemainingSeconds)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em]">
                      <span className="rounded-full border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-1 text-gym-cyan">
                        {formatSetLabel(currentSeriesValue, plannedSeriesValue)}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-white/80">
                        Total {formatCountdown(timedTargetSeconds)}
                      </span>
                    </div>
                    {isCurrentSetCompleted && !isCurrentExerciseCompleted && (
                      <button
                        type="button"
                        onClick={handleStartNextSeries}
                        className="mt-4 inline-flex items-center justify-center rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors hover:bg-gym-cyan/15"
                      >
                        {isSetRestActive ? 'Continuar ahora' : 'Siguiente serie'}
                      </button>
                    )}
                    {isManualTimedExercise && (
                      <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                        Recomendado entre 1 y 6 minutos.
                      </p>
                    )}
                  </div>
                ) : exerciseCountMode === 'reps' ? (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Repeticiones
                    </p>
                    <p className="mt-2 font-display text-5xl font-bold leading-none text-white">
                      {repCount}/{repsTargetValue || 0}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em]">
                      <span className="rounded-full border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-1 text-gym-cyan">
                        {formatSetLabel(currentSeriesValue, plannedSeriesValue)}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-white/80">
                        Objetivo {repsTargetValue || 0}
                      </span>
                    </div>
                    {isCurrentSetCompleted && !isCurrentExerciseCompleted && (
                      <button
                        type="button"
                        onClick={handleStartNextSeries}
                        className="mt-4 inline-flex items-center justify-center rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors hover:bg-gym-cyan/15"
                      >
                        {isSetRestActive ? 'Continuar ahora' : 'Siguiente serie'}
                      </button>
                    )}
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-[1.75rem] border border-gym-border bg-[linear-gradient(180deg,rgba(13,20,34,0.96)_0%,rgba(8,13,24,0.98)_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
                  <div className="flex min-h-[220px] flex-col justify-between gap-6 bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.10),transparent_42%),linear-gradient(180deg,#101b2f_0%,#08101d_100%)] p-5 sm:min-h-[250px] sm:p-6">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                        {exerciseCountMode === 'timer'
                          ? 'Tiempo'
                          : trackingMode === 'manual'
                            ? 'Guía'
                            : trackingMode === 'core'
                              ? 'Core'
                              : 'Seguimiento'}
                      </span>
                      {(isTimedExercise || trackingMode === 'curl') && (
                        <span className="rounded-full border border-gym-cyan/30 bg-gym-cyan/15 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.22em] text-gym-cyan backdrop-blur">
                          En vivo
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-cyan/90">
                        {activeExercise.category || activeExercise.muscle_group || 'Ejercicio del plan'}
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-bold text-white">
                        {activeExercise.name}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-gym-muted">
                        La referencia visual se añadirá más adelante. Por ahora esta vista queda enfocada en el conteo y la validación del ejercicio.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-gym-muted">
                      {(activeExercise.sets || setsTargetValue) && (
                        <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-white/80">
                          {activeExercise.sets || setsTargetValue || 0} series
                        </span>
                      )}
                      {(activeExercise.reps || repsTargetValue) && (
                        <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-white/80">
                          {activeExercise.reps || repsTargetValue || 0} reps
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {trackingMode === 'curl' && (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Plan de bíceps
                    </p>

                    <div className="mt-3 grid gap-3">
                      <label className="space-y-1">
                        <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                          Reps totales
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={curlRepsPerArm}
                          onChange={(event) => setCurlRepsPerArm(Number(event.target.value) || 1)}
                          className="w-full rounded-xl border border-gym-border bg-gym-sidebar px-3 py-2 text-sm text-white outline-none"
                        />
                      </label>

                      <p className="text-sm leading-6 text-white">
                        Haz {curlRepsPerArm} con un brazo y luego {curlRepsPerArm} con el otro. Funciona en ambos lados.
                      </p>
                    </div>
                  </div>
                )}

                {trackingMode === 'curl' && (
                  <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/88 px-4 py-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Progreso
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-white">
                      <p>
                        Secuencia actual: <span className="font-semibold">{repPlan?.currentArm === 'left' ? 'primer brazo' : 'segundo brazo'}</span>
                      </p>
                      <p>
                        En este brazo: <span className="font-semibold">{repPlan?.armRepCount ?? 0}/{curlRepsPerArm}</span>
                      </p>
                      <p>
                        Estado: <span className="font-semibold">{repPlan?.isComplete ? 'Serie completa' : 'En curso'}</span>
                      </p>
                    </div>
                  </div>
                )}

                {isPlankExercise && (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Plan de core
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-white">
                      <p className="text-xs font-mono uppercase tracking-[0.18em] text-gym-cyan">
                        {plankStarted
                          ? 'Plank en curso'
                          : `Haz la señal OK para iniciar (${Math.round(gestureConfidence * 100)}%)`}
                      </p>
                      <p className="font-display text-4xl font-bold leading-none text-gym-cyan">
                        {String(Math.floor(plankSeconds / 60)).padStart(2, '0')}:{String(plankSeconds % 60).padStart(2, '0')}
                      </p>
                      <p className="leading-6 text-gym-muted">
                        Mantén una línea recta desde hombros hasta talones. Usa la cámara para vigilar estabilidad de torso.
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-gym-muted">
                        OK: iniciar plank · Pausa manual: botón
                      </p>
                    </div>
                  </div>
                )}

                {isManualExercise && (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Sin puntos
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white">
                      Este ejercicio no necesita validación con MediaPipe. Sigue el conteo del plan y marca la serie cuando corresponda.
                    </p>
                    <p className="mt-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-muted">
                      Grupo: {activeExercise.category}
                    </p>
                  </div>
                )}

                <div
                  className={`rounded-2xl border px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition-all ${
                    notice?.tone === 'success'
                      ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-50'
                      : 'border-cyan-400/40 bg-slate-950/88 text-white'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] opacity-80">
                    {notice?.title || `Feedback ${activeExercise.name.toLowerCase()}`}
                  </p>
                  <div className="mt-3 flex items-start gap-3">
                    <div
                      className={`mt-1 h-3 w-3 rounded-full ${
                        notice?.tone === 'success' ? 'bg-emerald-300' : 'bg-cyan-300 animate-pulse'
                      }`}
                    />
                    <p className="text-sm leading-6 text-white">
                      {formatPoseFeedbackMessage({
                        message: notice?.message || handError || squatValidation?.feedback || insights.feedback || 'Esperando datos de la cámara.',
                        requiresPose,
                        isValid: Boolean(squatValidation?.isValid),
                        trackingMode,
                        exerciseName: activeExercise.name,
                        exerciseCountMode,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}

function getStatusMessage({
  cameraError,
  poseError,
  cameraStatus,
  poseStatus,
  isSessionLive,
  hasPose,
  exerciseLabel,
  requiresPose,
  exerciseCountMode,
}) {
  if (cameraError || poseError) {
    return cameraError || poseError
  }

  if (!isSessionLive) {
    return `Pulsa "Iniciar cámara" para comenzar con ${exerciseLabel}.`
  }

  if (cameraStatus === 'requesting' || poseStatus === 'loading') {
    return 'Estamos preparando la cámara.'
  }

  if (!requiresPose) {
    return exerciseCountMode === 'timer'
      ? `Contador por tiempo activo para ${exerciseLabel}.`
      : `Sigue el conteo del plan para ${exerciseLabel}.`
  }

  if (hasPose) {
    return 'Te vemos bien en pantalla.'
  }

  return 'La cámara está encendida. Ponte frente a ella para comenzar.'
}

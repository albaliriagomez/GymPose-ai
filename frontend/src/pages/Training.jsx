import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import PoseViewport from '../components/training/PoseViewport'
import TrainingSessionHeader from '../components/training/TrainingSessionHeader'
import {
  TRAINING_EXERCISES,
  TRAINING_EXERCISES_BY_NAME,
  TRAINING_EXERCISE_GROUPS,
} from '../data/trainingExercises'
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

const ARM_LABELS = {
  left: 'izquierdo',
  right: 'derecho',
}

const DEFAULT_EXERCISE_NAME = 'Sentadilla con Barra'

const normalizeTrainingPlan = (planPayload) => {
  if (!planPayload) return null
  if (planPayload.days) return planPayload
  if (planPayload.plan?.days) return planPayload.plan
  return null
}

const getExerciseDisplayName = (exercise) =>
  exercise?.name || exercise?.exercise_name || exercise?.exerciseName || 'Ejercicio'

const getExerciseDisplayGroup = (exercise) =>
  exercise?.muscle_group || exercise?.muscleGroup || 'Ejercicio del plan'

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
  const directMode = exercise?.countMode
  if (directMode) return directMode

  const displayName = String(getExerciseDisplayName(exercise) || '').trim().toLowerCase()
  const displayGroup = String(getExerciseDisplayGroup(exercise) || '').trim().toLowerCase()

  if (TIMER_EXERCISE_PATTERN.test(displayName) || displayGroup.includes('cardio') || displayGroup.includes('core')) {
    return 'timer'
  }

  if (exercise?.trackingMode === 'manual') {
    return 'manual'
  }

  return 'reps'
}

const getExerciseDefaultDurationSeconds = (exercise) => {
  if (exercise?.defaultDurationSeconds) {
    return Number(exercise.defaultDurationSeconds) || 0
  }

  const displayName = String(getExerciseDisplayName(exercise) || '').trim().toLowerCase()
  if (/plank|plancha/.test(displayName)) {
    return 45
  }

  if (TIMER_EXERCISE_PATTERN.test(displayName)) {
    return 60
  }

  return 0
}

const getExerciseImageUrl = (exercise) => {
  const displayName = getExerciseDisplayName(exercise)
  const directMatch = TRAINING_EXERCISES_BY_NAME[displayName]
  if (directMatch?.imageUrl) return directMatch.imageUrl

  const normalizedMatch = TRAINING_EXERCISES.find(
    (item) => normalizeExerciseLabel(item.name) === normalizeExerciseLabel(displayName),
  )
  return normalizedMatch?.imageUrl || null
}

function ExerciseGuideImage({ src, alt, wrapperClassName = '', imageClassName = '', placeholderClassName = '' }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gym-accent to-gym-sidebar text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted ${placeholderClassName}`}
      >
        Sin imagen precisa
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
    location.state?.routineDayId || location.state?.routineDay?.day_number || null,
  )
  const [exerciseName, setExerciseName] = useState(() => {
    const routineDay = location.state?.routineDay || null
    const firstExerciseName = routineDay?.exercises?.[0]?.name
    return TRAINING_EXERCISES_BY_NAME[firstExerciseName]?.name || DEFAULT_EXERCISE_NAME
  })
  const [curlStartArm, setCurlStartArm] = useState('left')
  const [curlRepsPerArm, setCurlRepsPerArm] = useState(10)
  const [plankSeconds, setPlankSeconds] = useState(0)
  const [plankStarted, setPlankStarted] = useState(false)
  const [timedExerciseSeconds, setTimedExerciseSeconds] = useState(0)
  const [isSetResting, setIsSetResting] = useState(false)
  const [restCountdown, setRestCountdown] = useState(0)
  const [exerciseFilter, setExerciseFilter] = useState('')
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState('all')
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState('Todas')
  const showExerciseCatalog = false
  const [routineProgress, setRoutineProgress] = useState(null)
  const [routineLoading, setRoutineLoading] = useState(false)
  const [routineError, setRoutineError] = useState(null)
  const [isCompletingRoutine, setIsCompletingRoutine] = useState(false)
  const [selectedTrainingPlan, setSelectedTrainingPlan] = useState(location.state?.trainingPlan || null)
  const [hasBootstrappedRoutine, setHasBootstrappedRoutine] = useState(false)
  const lastGestureToggleRef = useRef(0)

  useEffect(() => {
    if (selectedTrainingPlan) return

    const cachedPlan = localStorage.getItem('gympose_training_plan')
    if (!cachedPlan) return

    try {
      const parsed = JSON.parse(cachedPlan)
      const normalizedPlan = normalizeTrainingPlan(parsed)
      if (normalizedPlan) {
        setSelectedTrainingPlan(normalizedPlan)
      }
    } catch {
      localStorage.removeItem('gympose_training_plan')
    }
  }, [selectedTrainingPlan])

  const activeExercise =
    TRAINING_EXERCISES_BY_NAME[exerciseName] ||
    TRAINING_EXERCISES_BY_NAME[DEFAULT_EXERCISE_NAME] ||
    TRAINING_EXERCISES[0]
  const trackingMode = activeExercise.trackingMode
  const exerciseCountMode = inferExerciseCountMode(activeExercise)
  const requiresPose = Boolean(activeExercise.requiresPose && exerciseCountMode === 'reps')
  const poseExerciseMode = requiresPose ? trackingMode : 'manual'
  const isTimerExercise = exerciseCountMode === 'timer'
  const isManualExercise = exerciseCountMode === 'manual'
  const isPlankExercise = exerciseCountMode === 'timer' && /plank|plancha/i.test(activeExercise.name)

  const filteredExerciseGroups = useMemo(() => {
    const query = exerciseFilter.trim().toLowerCase()

    return TRAINING_EXERCISE_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const searchable = `${item.name} ${item.category} ${item.liveLabel} ${item.description}`.toLowerCase()
          const matchesQuery = !query || searchable.includes(query)
          const matchesType = exerciseTypeFilter === 'all' || item.trackingMode === exerciseTypeFilter
          const matchesCategory = exerciseCategoryFilter === 'Todas' || item.category === exerciseCategoryFilter
          return matchesQuery && matchesType && matchesCategory
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [exerciseCategoryFilter, exerciseFilter, exerciseTypeFilter])

  const categoryOptions = useMemo(
    () => ['Todas', ...TRAINING_EXERCISE_GROUPS.map((group) => group.category)],
    [],
  )

  const savedRoutineDays = useMemo(
    () => (Array.isArray(selectedTrainingPlan?.days) ? selectedTrainingPlan.days : []),
    [selectedTrainingPlan],
  )
  const routineDayState = routineProgress?.current_day || routineProgress?.currentDay || null
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
  const planRoutineDay = selectedRoutineDay || savedRoutineDays[0] || null
  const routineExercises = Array.isArray((routineDayState || planRoutineDay)?.exercises)
    ? (routineDayState || planRoutineDay).exercises
    : []
  const routineExerciseEntries = Array.isArray(routineDayState?.exercises)
    ? routineDayState.exercises
    : routineExercises
  const activeRoutineDay = routineDayState || planRoutineDay
  const routineWeekDays = savedRoutineDays.slice(0, 7)
  const routineTodayLabel = activeRoutineDay?.day_name || activeRoutineDay?.day_label || 'Rutina de hoy'
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
  const timedTargetSeconds = parseExerciseDurationSeconds(
    activeRoutineExerciseProgress?.duration_seconds ??
      activeRoutineExercisePlanEntry?.duration_seconds ??
      activeRoutineExercisePlanEntry?.time ??
      activeRoutineExercisePlanEntry?.duration ??
      0,
  ) || (isTimerExercise ? getExerciseDefaultDurationSeconds(activeExercise) : 0)
  const isTimedExercise = isTimerExercise || timedTargetSeconds > 0
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
  const hasFinalSummary = Boolean(
    sessionSummary?.day_completed || routineDayState?.completed_at || isRoutineCompleted,
  )

  const hydrateRoutineFromResponse = useCallback((data) => {
    if (!data) return null

    const plan = data.plan || data.training_plan || data.active_plan || data.current_plan || null
    const normalizedPlan = normalizeTrainingPlan(plan)
    const currentDay =
      data.current_day ||
      data.currentDay ||
      data.day ||
      data.current_routine_day ||
      null
    const currentDayId =
      currentDay?.day_number ||
      currentDay?.day_id ||
      currentDay?.id ||
      data.day_id ||
      data.dayId ||
      null

    if (normalizedPlan) {
      setSelectedTrainingPlan(normalizedPlan)
    }

    if (currentDay) {
      setSelectedRoutineDay(currentDay)
    }

    if (currentDayId != null) {
      setSelectedRoutineDayId(currentDayId)
      lastLoadedRoutineDayRef.current = String(currentDayId)
    }

    setRoutineProgress(data)

    const backendExerciseName =
      currentDay?.current_exercise?.name ||
      currentDay?.current_exercise?.exercise_name ||
      currentDay?.currentExercise?.name ||
      currentDay?.currentExercise?.exercise_name ||
      null

    if (backendExerciseName) {
      const normalized = TRAINING_EXERCISES_BY_NAME[backendExerciseName]
      setExerciseName(normalized?.name || backendExerciseName)
      hasManualExerciseSelectionRef.current = false
    }

    return { plan: normalizedPlan, currentDay, currentDayId }
  }, [])

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

  const {
    status: cameraStatus,
    error: cameraError,
    startCamera,
    stopCamera,
    isActive: isCameraActive,
    isStarting,
  } = useCameraStream(videoRef)

  useEffect(() => {
    if (!token) return
    if (selectedRoutineDayId) return
    if (hasBootstrappedRoutine) return

    let cancelled = false

    const bootstrapCurrentRoutine = async () => {
      setHasBootstrappedRoutine(true)
      const result = await loadCurrentTrainingState()
      if (cancelled || !result) return

      if (result.currentDayId != null) {
        setSelectedRoutineDayId(result.currentDayId)
      }

      if (result.currentDay) {
        setSelectedRoutineDay(result.currentDay)
      }
    }

    bootstrapCurrentRoutine()

    return () => {
      cancelled = true
    }
  }, [hasBootstrappedRoutine, loadCurrentTrainingState, selectedRoutineDayId, token])

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

    const nextExerciseName = TRAINING_EXERCISES_BY_NAME[routineCurrentExerciseName]?.name || routineCurrentExerciseName
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
    setTimedExerciseSeconds(0)
  }, [currentSetValue, routineCurrentExerciseName, setsTargetValue])

  useEffect(() => {
    if (routineDayState || selectedRoutineDayId || !savedRoutineDays.length) {
      return
    }

    const firstDay = savedRoutineDays[0]
    if (!firstDay) return

    setSelectedRoutineDay(firstDay)
    setSelectedRoutineDayId(firstDay.day_id || firstDay.id || firstDay.day_number || null)
  }, [routineDayState, savedRoutineDays, selectedRoutineDayId])

  const handleSelectRoutineDay = (day) => {
    if (!day) return
    setSelectedRoutineDay(day)
    const nextDayId = day.day_number || day.day_id || day.id || null
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
  } = useLivePose({
    videoRef,
    canvasRef,
    isRunning: isSessionLive && isCameraActive && !isSessionPaused && !isSetRestActive,
    exerciseMode: poseExerciseMode,
    enablePose: requiresPose,
    curlArmSide: curlStartArm,
    curlRepsPerArm,
  })

  const {
    error: handError,
    isOkGesture,
    gestureConfidence,
    isPalmOpenGesture,
  } = useHandGesture({
    videoRef,
    isRunning: shouldTrackHands,
  })

  const beginSetRest = useCallback((seconds) => {
    const duration = Number(seconds || 0)
    if (!duration) return

    lastRepCountRef.current = 0
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

  useEffect(() => {
    if (!isSessionLive || !isCameraActive || isSetRestActive) return
    if (!isPalmOpenGesture) return

    const now = Date.now()
    if (now - lastGestureToggleRef.current < 1600) return
    lastGestureToggleRef.current = now

    setIsSessionPaused((current) => {
      const nextValue = !current
      queueMicrotask(() => {
        setNotice({
          tone: nextValue ? 'info' : 'success',
          title: nextValue ? 'Pausa activada' : 'Sesión reanudada',
          message: nextValue
            ? 'Palma abierta detectada. La cámara queda activa, pero el conteo se pausa hasta una nueva palma abierta.'
            : 'Palma abierta detectada otra vez. La sesión continúa.',
        })
      })
      return nextValue
    })
  }, [isCameraActive, isPalmOpenGesture, isSessionLive, isSetRestActive])

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
      current_set: currentSetValue,
      sets_target: setsTargetValue,
      reps_completed_current_set: timedTargetSeconds,
      reps_target_value: timedTargetSeconds,
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
          setNotice({
            tone: 'success',
            title: 'Serie completada',
            message: `Descanso antes de la siguiente serie: ${formatDuration(restSecondsValue)}.`,
          })
          beginSetRest(restSecondsValue)
        } else {
          setTimedExerciseSeconds(0)
          setNotice({
            tone: 'success',
            title: responseExerciseStatus === 'completed' ? 'Ejercicio completado' : 'Serie completada',
            message:
              responseExerciseStatus === 'completed'
                ? `${exerciseName} quedó guardado en el backend como completado.`
                : 'La siguiente serie queda lista.',
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
      lastGestureToggleRef.current = 0
      stopCamera()
      return
    }

  const started = await startCamera()
    setIsSessionLive(started)
    setIsSessionPaused(false)
    setIsSetResting(false)
    setRestCountdown(0)
    lastGestureToggleRef.current = 0
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
    const feedback = squatValidation?.feedback || insights.feedback || ''
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
                ? trackingMode === 'press'
                  ? 'Press incompleto'
                  : trackingMode === 'squat'
                    ? 'Pierna incompleta'
                    : 'Cuerpo incompleto'
                : squatValidation?.isValid
                  ? trackingMode === 'press'
                    ? 'Press detectado'
                    : trackingMode === 'squat'
                      ? 'Sentadilla detectada'
                      : 'Ejercicio detectado'
                  : 'Aviso postural',
        message: feedback,
      })
    })
  }, [insights.feedback, requiresPose, squatValidation?.feedback, squatValidation?.hasRequiredView, squatValidation?.isValid, trackingMode])

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
          current_set: currentSetValue,
          sets_target: setsTargetValue,
          reps_completed_current_set: repCount,
          reps_target_value: targetReps,
          client_event_id: createClientEventId(),
        })
          .then((data) => {
            if (data) setRoutineProgress(data)
            const responseExercise =
              data?.current_day?.current_exercise ||
              data?.currentDay?.currentExercise ||
              data?.current_exercise ||
              data?.currentExercise ||
              null
            const responseExerciseStatus = responseExercise?.status || null
            if (shouldRestBeforeNextSet) {
              setNotice({
                tone: 'success',
                title: 'Serie completada',
                message: `Descanso antes de la siguiente serie: ${formatDuration(restSecondsValue)}.`,
              })
              beginSetRest(restSecondsValue)
            } else {
              setNotice({
                tone: 'success',
                title: responseExerciseStatus === 'completed' ? 'Ejercicio completado' : 'Serie completada',
                message:
                  responseExerciseStatus === 'completed'
                    ? `${exerciseName} quedó guardado en el backend como completado.`
                    : 'La siguiente serie queda lista.',
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
        message: `Terminaste ${curlRepsPerArm} con el ${ARM_LABELS[curlStartArm]} y ${curlRepsPerArm} con el otro brazo.`,
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

  const handleCompleteRoutineDay = useCallback(async () => {
    if (!token || !selectedRoutineDayId || !routineExerciseEntries.length) return

    try {
      setIsCompletingRoutine(true)
      setRoutineError(null)
      const data = await completeRoutineDay(token, selectedRoutineDayId, {
        completed_exercises_count: routineExerciseEntries.length,
        total_exercises: routineExerciseEntries.length,
        client_event_id: createClientEventId(),
      })

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
    } catch (error) {
      setRoutineError(error.response?.data?.detail || 'No se pudo completar la rutina del día')
    } finally {
      setIsCompletingRoutine(false)
    }
  }, [activeRoutineDay?.day_name, routineExerciseEntries.length, selectedRoutineDayId, selectedTrainingPlan, syncRoutineProgressFromResponse, token])

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

            {routineWeekDays.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-gym-cyan">
                  Semana de entrenamiento
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {routineWeekDays.map((day) => {
                    const isActive = Number(activeRoutineDay?.day_number) === Number(day.day_number)
                    return (
                      <button
                        key={day.day_number}
                        type="button"
                        onClick={() => handleSelectRoutineDay(day)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
                          isActive
                            ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                            : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-cyan/40 hover:text-white'
                        }`}
                      >
                        D{day.day_number} · {day.day_name || `Día ${day.day_number}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {activeRoutineDay && (
          <section className="rounded-3xl border border-gym-cyan/20 bg-gym-sidebar p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">
                  Rutina diaria
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-white">
                  {activeRoutineDay.day_name || activeRoutineDay.day_label || 'Rutina del día'}
                </h2>
                <p className="mt-2 text-sm text-gym-muted">
                  {activeRoutineDay.focus || 'Ejercicios del plan listos para empezar'}
                </p>
                {selectedTrainingPlan && (
                  <p className="mt-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-muted">
                    {selectedTrainingPlan.plan_type || 'Plan'} · Variante {selectedTrainingPlan.variant || selectedTrainingPlan.selectedVariant || 'A'}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-3 text-sm text-white">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">Sesión</div>
                <div className="mt-1 font-semibold">
                  {routineCurrentExerciseName
                    ? routineCurrentExerciseName
                    : `${routineExerciseEntries.length} ejercicios`}
                </div>
                <div className="mt-2 space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-gym-muted">
                  <p>
                    {isSetRestActive
                      ? `Descanso ${formatDuration(restCountdown)}`
                      : isSessionPaused
                        ? 'Pausada'
                        : isRoutineCompleted
                          ? 'Completada'
                          : isRoutineActive
                            ? 'En progreso'
                            : 'Pendiente'}
                  </p>
                  {currentSetValue != null && setsTargetValue != null && (
                    <p>Serie {currentSetValue}/{setsTargetValue}</p>
                  )}
                  {isTimedExercise ? (
                    <p>Tiempo {formatCountdown(timedRemainingSeconds)}</p>
                  ) : repsTargetValue != null ? (
                    <p>Reps {repsCompletedValue}/{repsTargetValue}</p>
                  ) : null}
                  {isCurrentExerciseCompleted ? (
                    <p className="text-gym-green">Ejercicio completado</p>
                  ) : isCurrentSetCompleted ? (
                    <p className="text-gym-cyan">Serie completada</p>
                  ) : null}
                  {restSecondsValue > 0 && !isSetRestActive && currentSetValue != null && setsTargetValue != null && currentSetValue < setsTargetValue && (
                    <p>Descanso por serie: {formatDuration(restSecondsValue)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-gym-border bg-gym-accent/70 px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-gym-cyan">
                Debes completar hoy
              </p>
              <p className="mt-1 text-sm text-gym-muted">
                {routineExerciseEntries.length} ejercicios en {activeRoutineDay.day_name || `Día ${activeRoutineDay.day_number || ''}`}.
              </p>
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
                onClick={handleCompleteRoutineDay}
                disabled={!token || !selectedRoutineDayId || !routineExerciseEntries.length || isRoutineCompleted || isCompletingRoutine}
                className="rounded-xl border border-gym-border bg-gym-accent px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:border-gym-cyan/40 hover:text-white"
              >
                {isCompletingRoutine ? 'Guardando...' : 'Guardar completada'}
              </button>
              {routineLoading && (
                <span className="text-xs font-mono uppercase tracking-[0.18em] text-gym-muted">Sincronizando progreso...</span>
              )}
              {routineError && (
                <span className="text-xs font-mono uppercase tracking-[0.18em] text-red-400">{routineError}</span>
              )}
            </div>
            <p className="mt-2 text-xs font-mono uppercase tracking-[0.16em] text-gym-muted">
              Palma abierta pausa o reanuda la sesión. OK sigue siendo solo para iniciar el plank.
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

            {savedRoutineDays.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {savedRoutineDays.map((day) => {
                  const isActive = Number(activeRoutineDay.day_number) === Number(day.day_number)
                  return (
                    <button
                      key={day.day_number}
                      type="button"
                      onClick={() => handleSelectRoutineDay(day)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
                        isActive
                          ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                          : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-cyan/40 hover:text-white'
                      }`}
                    >
                      D{day.day_number} · {day.day_name || `Día ${day.day_number}`}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-gym-cyan">
                Detalle del ejercicio activo
              </p>
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
                  )

                  return (
                <button
                  key={`${activeRoutineDay.day_label || activeRoutineDay.day_name || 'day'}-${index}-${displayName}`}
                  type="button"
                  onClick={() => {
                    hasManualExerciseSelectionRef.current = true
                    const normalized = TRAINING_EXERCISES_BY_NAME[displayName]
                    if (normalized) {
                      setExerciseName(normalized.name)
                    } else {
                      setExerciseName(displayName)
                    }
                  }}
                  aria-pressed={isActiveExercise}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                    isActiveExercise
                      ? 'relative scale-[1.01] border-gym-cyan bg-gym-cyan/15 text-white shadow-[0_0_0_1px_rgba(0,229,255,0.35),0_0_30px_rgba(0,229,255,0.18)] ring-1 ring-gym-cyan/30'
                      : isCurrentExerciseOnly
                        ? 'border-gym-cyan/40 bg-gym-accent/90 text-white shadow-[0_0_0_1px_rgba(0,229,255,0.12)]'
                        : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-cyan/40 hover:text-white'
                  }`}
                >
                  {(isActiveExercise || isCurrentExerciseOnly) && (
                    <span className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gym-cyan shadow-[0_0_16px_rgba(0,229,255,0.6)]" />
                  )}

                  <ExerciseGuideImage
                    key={`${displayName}-${imageUrl || 'no-image'}`}
                    src={imageUrl}
                    alt={displayName}
                    wrapperClassName="mb-2 overflow-hidden rounded-xl border border-white/5 bg-gym-sidebar"
                    imageClassName="h-24 w-full object-cover"
                    placeholderClassName="h-24"
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
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
                        {exerciseCountModeLocal === 'timer'
                          ? `Tiempo ${formatCountdown(completedRepsOrSeconds || plannedDurationSeconds)}/${formatCountdown(plannedDurationSeconds || completedRepsOrSeconds)}`
                          : `Series ${completedSets || 0}/${plannedSets || 0} · Reps ${completedRepsOrSeconds || 0}/${plannedRepsOrSeconds || 0}`}
                      </p>
                    </div>
                    {(exercise.sets || exercise.reps) && (
                      <div className={`flex flex-col items-end text-[10px] font-mono uppercase tracking-[0.16em] ${isActiveExercise || isCurrentExerciseOnly ? 'text-gym-cyan' : 'text-gym-cyan'}`}>
                        {exercise.sets && <span>{exercise.sets} series</span>}
                        {exercise.reps && <span>{exercise.reps} reps</span>}
                      </div>
                    )}
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
                      Cronómetro
                    </p>
                    <p className="mt-2 font-display text-5xl font-bold leading-none text-white">
                      {formatCountdown(timedRemainingSeconds)}
                    </p>
                    <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gym-cyan">
                      Serie {currentSetValue || 1}/{setsTargetValue || 1}
                    </p>
                  </div>
                ) : isTimedExercise && !isPlankExercise ? (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Tiempo
                    </p>
                    <p className="mt-2 font-display text-5xl font-bold leading-none text-white">
                      {formatCountdown(timedRemainingSeconds)}
                    </p>
                    <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gym-cyan">
                      Serie {currentSetValue || 1}/{setsTargetValue || 1}
                    </p>
                  </div>
                ) : exerciseCountMode === 'reps' ? (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Repeticiones
                    </p>
                    <p className="mt-2 font-display text-5xl font-bold leading-none text-white">
                      {repCount}
                    </p>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-gym-border bg-gym-accent">
                  <div className="relative aspect-[16/10] bg-gym-sidebar">
                    <ExerciseGuideImage
                      key={`${activeExercise.name}-${getExerciseImageUrl(activeExercise) || 'no-image'}`}
                      src={getExerciseImageUrl(activeExercise)}
                      alt={activeExercise.name}
                      wrapperClassName="h-full w-full"
                      imageClassName="h-full w-full object-cover"
                      placeholderClassName="h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-cyan">
                      Guía visual
                    </p>
                    <p className="mt-1 font-display text-sm font-bold text-white">
                      {activeExercise.name}
                    </p>
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
                          Brazo inicial
                        </span>
                        <select
                          value={curlStartArm}
                          onChange={(event) => setCurlStartArm(event.target.value)}
                          className="w-full rounded-xl border border-gym-border bg-gym-sidebar px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="left">Izquierdo</option>
                          <option value="right">Derecho</option>
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                          Reps por brazo
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
                        Haz {curlRepsPerArm} con el {ARM_LABELS[curlStartArm]} y luego {curlRepsPerArm} con el otro brazo.
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
                        Brazo actual: <span className="font-semibold">{ARM_LABELS[repPlan?.currentArm || curlStartArm]}</span>
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
                          : `Haz la señal OK para iniciar o palma abierta para pausar (${Math.round(gestureConfidence * 100)}%)`}
                      </p>
                      <p className="font-display text-4xl font-bold leading-none text-gym-cyan">
                        {String(Math.floor(plankSeconds / 60)).padStart(2, '0')}:{String(plankSeconds % 60).padStart(2, '0')}
                      </p>
                      <p className="leading-6 text-gym-muted">
                        Mantén una línea recta desde hombros hasta talones. Usa la cámara para vigilar estabilidad de torso.
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-gym-muted">
                        Palma abierta: pausar o reanudar · OK: iniciar plank
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
                      {notice?.message || handError || squatValidation?.feedback || insights.feedback || 'Esperando datos de la cámara.'}
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

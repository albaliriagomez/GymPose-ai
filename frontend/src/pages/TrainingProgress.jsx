import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { getRoutinesProgress, startRoutineDay, completeRoutineDay, completeRoutineSet, recordRoutineReps } from '../services/trainingService'

function normalizeSavedPlan(payload) {
  if (!payload) return null

  const plan =
    payload.planSnapshot ||
    payload.selectedPlanSnapshot ||
    payload.training_plan_snapshot ||
    payload.plan_snapshot ||
    payload.plan?.plan ||
    payload.plan ||
    payload
  const days = Array.isArray(plan.days) ? plan.days : Array.isArray(payload.days) ? payload.days : []
  if (!days.length) return null

  return {
    ...plan,
    days,
    variant: plan.variant || plan.selectedVariant || payload.selectedVariant || payload.variant || null,
    selectedVariant: plan.selectedVariant || payload.selectedVariant || plan.variant || payload.variant || null,
    frequency: plan.frequency || payload.frequency || null,
    frequency_level: plan.frequency_level || payload.frequency_level || payload.frequency || null,
    current_day: payload.current_day || payload.currentDay || plan.current_day || plan.currentDay || days[0] || null,
  }
}

function buildFallbackRoutinesFromPlan(plan) {
  if (!plan?.days?.length) return null

  const routines = plan.days.map((day) => ({
    ...day,
    status: day.status || 'pending',
    completed_exercises_count: Number(day.completed_exercises_count || 0),
    total_exercises: Number(day.total_exercises || day.exercises?.length || 0),
  }))

  return {
    routines,
    current_day: plan.current_day || routines[0] || null,
  }
}

// ─── Badge de estado ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const statusMap = {
    pending: { label: 'No iniciado', bg: 'bg-gym-accent', text: 'text-gym-muted' },
    in_progress: { label: 'En progreso', bg: 'bg-gym-cyan/10', text: 'text-gym-cyan', border: 'border-gym-cyan/30' },
    completed: { label: '✓ Completado', bg: 'bg-gym-green/10', text: 'text-gym-green', border: 'border-gym-green/30' },
  }
  const cfg = statusMap[status] || statusMap.pending
  return (
    <span className={`text-xs font-mono px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border || 'border-gym-border'}`}>
      {cfg.label}
    </span>
  )
}

// ─── Card de ejercicio ───────────────────────────────────────────────────────
function ExerciseCard({ exercise, index, dayNumber, dayStatus, onSerieComplete, loadingExercise }) {
  const [expanded, setExpanded] = useState(false)
  const progress = exercise.sets_completed > 0 ? `${exercise.sets_completed}/${exercise.sets_target} series` : 'Sin iniciar'
  const isCompleted = exercise.status === 'completed'
  const isActive = exercise.status === 'in_progress'
  const canMarkSerie = dayStatus === 'in_progress' && !isCompleted

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isCompleted ? 'border-gym-green/30 bg-gym-green/5' :
      isActive ? 'border-gym-cyan/30 bg-gym-cyan/5' :
      'border-gym-border hover:border-gym-cyan/30'
    }`}>
      <button
        className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gym-accent/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 ${
          isCompleted ? 'bg-gym-green/20 text-gym-green' :
          isActive ? 'bg-gym-cyan/20 text-gym-cyan' :
          'bg-gym-accent text-gym-muted'
        }`}>
          {isCompleted ? '✓' : index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isCompleted ? 'text-gym-green line-through' : 'text-white'}`}>
            {exercise.exercise_name}
          </p>
          <p className="text-gym-muted text-xs font-mono mt-0.5">{progress}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono px-2 py-1 rounded-lg bg-gym-accent text-gym-muted">
            {exercise.reps_target}
          </span>
          <svg className={`w-4 h-4 text-gym-muted transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-gym-bg border-t border-gym-border space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-gym-muted text-xs">Series</p>
              <p className="text-gym-cyan font-bold text-sm font-mono">{exercise.sets_completed}/{exercise.sets_target}</p>
            </div>
            <div className="text-center">
              <p className="text-gym-muted text-xs">Reps</p>
              <p className="text-gym-green font-bold text-sm font-mono">{exercise.reps_target}</p>
            </div>
            <div className="text-center">
              <p className="text-gym-muted text-xs">Estado</p>
              <p className={`font-bold text-sm font-mono ${isCompleted ? 'text-gym-green' : isActive ? 'text-gym-cyan' : 'text-gym-muted'}`}>
                {isCompleted ? 'OK' : isActive ? 'EN' : 'PENDIENTE'}
              </p>
            </div>
          </div>

          {/* Botón para marcar serie */}
          {canMarkSerie && (
            <button
              onClick={() => onSerieComplete(dayNumber, exercise.id, exercise.reps_target_value)}
              disabled={loadingExercise === exercise.id}
              className="w-full rounded-lg border border-gym-green/30 bg-gym-green/10 px-3 py-2 text-sm font-mono uppercase tracking-[0.18em] text-gym-green transition-colors hover:bg-gym-green/15 disabled:opacity-50"
            >
              {loadingExercise === exercise.id ? 'Guardando...' : `✓ Serie completada (${exercise.sets_completed}/${exercise.sets_target})`}
            </button>
          )}

          {isCompleted && (
            <div className="flex items-center justify-center rounded-lg border border-gym-green/30 bg-gym-green/5 py-2">
              <p className="text-gym-green text-xs font-mono font-bold">✓ Ejercicio completado</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card de día ────────────────────────────────────────────────────────────
function DayCard({ day, onStart, onComplete, onSerieComplete, loading, loadingExercise }) {
  const [expanded, setExpanded] = useState(false)
  const isCompleted = day.status === 'completed'
  const isActive = day.status === 'in_progress'
  const completionPct = day.total_exercises > 0 
    ? Math.round((day.completed_exercises_count / day.total_exercises) * 100) 
    : 0

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isCompleted ? 'border-gym-green/30 bg-gym-green/5' :
      isActive ? 'border-gym-cyan/30 bg-gym-cyan/5' :
      'border-gym-border hover:border-gym-cyan/30'
    }`}>
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gym-accent/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0 ${
          isCompleted ? 'bg-gym-green/20 text-gym-green border border-gym-green/30' :
          isActive ? 'bg-gym-cyan/20 text-gym-cyan border border-gym-cyan/30' :
          'bg-gym-accent border border-gym-border text-gym-muted'
        }`}>
          D{day.day_number}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-white font-semibold text-sm ${isCompleted ? 'line-through' : ''}`}>
            {day.day_name}
          </p>
          <p className="text-gym-muted text-xs font-mono mt-0.5">
            {day.completed_exercises_count}/{day.total_exercises} ejercicios completados
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className={`text-sm font-bold font-mono ${isCompleted ? 'text-gym-green' : isActive ? 'text-gym-cyan' : 'text-gym-muted'}`}>
              {completionPct}%
            </p>
            <div className="w-16 h-1 bg-gym-accent rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full transition-all ${isCompleted ? 'bg-gym-green' : 'bg-gym-cyan'}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <StatusBadge status={day.status} />

          <svg className={`w-4 h-4 text-gym-muted transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-3 bg-gym-bg border-t border-gym-border space-y-4">
          {/* Ejercicios */}
          <div className="space-y-2">
            <p className="text-gym-muted text-xs font-mono mb-2">EJERCICIOS</p>
            {day.exercises && day.exercises.map((ex, i) => (
              <ExerciseCard 
                key={i} 
                exercise={ex} 
                index={i}
                dayNumber={day.day_number}
                dayStatus={day.status}
                onSerieComplete={onSerieComplete}
                loadingExercise={loadingExercise}
              />
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-3 border-t border-gym-border">
            {day.status === 'pending' && (
              <button
                onClick={() => onStart(day.day_number)}
                disabled={loading}
                className="flex-1 rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2 text-sm font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors hover:bg-gym-cyan/15 disabled:opacity-50"
              >
                {loading ? 'Iniciando...' : 'Empezar día'}
              </button>
            )}

            {day.status === 'in_progress' && (
              <button
                onClick={() => {
                  if ((day.completed_exercises_count || 0) < (day.total_exercises || 0)) {
                    const ok = window.confirm('No has completado todas las series. ¿Marcar día como completado igualmente?')
                    if (!ok) return
                  }
                  onComplete(day.day_number)
                }}
                disabled={loading}
                className="flex-1 rounded-xl border border-gym-green/30 bg-gym-green/10 px-4 py-2 text-sm font-mono uppercase tracking-[0.18em] text-gym-green transition-colors hover:bg-gym-green/15 disabled:opacity-50"
              >
                {loading ? 'Completando...' : `Completar día (${day.completed_exercises_count}/${day.total_exercises})`}
              </button>
            )}

            {day.status === 'completed' && (
              <div className="flex-1 flex items-center justify-center rounded-xl border border-gym-green/30 bg-gym-green/5 py-2">
                <p className="text-gym-green text-sm font-mono font-bold">✓ Completado</p>
              </div>
            )}
          </div>

          {/* Info de tiempo */}
          {(day.started_at || day.completed_at) && (
            <div className="text-xs text-gym-muted font-mono space-y-1 p-3 rounded-lg bg-gym-accent/30">
              {day.started_at && (
                <p>Inicio: {new Date(day.started_at).toLocaleString()}</p>
              )}
              {day.completed_at && (
                <p>Fin: {new Date(day.completed_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function TrainingProgress() {
  const navigate = useNavigate()
  const token = localStorage.getItem('gympose_token')
  
  const [routines, setRoutines] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [loadingExercise, setLoadingExercise] = useState(null)

  // Cargar rutinas desde backend
  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    let cancelled = false

    const loadRoutines = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getRoutinesProgress(token)
        if (cancelled) return

        setRoutines(data)
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.detail || err.message || 'Error al cargar rutinas'
        setError(msg)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadRoutines()

    return () => {
      cancelled = true
    }
  }, [navigate, token])

  const handleStartDay = async (dayNumber) => {
    setActionLoading(true)
    try {
      await startRoutineDay(token, dayNumber)
      
      // Recargar rutinas para actualizar UI
      const data = await getRoutinesProgress(token)
      setRoutines(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo iniciar el día')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteDay = async (dayNumber) => {
    setActionLoading(true)
    try {
      await completeRoutineDay(token, dayNumber, { force: true })
      
      // Recargar rutinas para actualizar UI
      const data = await getRoutinesProgress(token)
      setRoutines(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo completar el día')
    } finally {
      setActionLoading(false)
    }
  }
  const handleSerieComplete = async (dayNumber, exerciseId, repsTargetValue) => {
    setLoadingExercise(exerciseId)
    try {
      // 1. Registrar reps reales del ejercicio (si aplica)
      await recordRoutineReps(token, dayNumber, { reps_count: repsTargetValue || 1 })

      // 2. Completar la serie del ejercicio
      await completeRoutineSet(token, dayNumber)

      // 3. Recargar estado para reflejar cambios en la UI
      const data = await getRoutinesProgress(token)
      setRoutines(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo marcar la serie')
    } finally {
      setLoadingExercise(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeInUp">
        {/* Header */}
        <div>
          <p className="text-gym-muted font-mono text-xs mb-1">MIS ENTRENAMIENTOS</p>
          <h1 className="font-display font-bold text-3xl text-white">Progreso del Plan</h1>
          <p className="text-gym-muted text-sm mt-2">Marca tus series completadas y sigue tu progreso</p>
        </div>

        {error && !loading && (
          <div className="rounded-2xl border border-red-700/30 bg-red-900/20 px-5 py-4">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gym-cyan/30 border-t-gym-cyan rounded-full animate-spin" />
            <p className="text-gym-muted font-mono text-sm">Cargando tu plan...</p>
          </div>
        ) : !routines || !routines.routines || routines.routines.length === 0 ? (
          <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-8 text-center space-y-3">
            <p className="text-gym-muted text-sm">No tienes un plan activo seleccionado.</p>
            <button
              onClick={() => navigate('/plan')}
              className="inline-block rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-6 py-2 text-sm font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors hover:bg-gym-cyan/15"
            >
              Ir a seleccionar plan
            </button>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gym-border bg-gym-sidebar p-4 text-center">
                <p className="text-gym-muted text-xs font-mono mb-1">DÍAS</p>
                <p className="text-white text-xl font-bold font-mono">{routines.routines.length}</p>
              </div>
              <div className="rounded-xl border border-gym-border bg-gym-sidebar p-4 text-center">
                <p className="text-gym-muted text-xs font-mono mb-1">COMPLETADOS</p>
                <p className="text-gym-green text-xl font-bold font-mono">
                  {routines.routines.filter(d => d.status === 'completed').length}
                </p>
              </div>
              <div className="rounded-xl border border-gym-border bg-gym-sidebar p-4 text-center">
                <p className="text-gym-muted text-xs font-mono mb-1">EN PROGRESO</p>
                <p className="text-gym-cyan text-xl font-bold font-mono">
                  {routines.routines.filter(d => d.status === 'in_progress').length}
                </p>
              </div>
              <div className="rounded-xl border border-gym-border bg-gym-sidebar p-4 text-center">
                <p className="text-gym-muted text-xs font-mono mb-1">PENDIENTES</p>
                <p className="text-gym-yellow text-xl font-bold font-mono">
                  {routines.routines.filter(d => d.status === 'pending').length}
                </p>
              </div>
            </div>

            {/* Día actual */}
            {routines.current_day && (
              <div className="rounded-2xl border border-gym-cyan/30 bg-gym-cyan/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gym-cyan animate-pulse" />
                  <p className="text-gym-cyan text-sm font-mono font-bold">HOY</p>
                </div>
                <p className="text-white text-lg font-semibold">{routines.current_day.day_name}</p>
                <p className="text-gym-muted text-xs">
                  Progreso: {routines.current_day.completed_exercises_count}/{routines.current_day.total_exercises} ejercicios
                </p>
              </div>
            )}

            {/* Lista de días */}
            <div className="space-y-3">
              <p className="text-gym-muted text-xs font-mono px-1">
                TU SEMANA DE ENTRENAMIENTOS
              </p>
              {routines.routines.map(day => (
                <DayCard
                  key={day.day_number}
                  day={day}
                  onStart={handleStartDay}
                  onComplete={handleCompleteDay}
                  onSerieComplete={handleSerieComplete}
                  loading={actionLoading}
                  loadingExercise={loadingExercise}
                />
              ))}
            </div>

            {/* Info */}
            <div className="rounded-xl border border-gym-border bg-gym-sidebar p-4 flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gym-cyan flex-shrink-0 mt-1" />
              <p className="text-gym-muted text-xs font-mono leading-relaxed">
                <strong className="text-white">Cómo usar:</strong> Haz click en un día para expandirlo. 
                Click "Empezar día" para iniciar. Luego expande cada ejercicio y haz click "✓ Serie completada" para registrar tu progreso.
                El progreso se guarda automáticamente en la base de datos.
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

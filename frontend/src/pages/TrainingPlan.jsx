import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { getTrainingPlan } from '../services/trainingService'

const FREQUENCY_OPTIONS = [
  {
    key: 'baja',
    label: 'Baja',
    days: '1-2 días/sem',
    desc: 'Ideal para comenzar o con agenda muy ocupada',
  },
  {
    key: 'media',
    label: 'Media',
    days: '3-4 días/sem',
    desc: 'Balance perfecto entre resultados y recuperación',
  },
  {
    key: 'alta',
    label: 'Alta',
    days: '5-6 días/sem',
    desc: 'Máxima intensidad para avanzados y comprometidos',
  },
]

const PLAN_COLORS = {
  Hipertrofia:   { accent: '#00e5ff', bg: 'rgba(0,229,255,0.08)',   border: 'rgba(0,229,255,0.2)',   badge: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40' },
  Metabólico:    { accent: '#ff6b35', bg: 'rgba(255,107,53,0.08)',  border: 'rgba(255,107,53,0.2)',  badge: 'bg-orange-900/40 text-orange-300 border-orange-700/40' },
  Mantenimiento: { accent: '#7bed9f', bg: 'rgba(123,237,159,0.08)', border: 'rgba(123,237,159,0.2)', badge: 'bg-green-900/40 text-green-300 border-green-700/40' },
}

const IMC_COLOR = (cat) => {
  if (!cat) return 'text-gym-muted'
  if (cat === 'Normal') return 'text-gym-green'
  if (cat === 'Bajo peso') return 'text-blue-400'
  if (cat === 'Sobrepeso') return 'text-gym-yellow'
  return 'text-red-400'
}

function PlanBadge({ label, color }) {
  return (
    <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${color}`}>
      {label}
    </span>
  )
}

function ExerciseRow({ exercise, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="group border border-gym-border rounded-xl overflow-hidden transition-all hover:border-gym-cyan/30"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-gym-accent hover:bg-gym-accent/80 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Número */}
        <span className="w-6 h-6 flex-shrink-0 rounded-full bg-gym-bg border border-gym-border text-gym-muted text-xs font-mono flex items-center justify-center">
          {index + 1}
        </span>

        {/* Nombre + grupo */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{exercise.name}</p>
          <p className="text-gym-muted text-xs font-mono">{exercise.muscle_group}</p>
        </div>

        {/* Stats rápidos */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-gym-cyan text-sm font-bold font-mono">{exercise.sets}</p>
            <p className="text-gym-muted text-xs">series</p>
          </div>
          <div className="text-center">
            <p className="text-gym-green text-sm font-bold font-mono">{exercise.reps}</p>
            <p className="text-gym-muted text-xs">reps</p>
          </div>
          <div className="text-center">
            <p className="text-gym-yellow text-sm font-bold font-mono">{exercise.rest_seconds}s</p>
            <p className="text-gym-muted text-xs">descanso</p>
          </div>
        </div>

        {/* Chevron CSS puro — sin emoji */}
        <svg
          className={`w-3.5 h-3.5 text-gym-muted transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 10 6" fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Expandido */}
      {open && (
        <div className="px-4 py-3 bg-gym-bg border-t border-gym-border space-y-2">
          {/* Stats en móvil */}
          <div className="flex gap-4 sm:hidden">
            <div><span className="text-gym-muted text-xs">Series: </span><span className="text-gym-cyan text-sm font-bold">{exercise.sets}</span></div>
            <div><span className="text-gym-muted text-xs">Reps: </span><span className="text-gym-green text-sm font-bold">{exercise.reps}</span></div>
            <div><span className="text-gym-muted text-xs">Descanso: </span><span className="text-gym-yellow text-sm font-bold">{exercise.rest_seconds}s</span></div>
          </div>
          {exercise.notes && (
            <div className="flex items-start gap-2 bg-gym-accent border border-gym-border rounded-lg px-3 py-2">
              {/* Punto de acento — sin emoji */}
              <span className="w-1.5 h-1.5 rounded-full bg-gym-cyan flex-shrink-0 mt-1.5" />
              <p className="text-gym-muted text-xs font-mono">{exercise.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WorkoutDayCard({ day, planType }) {
  const [expanded, setExpanded] = useState(false)
  const colors = PLAN_COLORS[planType] || PLAN_COLORS['Mantenimiento']

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ borderColor: expanded ? colors.accent + '55' : 'var(--gym-border)' }}
    >
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gym-accent/50"
        style={{ background: expanded ? colors.bg : '' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.accent }}
        >
          D{day.day_number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{day.day_name}</p>
          <p className="text-gym-muted text-xs font-mono mt-0.5">{day.focus}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-gym-muted text-xs font-mono hidden sm:block">{day.exercises.length} ejercicios</span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-lg"
            style={{ background: colors.bg, color: colors.accent, border: `1px solid ${colors.border}` }}
          >
            {expanded ? 'Cerrar' : 'Ver plan'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-2 bg-gym-sidebar">
          {day.exercises.map((ex, i) => (
            <ExerciseRow key={i} exercise={ex} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TrainingPlan() {
  const [frequency, setFrequency] = useState('media')
  const [plan, setPlan]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const token = localStorage.getItem('gympose_token')

  const fetchPlan = async (freq) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTrainingPlan(token, freq)
      setPlan(data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al cargar el plan'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPlan(frequency) }, [])

  const handleFrequency = (freq) => {
    setFrequency(freq)
    fetchPlan(freq)
  }

  const colors = plan
    ? (PLAN_COLORS[plan.plan_type] || PLAN_COLORS['Mantenimiento'])
    : PLAN_COLORS['Mantenimiento']

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeInUp">

        {/* ── Header ── */}
        <div>
          <p className="text-gym-muted font-mono text-xs mb-1">PLAN PERSONALIZADO · IA</p>
          <h1 className="font-display font-bold text-3xl text-white">Mi Plan de Entrenamiento</h1>
        </div>

        {/* ── Selector de Frecuencia ── */}
        <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-5">
          <p className="text-gym-muted text-xs font-mono mb-3">FRECUENCIA SEMANAL</p>
          <div className="grid grid-cols-3 gap-3">
            {FREQUENCY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleFrequency(opt.key)}
                className={`rounded-xl p-3 text-left border transition-all ${
                  frequency === opt.key
                    ? 'border-gym-cyan/40 bg-gym-cyan/10 text-white'
                    : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-border/70 hover:text-white'
                }`}
              >
                {/* Indicador visual sin emoji — línea de color */}
                <div className={`w-6 h-0.5 rounded-full mb-2 ${
                  opt.key === 'baja'  ? 'bg-gym-green'  :
                  opt.key === 'media' ? 'bg-gym-cyan'   : 'bg-gym-yellow'
                }`} />
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs font-mono opacity-70">{opt.days}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gym-cyan/30 border-t-gym-cyan rounded-full animate-spin" />
            <p className="text-gym-muted font-mono text-sm">Generando tu plan...</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-6 text-center space-y-2">
            <p className="text-red-400 font-mono text-sm">{error}</p>
            {error.includes('meta') && (
              <a href="/profile" className="text-gym-cyan text-xs underline">
                → Configurar meta en mi perfil
              </a>
            )}
          </div>
        )}

        {/* ── Plan ── */}
        {plan && !loading && (
          <>
            {/* Resumen */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: colors.bg, borderColor: colors.border }}
            >
              <div className="flex flex-wrap items-start gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <PlanBadge label={plan.plan_type}             color={PLAN_COLORS[plan.plan_type]?.badge} />
                    <PlanBadge label={`Intensidad ${plan.intensity}`} color="bg-gym-accent border-gym-border text-gym-muted" />
                    <PlanBadge label={plan.frequency_level}       color="bg-gym-accent border-gym-border text-gym-muted" />
                  </div>
                  <h2 className="text-white font-display font-bold text-xl">Plan {plan.plan_type}</h2>
                  <p className="text-gym-muted text-sm mt-1 leading-relaxed">{plan.description}</p>
                </div>
              </div>

              {plan.imc && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                  <span className="text-gym-muted text-xs font-mono">IMC:</span>
                  <span className={`font-bold font-mono text-sm ${IMC_COLOR(plan.imc_category)}`}>{plan.imc}</span>
                  <span className={`text-xs font-mono ${IMC_COLOR(plan.imc_category)}`}>· {plan.imc_category}</span>
                  <span className="text-gym-muted text-xs ml-auto font-mono">Meta: {plan.goal}</span>
                </div>
              )}
            </div>

            {/* Días */}
            <div className="space-y-3">
              <p className="text-gym-muted text-xs font-mono px-1">
                RUTINA SEMANAL · {plan.days_per_week} DÍAS
              </p>
              {plan.days.map(day => (
                <WorkoutDayCard key={day.day_number} day={day} planType={plan.plan_type} />
              ))}
            </div>

            {/* Nota al pie — sin emoji, con punto de acento */}
            <div className="bg-gym-sidebar border border-gym-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gym-cyan flex-shrink-0 mt-1.5" />
                <p className="text-gym-muted text-xs font-mono leading-relaxed">
                  <strong className="text-white">Consejo de progresión:</strong>{' '}
                  Aumenta el peso un 2.5–5% cada semana si completas todas las series con buena técnica.
                  Descansa al menos 1 día entre sesiones. Hidratación y sueño son clave para la recuperación.
                </p>
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
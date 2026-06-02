import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { getTrainingPlans, selectTrainingPlan } from '../services/trainingService'

// ─── Colores por tipo de plan ─────────────────────────────────────────────────
const PLAN_COLORS = {
  Hipertrofia:   { accent: '#00e5ff', bg: 'rgba(0,229,255,0.08)',   border: 'rgba(0,229,255,0.2)',   badge: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40' },
  Metabólico:    { accent: '#ff6b35', bg: 'rgba(255,107,53,0.08)',  border: 'rgba(255,107,53,0.2)',  badge: 'bg-orange-900/40 text-orange-300 border-orange-700/40' },
  Mantenimiento: { accent: '#7bed9f', bg: 'rgba(123,237,159,0.08)', border: 'rgba(123,237,159,0.2)', badge: 'bg-green-900/40 text-green-300 border-green-700/40' },
}

const IMC_COLOR = (cat) => {
  if (!cat) return 'text-gym-muted'
  if (cat === 'Normal')    return 'text-gym-green'
  if (cat === 'Bajo peso') return 'text-blue-400'
  if (cat === 'Sobrepeso') return 'text-gym-yellow'
  return 'text-red-400'
}

const FREQUENCY_OPTIONS = [
  { key: 'baja',  label: 'Baja',  days: '1-2 días/sem', desc: 'Ideal para comenzar o agenda muy ocupada',       color: 'bg-gym-green' },
  { key: 'media', label: 'Media', days: '3-4 días/sem', desc: 'Balance perfecto entre resultados y recuperación', color: 'bg-gym-cyan' },
  { key: 'alta',  label: 'Alta',  days: '5-6 días/sem', desc: 'Máxima intensidad para avanzados',                color: 'bg-gym-yellow' },
]

// ─── Badge ────────────────────────────────────────────────────────────────────
function PlanBadge({ label, color }) {
  return (
    <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${color}`}>
      {label}
    </span>
  )
}

// ─── Fila de ejercicio ────────────────────────────────────────────────────────
function ExerciseRow({ exercise, index }) {
  const [open, setOpen] = useState(false)
  const isDetectable = exercise.notes?.includes('Detectable en tiempo real')

  return (
    <div className={`group border rounded-xl overflow-hidden transition-all ${
      isDetectable ? 'border-gym-cyan/30 hover:border-gym-cyan/60' : 'border-gym-border hover:border-gym-cyan/30'
    }`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-gym-accent hover:bg-gym-accent/80 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="w-6 h-6 flex-shrink-0 rounded-full bg-gym-bg border border-gym-border text-gym-muted text-xs font-mono flex items-center justify-center">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-semibold truncate">{exercise.name}</p>
            {isDetectable && (
              <span className="flex-shrink-0 text-[10px] font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-1.5 py-0.5 rounded">
                LIVE
              </span>
            )}
          </div>
          <p className="text-gym-muted text-xs font-mono">{exercise.muscle_group}</p>
        </div>

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

        <svg className={`w-3.5 h-3.5 text-gym-muted transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div className="px-4 py-3 bg-gym-bg border-t border-gym-border space-y-2">
          <div className="flex gap-4 sm:hidden">
            <div><span className="text-gym-muted text-xs">Series: </span><span className="text-gym-cyan text-sm font-bold">{exercise.sets}</span></div>
            <div><span className="text-gym-muted text-xs">Reps: </span><span className="text-gym-green text-sm font-bold">{exercise.reps}</span></div>
            <div><span className="text-gym-muted text-xs">Descanso: </span><span className="text-gym-yellow text-sm font-bold">{exercise.rest_seconds}s</span></div>
          </div>
          {exercise.notes && (
            <div className="flex items-start gap-2 bg-gym-accent border border-gym-border rounded-lg px-3 py-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${isDetectable ? 'bg-gym-cyan' : 'bg-gym-muted'}`} />
              <p className="text-gym-muted text-xs font-mono leading-relaxed">{exercise.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card de día ──────────────────────────────────────────────────────────────
function WorkoutDayCard({ day, planType, onStartRoutine }) {
  const [expanded, setExpanded] = useState(false)
  const colors = PLAN_COLORS[planType] || PLAN_COLORS['Mantenimiento']
  const detectableCount = day.exercises.filter(e => e.notes?.includes('Detectable en tiempo real')).length

  return (
    <div className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: expanded ? colors.accent + '55' : 'var(--gym-border)' }}>
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gym-accent/50"
        style={{ background: expanded ? colors.bg : '' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.accent }}>
          D{day.day_number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{day.day_name}</p>
          <p className="text-gym-muted text-xs font-mono mt-0.5">{day.focus}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {detectableCount > 0 && (
            <span className="text-[10px] font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-1.5 py-0.5 rounded hidden sm:block">
              {detectableCount} LIVE
            </span>
          )}
          <span className="text-gym-muted text-xs font-mono hidden sm:block">{day.exercises.length} ejercicios</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-lg"
            style={{ background: colors.bg, color: colors.accent, border: `1px solid ${colors.border}` }}>
            {expanded ? 'Cerrar' : 'Ver plan'}
          </span>
        </div>
      </button>

        {expanded && (
          <div className="px-4 pb-4 pt-2 space-y-2 bg-gym-sidebar">
            {day.exercises.map((ex, i) => (
              <ExerciseRow key={i} exercise={ex} index={i} />
            ))}
            {onStartRoutine && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onStartRoutine(day)}
                  className="w-full rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-3 text-sm font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors hover:bg-gym-cyan/15"
                >
                  Empezar rutina de este día
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

// ─── Selector de variantes A/B/C ─────────────────────────────────────────────
function VariantSelector({ variants, selectedVariant, recommended, onSelect }) {
  return (
    <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-5">
      <p className="text-gym-muted text-xs font-mono mb-3">VARIANTE DE PLAN</p>
      <div className="grid grid-cols-3 gap-3">
        {['A', 'B', 'C'].map(v => {
          const plan = variants[v]
          if (!plan) return null
          const isSelected   = selectedVariant === v
          const isRecommended = recommended === v

          return (
            <button
              key={v}
              onClick={() => onSelect(v)}
              className={`relative rounded-xl p-3 text-left border transition-all ${
                isSelected
                  ? 'border-gym-cyan/40 bg-gym-cyan/10 text-white'
                  : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-border/70 hover:text-white'
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-2 -right-2 text-[9px] font-bold font-mono text-gym-bg bg-gym-cyan px-1.5 py-0.5 rounded-full leading-none">
                  IA
                </span>
              )}
              <p className="font-bold text-lg font-mono mb-0.5" style={{ color: isSelected ? '#00e5ff' : undefined }}>
                {v}
              </p>
              <p className="text-[10px] font-mono opacity-70 leading-snug line-clamp-2">
                {plan.description.split('.')[0] + '.'}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Coaching tip de Groq ─────────────────────────────────────────────────────
function CoachingTip({ recomendacion }) {
  if (!recomendacion) return null
  return (
    <div className="bg-gym-sidebar border border-gym-cyan/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-lg bg-gym-cyan/10 border border-gym-cyan/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-gym-cyan text-[10px] font-bold font-mono">IA</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gym-cyan text-xs font-mono mb-1">
            RECOMENDACIÓN · Variante {recomendacion.variante_recomendada}
          </p>
          <p className="text-gym-muted text-xs font-mono leading-relaxed mb-2">
            {recomendacion.razon}
          </p>
          <div className="border-t border-gym-border pt-2">
            <p className="text-white text-xs font-mono leading-relaxed">
              <strong className="text-gym-cyan">Consejo personalizado:</strong>{' '}
              {recomendacion.coaching_tip}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TrainingPlan() {
  const navigate = useNavigate()
  const [frequency, setFrequency] = useState('media')
  const [variants, setVariants] = useState(null)   // { A: plan, B: plan, C: plan }
  const [recomendacion, setRecomendacion] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saveNotice, setSaveNotice] = useState(null)
  const token = localStorage.getItem('gympose_token')

  useEffect(() => {
    let cancelled = false

    const loadPlans = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getTrainingPlans(token, frequency)
        if (cancelled) return

        // data = { variantes: { A, B, C }, recomendacion: { variante_recomendada, razon, coaching_tip } }
        setVariants(data.variantes)
        setRecomendacion(data.recomendacion)
        setSelectedVariant((current) => {
          const currentVariant = current
          if (currentVariant && data.variantes?.[currentVariant]) {
            return currentVariant
          }

          const recommendedVariant = data.recomendacion?.variante_recomendada
          if (recommendedVariant && data.variantes?.[recommendedVariant]) {
            return recommendedVariant
          }

          return Object.keys(data.variantes || {})[0] || null
        })
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.detail || 'Error al cargar el plan'
        setError(msg)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPlans()

    return () => {
      cancelled = true
    }
  }, [frequency, token])

  const handleFrequency = (freq) => {
    setFrequency(freq)
    setSaveNotice(null)
  }

  const handleSaveRoutine = () => {
    if (!activePlan || !selectedVariant) return

    const persistPlan = async () => {
      try {
        const data = await selectTrainingPlan(token, {
          planVariant: selectedVariant,
          frequency,
        })

        setSaveNotice({
          title: 'Rutina guardada',
          message: `Se guardó la variante ${selectedVariant} del plan ${activePlan.plan_type}. Ahora aparece en Entrenar.`,
        })

        localStorage.setItem(
          'gympose_training_plan',
          JSON.stringify({
            ...activePlan,
            variant: selectedVariant,
            frequency,
          }),
        )

        if (data?.plan?.plan) {
          setVariants((current) => ({
            ...(current || {}),
            [selectedVariant]: data.plan.plan,
          }))
        }
      } catch (err) {
        setSaveNotice({
          title: 'No se pudo guardar',
          message: err.response?.data?.detail || err.message || 'Error al guardar la rutina.',
        })
      }
    }

    void persistPlan()
  }

  const handleStartRoutine = (day) => {
    if (!activePlan || !day) return

    navigate('/training', {
      state: {
        routineDay: day,
        routineDayId: day.day_id || day.id || day.day_number,
        trainingPlan: activePlan,
      },
    })
  }

  const activePlan = variants?.[selectedVariant]

  const colors = activePlan
    ? (PLAN_COLORS[activePlan.plan_type] || PLAN_COLORS['Mantenimiento'])
    : PLAN_COLORS['Mantenimiento']

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeInUp">

        {/* Header */}
        <div>
          <p className="text-gym-muted font-mono text-xs mb-1">PLAN PERSONALIZADO · IA</p>
          <h1 className="font-display font-bold text-3xl text-white">Mi Plan de Entrenamiento</h1>
        </div>

        {saveNotice && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-emerald-200">
              {saveNotice.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-50/90">
              {saveNotice.message}
            </p>
          </div>
        )}

        {/* Selector de Frecuencia */}
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
                <div className={`w-6 h-0.5 rounded-full mb-2 ${opt.color}`} />
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs font-mono opacity-70">{opt.days}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gym-cyan/30 border-t-gym-cyan rounded-full animate-spin" />
            <p className="text-gym-muted font-mono text-sm">Generando tus 3 variantes de plan...</p>
            <p className="text-gym-muted font-mono text-xs opacity-60">La IA analiza tu perfil para recomendar la mejor</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-6 text-center space-y-2">
            <p className="text-red-400 font-mono text-sm">{error}</p>
            {error.includes('meta') && (
              <a href="/profile" className="text-gym-cyan text-xs underline">→ Configurar meta en mi perfil</a>
            )}
          </div>
        )}

        {/* Planes */}
        {variants && !loading && (
          <>
            {/* Selector de variante */}
            <VariantSelector
              variants={variants}
              selectedVariant={selectedVariant}
              recommended={recomendacion?.variante_recomendada}
              onSelect={setSelectedVariant}
            />

            {/* Recomendación IA */}
            <CoachingTip recomendacion={recomendacion} />

            {/* Resumen del plan activo */}
            {activePlan && (
              <div className="rounded-2xl p-5 border" style={{ background: colors.bg, borderColor: colors.border }}>
                <div className="flex flex-wrap items-start gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <PlanBadge label={activePlan.plan_type}                    color={PLAN_COLORS[activePlan.plan_type]?.badge} />
                      <PlanBadge label={`Intensidad ${activePlan.intensity}`}    color="bg-gym-accent border-gym-border text-gym-muted" />
                      <PlanBadge label={activePlan.frequency_level}              color="bg-gym-accent border-gym-border text-gym-muted" />
                      <PlanBadge label={`Variante ${activePlan.variant || selectedVariant}`} color="bg-gym-accent border-gym-border text-gym-cyan" />
                    </div>
                    <h2 className="text-white font-display font-bold text-xl">
                      Plan {activePlan.plan_type} — Variante {activePlan.variant || selectedVariant}
                    </h2>
                    <p className="text-gym-muted text-sm mt-1 leading-relaxed">{activePlan.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveRoutine}
                    className="rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-cyan transition-colors hover:bg-gym-cyan/15"
                  >
                    Guardar rutina
                  </button>
                  <span className="self-center text-xs font-mono uppercase tracking-[0.16em] text-gym-muted">
                    Guarda la variante elegida antes de empezar el día
                  </span>
                </div>

                {activePlan.imc && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                    <span className="text-gym-muted text-xs font-mono">IMC:</span>
                    <span className={`font-bold font-mono text-sm ${IMC_COLOR(activePlan.imc_category)}`}>{activePlan.imc}</span>
                    <span className={`text-xs font-mono ${IMC_COLOR(activePlan.imc_category)}`}>· {activePlan.imc_category}</span>
                    <span className="text-gym-muted text-xs ml-auto font-mono">Meta: {activePlan.goal}</span>
                  </div>
                )}
              </div>
            )}

            {/* Leyenda LIVE */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-1.5 py-0.5 rounded">LIVE</span>
              <p className="text-gym-muted text-xs font-mono">= detectable en tiempo real con tu cámara en el módulo de Entrenamiento</p>
            </div>

            {/* Días */}
            {activePlan && (
              <div className="space-y-3">
                <p className="text-gym-muted text-xs font-mono px-1">
                  RUTINA SEMANAL · {activePlan.days_per_week} DÍAS
                </p>
                  {activePlan.days.map(day => (
                    <WorkoutDayCard
                      key={day.day_number}
                      day={day}
                      planType={activePlan.plan_type}
                      onStartRoutine={handleStartRoutine}
                    />
                  ))}
                </div>
              )}

            {/* Nota al pie */}
            <div className="bg-gym-sidebar border border-gym-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gym-cyan flex-shrink-0 mt-1.5" />
                <p className="text-gym-muted text-xs font-mono leading-relaxed">
                  <strong className="text-white">Consejo de progresión:</strong>{' '}
                  Aumenta el peso un 2.5–5% cada semana si completas todas las series con buena técnica.
                  Descansa al menos 1 día entre sesiones. Hidratación y sueño son clave para la recuperación.
                  Los ejercicios marcados con{' '}
                  <span className="text-gym-cyan">LIVE</span>{' '}
                  pueden ser validados en tiempo real en el módulo de Entrenamiento.
                </p>
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/authContext.js'
import {
  createProgressLog,
  generateProgressPlan,
  getProgressPlan,
  getProgressSummary,
} from '../services/progressService'
import ProgressOnboardingWizard from './progress/ProgressOnboardingWizard'
import {
  LoadingSkeleton,
  EmptyState,
  Panel,
  StatCard,
  MiniMetric,
  WeekDayCard,
  DayModal,
  MealDayCard,
  MealModal,
  Field,
} from './progress/ProgressViewComponents'
import {
  HEADER_OPTIONS,
  PLAN_TABS,
  DEFAULT_LOG,
  getDefaultOnboarding,
  buildGeneratePayload,
  hasPlan,
  isFallbackPlan,
  normalizeRoutine,
  normalizeWeeklyRoutine,
  normalizeMealDays,
  formatDate,
  formatGoalLabel,
  normalizedCompare,
  getTodayRoutineIndex,
  formatExerciseLabel,
  pickText,
} from './progress/progressUtils'

export default function Progress() {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [headerMode, setHeaderMode] = useState('plan')
  const [activeTab, setActiveTab] = useState('resumen')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [selectedDayIndex, setSelectedDayIndex] = useState(undefined)
  const [selectedMealDayIndex, setSelectedMealDayIndex] = useState(null)
  const [logForm, setLogForm] = useState(DEFAULT_LOG)
  const [onboarding, setOnboarding] = useState(() => getDefaultOnboarding(user))
  const [fallbackRetryUsed, setFallbackRetryUsed] = useState(false)

  useEffect(() => {
    setOnboarding((current) => ({
      ...current,
      goal: formatGoalLabel(user?.goal) || current.goal,
      weight_kg: user?.weight_kg ?? current.weight_kg,
      height_cm: user?.height_cm ?? current.height_cm,
    }))
  }, [user?.goal, user?.height_cm, user?.weight_kg])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const [planResult, summaryResult] = await Promise.allSettled([
          getProgressPlan(),
          getProgressSummary('weekly'),
        ])

        if (cancelled) return

        const fetchedPlan = planResult.status === 'fulfilled' ? planResult.value : null
        if (hasPlan(fetchedPlan)) {
          await applyPlan(fetchedPlan, { autoRetry: true })
        } else {
          setPlan(null)
          setHeaderMode('questions')
          setActiveTab('resumen')
          setSelectedDayIndex(undefined)
          setSelectedMealDayIndex(null)
          setFallbackRetryUsed(false)
        }

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value)
        } else if (summaryResult.reason?.response?.status !== 404) {
          throw summaryResult.reason
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'No se pudo cargar el progreso.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const hasPlanNow = hasPlan(plan)
  const needsOnboarding = !loading && !hasPlanNow
  const currentGoal = formatGoalLabel(plan?.goal || onboarding.goal || user?.goal) || 'Sin definir'
  const requestedGoal = formatGoalLabel(onboarding.goal || user?.goal) || 'Sin definir'
  const generatedGoal = formatGoalLabel(plan?.goal_normalized || plan?.goal || plan?.status) || 'Sin definir'
  const currentBody = pickText(plan?.body_style || onboarding.body_style || '', 'No definido')
  const requestedBody = pickText(onboarding.body_style || '', 'No definido')
  const generatedBody = pickText(plan?.body_style || '', 'No definido')
  const caloriesGoal = plan?.calories_goal ?? plan?.objetivo_kcal ?? null
  const summaryText = pickText(plan?.summary_text || plan?.summary || '', '')
  const source = pickText(plan?.source || '', '')
  const routineTodayFromPlan = normalizeRoutine(plan?.rutina_diaria_actual || plan?.today_routine)
  const weeklyRoutine = normalizeWeeklyRoutine(plan?.rutina_semanal || plan?.weekly_plan)
  const weeklyRoutineMonFri = weeklyRoutine.slice(0, 5)
  const mealSchedule = normalizeMealDays(plan?.plan_comidas || plan?.meal_plan)
  const mealsPerDay = plan?.meals_per_day || onboarding.meals_per_day || 4
  const todayRoutineIndex = getTodayRoutineIndex(weeklyRoutineMonFri)
  const routineToday =
    routineTodayFromPlan || weeklyRoutineMonFri.find((day) => day.day_index === todayRoutineIndex) || weeklyRoutineMonFri[0] || null
  const selectedDay = weeklyRoutineMonFri.find((day) => day.day_index === selectedDayIndex) || null
  const selectedMealDay = mealSchedule.find((day) => day.dayIndex === selectedMealDayIndex) || null
  const goalMatches = normalizedCompare(requestedGoal, generatedGoal)
  const bodyMatches = normalizedCompare(requestedBody, generatedBody)

  useEffect(() => {
    if (!weeklyRoutineMonFri.length) {
      setSelectedDayIndex(null)
      return
    }

    if (selectedDayIndex === undefined) {
      setSelectedDayIndex(todayRoutineIndex ?? weeklyRoutineMonFri[0].day_index)
      return
    }

    const exists = weeklyRoutineMonFri.some((day) => day.day_index === selectedDayIndex)
    if (selectedDayIndex != null && !exists) {
      setSelectedDayIndex(weeklyRoutineMonFri[0].day_index)
    }
  }, [selectedDayIndex, todayRoutineIndex, weeklyRoutineMonFri])

  useEffect(() => {
    if (!plan || fallbackRetryUsed || !isFallbackPlan(plan)) return
    void regeneratePlanOnce()
  }, [plan, fallbackRetryUsed])

  const progressPct = useMemo(() => {
    if (summary?.progress_pct != null) return summary.progress_pct
    if (!summary?.sessions_completed || !weeklyRoutineMonFri.length) return 0
    return Math.min(100, Math.round((summary.sessions_completed / weeklyRoutineMonFri.length) * 100))
  }, [summary, weeklyRoutineMonFri.length])

  async function fetchPlan({ autoRetry = false } = {}) {
    const latest = await getProgressPlan()
    if (hasPlan(latest)) {
      await applyPlan(latest, { autoRetry })
      return latest
    }

    setPlan(null)
    setFallbackRetryUsed(false)
    return null
  }

  async function applyPlan(nextPlan, { autoRetry = false } = {}) {
    if (!nextPlan) {
      setPlan(null)
      return null
    }

    if (autoRetry && isFallbackPlan(nextPlan) && !fallbackRetryUsed && onboarding.goal) {
      setFallbackRetryUsed(true)
      return regeneratePlanOnce()
    }

    setPlan(nextPlan)
    setHeaderMode(isFallbackPlan(nextPlan) ? 'questions' : 'plan')
    setActiveTab('resumen')
    setSelectedDayIndex(undefined)
    setSelectedMealDayIndex(null)
    setFallbackRetryUsed(isFallbackPlan(nextPlan))
    return nextPlan
  }

  async function regeneratePlanOnce() {
    const payload = buildGeneratePayload(onboarding)
    await generateProgressPlan(payload)
    return fetchPlan({ autoRetry: false })
  }

  async function handleGenerate(event) {
    event.preventDefault()

    try {
      setGenerating(true)
      setError('')
      setSuccess('')
      setFallbackRetryUsed(false)

      const payload = buildGeneratePayload(onboarding)
      await generateProgressPlan(payload)

      let latest = await fetchPlan({ autoRetry: false })
      if (latest && isFallbackPlan(latest)) {
        setSuccess('La IA devolvió un plan de respaldo. Se reintentará con el onboarding completo.')
        latest = await regeneratePlanOnce()
      }

      if (hasPlan(latest)) {
        setSuccess('Plan generado correctamente.')
      } else {
        setError('La IA no devolvió un plan válido.')
      }

      const refreshedSummary = await getProgressSummary('weekly')
      setSummary(refreshedSummary)
    } catch (err) {
      setError(err.message || 'No se pudo generar el plan.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleLogSubmit(event) {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = {
        ...logForm,
        sessions: Number(logForm.sessions) || 1,
        reps: Number(logForm.reps) || 0,
        duration: Number(logForm.duration) || 0,
        weight_kg: logForm.weight_kg === '' ? null : Number(logForm.weight_kg),
      }

      await createProgressLog(payload)
      setSuccess('Progreso registrado.')
      setLogForm((current) => ({
        ...current,
        notes: '',
        reps: 0,
        duration: 0,
        weight_kg: '',
      }))

      const refreshed = await getProgressSummary('weekly')
      setSummary(refreshed)
    } catch (err) {
      setError(err.message || 'No se pudo registrar el progreso.')
    } finally {
      setSaving(false)
    }
  }

  const toggleEquipment = (item) => {
    setOnboarding((current) => {
      const exists = current.equipment_available.includes(item)
      return {
        ...current,
        equipment_available: exists
          ? current.equipment_available.filter((entry) => entry !== item)
          : [...current.equipment_available, item],
      }
    })
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-gym-border bg-gym-sidebar p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">Progreso</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-white">Tu plan, en pasos simples</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gym-muted">
                Elige lo que quieres lograr, cómo quieres verte y responde unas pocas preguntas.
                La rutina sale de lunes a viernes y las comidas para toda la semana.
              </p>
            </div>

            <div className="flex gap-2">
              {HEADER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setHeaderMode(option.value)}
                  className={`rounded-xl border px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-all ${
                    headerMode === option.value
                      ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                      : 'border-gym-border bg-gym-accent text-gym-muted hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-6 text-sm text-red-100">
            {error}
          </div>
        ) : needsOnboarding ? (
          <div className="space-y-5">
            <Panel title="Preguntas" subtitle="Configura tu plan">
              <p className="text-sm leading-6 text-gym-muted">
                Completa estos pasos para que la IA genere tu rutina semanal y tus comidas.
              </p>
            </Panel>
            <ProgressOnboardingWizard
              onboarding={onboarding}
              setOnboarding={setOnboarding}
              onboardingStep={onboardingStep}
              setOnboardingStep={setOnboardingStep}
              toggleEquipment={toggleEquipment}
              onSubmit={handleGenerate}
              submitLabel="Generar plan"
              submitting={generating}
            />
          </div>
        ) : headerMode === 'questions' ? (
          <div className="space-y-5">
            <Panel title="Preguntas" subtitle="Cambia lo que quieres lograr">
              <p className="text-sm leading-6 text-gym-muted">
                Responde de nuevo para rehacer la rutina, comidas y calorías según tu objetivo real.
              </p>
            </Panel>
            <ProgressOnboardingWizard
              onboarding={onboarding}
              setOnboarding={setOnboarding}
              onboardingStep={onboardingStep}
              setOnboardingStep={setOnboardingStep}
              toggleEquipment={toggleEquipment}
              onSubmit={handleGenerate}
              submitLabel="Regenerar plan"
              submitting={generating}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-gym-border bg-gym-sidebar p-3">
              {PLAN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-all ${
                    activeTab === tab.id
                      ? 'border border-gym-cyan/30 bg-gym-cyan/10 text-white'
                      : 'border border-transparent bg-gym-accent text-gym-muted hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-4 text-xs font-mono uppercase tracking-[0.18em] text-gym-muted">
              Origen del plan:{' '}
              <span className="text-white">
                {source === 'groq' ? 'IA' : source === 'fallback' ? 'Respaldo local' : source || 'Desconocido'}
              </span>
            </div>

            {activeTab === 'resumen' && (
              <section className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-4">
                  <StatCard label="Objetivo" value={currentGoal} />
                  <StatCard label="Tipo de cuerpo" value={currentBody} />
                  <StatCard label="Peso actual" value={plan?.current_weight ? `${plan.current_weight} kg` : '—'} />
                  <StatCard label="Calorías meta" value={caloriesGoal ? `${caloriesGoal} kcal` : '—'} />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <Panel title="Resumen del plan" subtitle="Lo más importante">
                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniMetric label="Comidas por día" value={`${mealsPerDay}`} />
                      <MiniMetric label="Rutina semanal" value={`${weeklyRoutineMonFri.length} días`} />
                      <MiniMetric label="Peso meta" value={plan?.target_weight ? `${plan.target_weight} kg` : '—'} />
                      <MiniMetric label="Estado" value={formatGoalLabel(plan?.goal_normalized || plan?.status || 'Activo')} />
                    </div>
                    {plan?.updated_at && (
                      <div className="mt-4 rounded-2xl border border-gym-border bg-gym-accent p-4 text-sm text-white">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                          Actualizado
                        </div>
                        <div className="mt-2 font-display text-lg font-bold">{formatDate(plan.updated_at)}</div>
                      </div>
                    )}
                  </Panel>

                  <Panel title="Progreso" subtitle="Semanal o mensual">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted">
                          Avance
                        </div>
                        <div className="mt-1 font-display text-3xl font-bold text-white">{progressPct}%</div>
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gym-cyan/30 bg-gym-cyan/10">
                        <span className="font-display text-lg font-bold text-gym-cyan">
                          {summary?.sessions_completed ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-gym-accent">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <MiniMetric label="Sesiones" value={summary?.sessions_completed ?? 0} />
                      <MiniMetric label="Reps" value={summary?.repetitions_total ?? 0} />
                      <MiniMetric label="Días activos" value={summary?.active_days ?? 0} />
                      <MiniMetric label="Duración" value={`${summary?.total_duration_min ?? 0} min`} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-gym-border bg-gym-accent p-4 text-sm text-white">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                        Cambio de peso
                      </div>
                      <div className="mt-2 font-display text-2xl font-bold">
                        {summary?.weight_change_kg != null
                          ? `${summary.weight_change_kg > 0 ? '+' : ''}${summary.weight_change_kg} kg`
                          : '—'}
                      </div>
                    </div>
                  </Panel>
                </div>

                <Panel title="Resumen de la IA" subtitle="Cierre del plan">
                  {summaryText && (
                    <div className="mb-4 rounded-2xl border border-gym-cyan/20 bg-gym-cyan/10 p-4 text-sm leading-7 text-white">
                      {summaryText}
                    </div>
                  )}
                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-gym-border bg-gym-accent p-4">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                        Lo que pediste
                      </div>
                      <div className="mt-2 font-display text-2xl font-bold text-white">{requestedGoal}</div>
                      <div className="mt-2 text-sm text-gym-muted">{requestedBody}</div>
                      <p className="mt-2 text-sm leading-6 text-gym-muted">
                        Esta es la meta que la IA debería respetar al generar tu semana.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gym-border bg-gym-accent p-4">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                        Lo que generó la IA
                      </div>
                      <div className="mt-2 font-display text-2xl font-bold text-white">{generatedGoal}</div>
                      <div className="mt-2 text-sm text-gym-muted">{generatedBody}</div>
                      <p className="mt-2 text-sm leading-6 text-gym-muted">
                        Si esto no coincide con lo que querías, toca `Preguntas` y regenera el plan.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <MiniMetric label="Coincide objetivo" value={goalMatches ? 'Sí' : 'No'} />
                    <MiniMetric label="Coincide cuerpo" value={bodyMatches ? 'Sí' : 'No'} />
                    <MiniMetric label="Peso ideal" value={plan?.target_weight ? `${plan.target_weight} kg` : '—'} />
                    <MiniMetric label="Calorías" value={caloriesGoal ? `${caloriesGoal} kcal` : '—'} />
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'rutina' && (
              <section className="space-y-4">
                <Panel title="Rutina de hoy" subtitle="Lunes a viernes" badge={routineToday?.day_label || '--'}>
                  {routineToday ? (
                    <div className="grid gap-4 md:grid-cols-[1fr_11rem]">
                      <div className="rounded-2xl border border-gym-border bg-gym-accent p-4">
                        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted">
                          Enfoque
                        </div>
                        <div className="mt-2 font-display text-xl font-bold text-white">
                          {pickText(routineToday.focus, 'Rutina del día')}
                        </div>
                        <div className="mt-4 space-y-2">
                          {(routineToday.exercises || []).map((exercise, index) => (
                            <div
                              key={`${routineToday.day_label}-${index}-${pickText(exercise.name, 'exercise')}`}
                              className="rounded-xl border border-gym-border bg-gym-sidebar px-3 py-2 text-white"
                            >
                              <div className="font-medium">{formatExerciseLabel(exercise.name)}</div>
                              <div className="mt-1 text-xs text-gym-muted">
                                {pickText(exercise.sets, 0)} series · {pickText(exercise.reps, 0)} repeticiones · {pickText(exercise.rest_sec, 0)} seg descanso
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gym-border bg-gym-accent p-4">
                        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted">
                          Duración
                        </div>
                        <div className="mt-2 font-display text-4xl font-bold text-white">
                          {pickText(routineToday.duration_min, 0)}
                        </div>
                        <div className="text-sm text-gym-muted">minutos</div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="No hay rutina disponible para hoy." />
                  )}
                </Panel>

                <Panel title="Semana" subtitle="Lunes a viernes">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {weeklyRoutineMonFri.length ? (
                      weeklyRoutineMonFri.map((day) => (
                        <WeekDayCard
                          key={`${day.day_index}-${pickText(day.day_label, 'day')}`}
                          day={day}
                          active={selectedDay?.day_index === day.day_index}
                          onClick={() => setSelectedDayIndex(day.day_index)}
                        />
                      ))
                    ) : (
                      <EmptyState text="El plan no trae rutina semanal todavía." />
                    )}
                  </div>
                </Panel>

                {selectedDay && (
                  <DayModal day={selectedDay} onClose={() => setSelectedDayIndex(null)} />
                )}
              </section>
            )}

            {activeTab === 'comidas' && (
              <section className="space-y-4">
                <Panel title="Comidas de la semana" subtitle={`${mealsPerDay} comidas por día`}>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {mealSchedule.length ? (
                      mealSchedule.map((day) => (
                        <MealDayCard
                          key={`${day.dayIndex}-${pickText(day.dayLabel, 'meal-day')}`}
                          day={day}
                          active={selectedMealDay?.dayIndex === day.dayIndex}
                          onClick={() => setSelectedMealDayIndex(day.dayIndex)}
                        />
                      ))
                    ) : (
                      <EmptyState text="El plan no trae comidas detalladas." />
                    )}
                  </div>
                </Panel>

                {selectedMealDay && (
                  <MealModal
                    day={selectedMealDay}
                    onClose={() => setSelectedMealDayIndex(null)}
                    targetMeals={mealsPerDay}
                  />
                )}
              </section>
            )}

            {activeTab === 'progreso' && (
              <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <form onSubmit={handleLogSubmit} className="rounded-3xl border border-gym-border bg-gym-sidebar p-5">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted">
                      Registrar avance
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-bold text-white">Nuevo registro</h2>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Field
                      label="Fecha"
                      type="date"
                      value={logForm.date}
                      onChange={(value) => setLogForm((current) => ({ ...current, date: value }))}
                    />
                    <Field
                      label="Ejercicio"
                      value={logForm.exercise_type}
                      onChange={(value) => setLogForm((current) => ({ ...current, exercise_type: value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Sesiones"
                        type="number"
                        min="1"
                        value={logForm.sessions}
                        onChange={(value) => setLogForm((current) => ({ ...current, sessions: value }))}
                      />
                      <Field
                        label="Repeticiones"
                        type="number"
                        min="0"
                        value={logForm.reps}
                        onChange={(value) => setLogForm((current) => ({ ...current, reps: value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Duración"
                        type="number"
                        min="0"
                        value={logForm.duration}
                        onChange={(value) => setLogForm((current) => ({ ...current, duration: value }))}
                      />
                      <Field
                        label="Peso"
                        type="number"
                        min="0"
                        value={logForm.weight_kg}
                        onChange={(value) => setLogForm((current) => ({ ...current, weight_kg: value }))}
                      />
                    </div>
                    <label className="space-y-1">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                        Notas
                      </span>
                      <textarea
                        value={logForm.notes}
                        onChange={(event) => setLogForm((current) => ({ ...current, notes: event.target.value }))}
                        className="min-h-24 w-full rounded-xl border border-gym-border bg-gym-accent px-3 py-2 text-sm text-white outline-none"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-4 w-full rounded-2xl px-4 py-3 font-display text-sm font-bold text-gym-bg transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}
                  >
                    {saving ? 'Guardando...' : 'Registrar progreso'}
                  </button>
                  {success && <p className="mt-3 text-sm text-emerald-300">{success}</p>}
                </form>

                <Panel title="Resumen rápido" subtitle="Lo que ya hiciste">
                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniMetric label="Sesiones" value={summary?.sessions_completed ?? 0} />
                    <MiniMetric label="Reps" value={summary?.repetitions_total ?? 0} />
                    <MiniMetric label="Días activos" value={summary?.active_days ?? 0} />
                    <MiniMetric label="Duración" value={`${summary?.total_duration_min ?? 0} min`} />
                  </div>
                  <div className="mt-4 rounded-2xl border border-gym-border bg-gym-accent p-4 text-sm text-white">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Cambio de peso
                    </div>
                    <div className="mt-2 font-display text-2xl font-bold">
                      {summary?.weight_change_kg != null
                        ? `${summary.weight_change_kg > 0 ? '+' : ''}${summary.weight_change_kg} kg`
                        : '—'}
                    </div>
                  </div>
                </Panel>
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

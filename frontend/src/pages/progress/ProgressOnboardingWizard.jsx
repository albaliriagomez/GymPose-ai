import React from 'react'
import {
  BODY_REFERENCE_OPTIONS,
  DAYS_OPTIONS,
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  MEALS_OPTIONS,
  ONBOARDING_STEPS,
  SEX_OPTIONS,
  ACTIVITY_OPTIONS,
} from './progressUtils'
import {
  BodyIcon,
  Field,
  SelectField,
} from './ProgressViewComponents'

export default function ProgressOnboardingWizard({
  onboarding,
  setOnboarding,
  onboardingStep,
  setOnboardingStep,
  toggleEquipment,
  onSubmit,
  submitLabel,
  submitting = false,
}) {
  const StepRenderer = [GoalStep, BodyStep, DataStep, EquipmentStep][onboardingStep] || GoalStep

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-gym-cyan/30 bg-gym-sidebar p-6">
      <div className="rounded-2xl border border-gym-border bg-gym-accent p-4">
        <div className="flex flex-wrap items-center gap-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const active = onboardingStep === index
            const done = onboardingStep > index
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setOnboardingStep(index)}
                className={`rounded-full border px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-all ${
                  active
                    ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                    : done
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                      : 'border-gym-border bg-gym-sidebar text-gym-muted hover:text-white'
                }`}
              >
                {index + 1}. {step.label}
              </button>
            )
          })}
        </div>
        <div className="mt-4 h-2 rounded-full bg-gym-sidebar">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
            style={{ width: `${((onboardingStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-gym-muted">
          {ONBOARDING_STEPS[onboardingStep]?.helper}
        </p>
      </div>

      <StepRenderer
        onboarding={onboarding}
        setOnboarding={setOnboarding}
        toggleEquipment={toggleEquipment}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOnboardingStep((current) => Math.max(0, current - 1))}
          disabled={onboardingStep === 0}
          className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-3 text-sm font-medium text-white transition-all disabled:opacity-40"
        >
          Volver
        </button>

        <div className="flex gap-3">
          {onboardingStep < ONBOARDING_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setOnboardingStep((current) => Math.min(ONBOARDING_STEPS.length - 1, current + 1))
              }
              className="rounded-2xl px-4 py-3 text-sm font-bold text-gym-bg transition-all"
              style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl px-4 py-3 text-sm font-bold text-gym-bg transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}
            >
              {submitting ? 'Generando...' : submitLabel}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

function GoalStep({ onboarding, setOnboarding }) {
  return (
    <section className="rounded-2xl border border-gym-border bg-gym-accent p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">Paso 1</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-white">¿Qué quieres lograr?</h2>
      <p className="mt-2 text-sm text-gym-muted">
        Solo te mostramos tres opciones: ganar masa muscular, bajar de peso o definir.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {GOAL_OPTIONS.map((goal) => {
          const active = onboarding.goal === goal.value
          return (
            <button
              key={goal.value}
              type="button"
              onClick={() => setOnboarding((current) => ({ ...current, goal: goal.value }))}
              className={`rounded-2xl border p-4 text-left transition-all ${
                active
                  ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                  : 'border-gym-border bg-gym-sidebar text-gym-muted hover:border-gym-cyan/40 hover:text-white'
              }`}
            >
              <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${goal.accent}`} />
              <div className="mt-3 font-display text-lg font-bold">{goal.label}</div>
              <p className="mt-1 text-sm leading-6 opacity-80">{goal.description}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function BodyStep({ onboarding, setOnboarding }) {
  return (
    <section className="rounded-2xl border border-gym-border bg-gym-accent p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">Paso 2</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-white">¿Cómo quieres verte?</h2>
      <p className="mt-2 text-sm text-gym-muted">
        Elige una referencia visual para que la IA ajuste el estilo del plan.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {BODY_REFERENCE_OPTIONS.map((item) => {
          const active = onboarding.body_reference_id === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setOnboarding((current) => ({
                  ...current,
                  body_reference_id: item.id,
                  body_style: item.style,
                }))
              }
              className={`rounded-3xl border text-left transition-all overflow-hidden ${
                active ? 'border-gym-cyan bg-gym-cyan/10' : 'border-gym-border bg-gym-sidebar hover:border-gym-cyan/40'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-display text-lg font-bold text-white">{item.title}</div>
                  <div className={`h-3 w-3 rounded-full ${active ? 'bg-gym-cyan' : 'bg-gym-muted/30'}`} />
                </div>
                <div className="mt-4 flex justify-center">
                  <BodyIcon active={active} />
                </div>
                <p className="mt-4 text-sm leading-6 text-gym-muted">{item.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function DataStep({ onboarding, setOnboarding }) {
  return (
    <section className="rounded-2xl border border-gym-border bg-gym-accent p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">Paso 3</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-white">
        Responde unas pocas preguntas
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field
          label="Peso actual (kg)"
          type="number"
          value={onboarding.weight_kg}
          onChange={(value) => setOnboarding((current) => ({ ...current, weight_kg: value }))}
        />
        <Field
          label="Altura (cm)"
          type="number"
          value={onboarding.height_cm}
          onChange={(value) => setOnboarding((current) => ({ ...current, height_cm: value }))}
        />
        <Field
          label="Edad"
          type="number"
          value={onboarding.age}
          onChange={(value) => setOnboarding((current) => ({ ...current, age: value }))}
        />
        <SelectField
          label="Sexo"
          value={onboarding.sex}
          onChange={(value) => setOnboarding((current) => ({ ...current, sex: value }))}
          options={SEX_OPTIONS}
        />
        <SelectField
          label="Nivel de actividad"
          value={onboarding.activity_level}
          onChange={(value) => setOnboarding((current) => ({ ...current, activity_level: value }))}
          options={ACTIVITY_OPTIONS}
        />
        <SelectField
          label="Comidas por día"
          value={onboarding.meals_per_day}
          onChange={(value) => setOnboarding((current) => ({ ...current, meals_per_day: Number(value) }))}
          options={MEALS_OPTIONS.map((value) => ({ value, label: `${value} comidas` }))}
        />
        <SelectField
          label="Días por semana"
          value={onboarding.days_per_week}
          onChange={(value) => setOnboarding((current) => ({ ...current, days_per_week: Number(value) }))}
          options={DAYS_OPTIONS.map((value) => ({ value, label: `${value} días` }))}
        />
      </div>
    </section>
  )
}

function EquipmentStep({ onboarding, toggleEquipment }) {
  return (
    <section className="rounded-2xl border border-gym-border bg-gym-accent p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">Paso 4</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-white">Equipo disponible</h2>
      <p className="mt-2 text-sm text-gym-muted">
        Marca solo lo que sí tienes en casa o en el gimnasio.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map((item) => {
          const active = onboarding.equipment_available.includes(item)
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggleEquipment(item)}
              className={`rounded-full border px-4 py-2 text-sm font-mono uppercase tracking-[0.14em] transition-all ${
                active
                  ? 'border-gym-cyan bg-gym-cyan/10 text-white'
                  : 'border-gym-border bg-gym-sidebar text-gym-muted hover:text-white'
              }`}
            >
              {item}
            </button>
          )
        })}
      </div>
    </section>
  )
}


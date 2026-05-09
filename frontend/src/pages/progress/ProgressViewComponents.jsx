import React from 'react'
import { formatExerciseLabel, formatMealText, formatPlanLabel, formatWeekday } from './progressUtils'

export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <SkeletonPanel />
        <SkeletonPanel />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-gym-border bg-gym-sidebar p-5">
      <div className="h-3 w-24 rounded bg-gym-accent" />
      <div className="mt-4 h-8 w-32 rounded bg-gym-accent" />
    </div>
  )
}

function SkeletonPanel() {
  return (
    <div className="rounded-3xl border border-gym-border bg-gym-sidebar p-5">
      <div className="h-3 w-32 rounded bg-gym-accent" />
      <div className="mt-4 h-6 w-48 rounded bg-gym-accent" />
      <div className="mt-6 space-y-3">
        <div className="h-16 rounded-2xl bg-gym-accent" />
        <div className="h-16 rounded-2xl bg-gym-accent/70" />
      </div>
    </div>
  )
}

export function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-gym-border bg-gym-accent p-4 text-sm text-gym-muted">
      {text}
    </div>
  )
}

export function Panel({ title, subtitle, badge, children }) {
  return (
    <section className="rounded-3xl border border-gym-border bg-gym-sidebar p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted">
            {subtitle}
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">{title}</h2>
        </div>
        {badge && (
          <div className="rounded-full border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-gym-cyan">
            {badge}
          </div>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-gym-border bg-gym-sidebar p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-muted">{label}</div>
      <div className="mt-3 font-display text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

export function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-gym-border bg-gym-accent p-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">{label}</div>
      <div className="mt-2 font-display text-xl font-bold text-white">{value}</div>
    </div>
  )
}

export function WeekDayCard({ day, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[10.5rem] snap-start rounded-2xl border p-3 text-left transition-all ${
        active
          ? 'border-gym-cyan bg-gym-cyan/10 shadow-[0_0_0_1px_rgba(0,229,255,0.2)]'
          : 'border-gym-border bg-gym-accent hover:border-gym-cyan/40'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-cyan">
          {formatWeekday(day.day_label)}
        </div>
        <div className="text-xs text-gym-muted">{day.duration_min ?? 0} min</div>
      </div>
      <div className="mt-3 font-display text-lg font-bold leading-tight text-white">
        {formatPlanLabel(day.focus) || 'Sesión'}
      </div>
      <div className="mt-3 text-sm text-gym-muted">{(day.exercises || []).length} ejercicios</div>
      <div className="mt-4 space-y-2">
        {(day.exercises || []).slice(0, 1).map((exercise, index) => (
          <div
            key={`${day.day_label}-${index}-${formatExerciseLabel(exercise.name) || 'exercise'}`}
            className="rounded-xl border border-gym-border bg-gym-sidebar px-3 py-2 text-sm text-white"
          >
            <div className="font-medium">{formatExerciseLabel(exercise.name)}</div>
            <div className="mt-1 text-[11px] text-gym-muted">
              {exercise.sets} series · {exercise.reps} reps · {exercise.rest_sec} seg
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-gym-cyan">Toca para ver más</div>
    </button>
  )
}

export function DayModal({ day, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-gym-border bg-gym-sidebar p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-cyan">
              {formatWeekday(day.day_label)}
            </div>
            <h3 className="mt-2 font-display text-3xl font-bold text-white">
              {formatPlanLabel(day.focus) || 'Rutina del día'}
            </h3>
            <p className="mt-2 text-sm text-gym-muted">
              {day.duration_min ?? 0} minutos · {day.exercises?.length ?? 0} ejercicios
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gym-border bg-gym-accent px-3 py-2 text-sm text-white hover:border-gym-cyan/40"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {(day.exercises || []).map((exercise, index) => (
            <div
              key={`${day.day_label}-modal-${index}-${formatExerciseLabel(exercise.name) || 'exercise'}`}
              className="rounded-2xl border border-gym-border bg-gym-accent p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-xl font-bold text-white">
                  {formatExerciseLabel(exercise.name)}
                </div>
                <div className="text-xs text-gym-muted">
                  {exercise.rest_sec ?? 0} seg descanso
                </div>
              </div>
              <div className="mt-2 text-sm text-gym-muted">
                {exercise.sets ?? 0} series · {exercise.reps ?? 0} repeticiones
              </div>
              {exercise.description && (
                <div className="mt-2 text-sm leading-6 text-gym-muted">{exercise.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MealDayCard({ day, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-gym-cyan bg-gym-cyan/10 shadow-[0_0_0_1px_rgba(0,229,255,0.2)]'
          : 'border-gym-border bg-gym-accent hover:border-gym-cyan/40'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-cyan">
          {formatWeekday(day.dayLabel)}
        </div>
        <div className="text-xs text-gym-muted">{day.meals.length} comidas</div>
      </div>
      <div className="mt-3 font-display text-lg font-bold leading-tight text-white">
        Menú del día
      </div>
      <div className="mt-3 text-sm text-gym-muted">
        {formatMealText(day.meals[0]?.name || day.meals[0]?.title, 'Toca para ver comidas')}
      </div>
      <div className="mt-4 text-xs text-gym-cyan">Toca para ver más</div>
    </button>
  )
}

export function MealModal({ day, onClose, targetMeals }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-gym-border bg-gym-sidebar p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gym-cyan">
              {formatWeekday(day.dayLabel)}
            </div>
            <h3 className="mt-2 font-display text-3xl font-bold text-white">Comidas del día</h3>
            <p className="mt-2 text-sm text-gym-muted">
              {day.meals.length} comidas planificadas · {targetMeals} comidas al día
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gym-border bg-gym-accent px-3 py-2 text-sm text-white hover:border-gym-cyan/40"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {day.meals.map((meal, index) => (
            <div
              key={`${day.dayIndex}-${index}-${formatMealText(meal.name || meal.title, 'meal')}`}
              className="rounded-2xl border border-gym-border bg-gym-accent p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-xl font-bold text-white">
                  {formatMealText(meal.name || meal.title, 'Comida sugerida')}
                </div>
                <div className="text-xs text-gym-muted">
                  {meal.calories ?? meal.kcal ? `${meal.calories ?? meal.kcal} kcal` : 'Sugerida'}
                </div>
              </div>
              {meal.description && (
                <div className="mt-2 text-sm leading-6 text-gym-muted">
                  {formatMealText(meal.description)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BodyIcon({ active }) {
  return (
    <svg viewBox="0 0 120 120" className={`h-24 w-24 ${active ? 'text-gym-cyan' : 'text-gym-muted'}`} fill="none">
      <circle cx="60" cy="24" r="10" stroke="currentColor" strokeWidth="4" />
      <path d="M60 34v28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M36 48l24 14 24-14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 62l-10 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M76 62l10 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 98h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

export function Field({ label, value, onChange, type = 'text', min, step }) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
        {label}
      </span>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gym-border bg-gym-accent px-3 py-2 text-sm text-white outline-none"
      />
    </label>
  )
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gym-border bg-gym-accent px-3 py-2 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}


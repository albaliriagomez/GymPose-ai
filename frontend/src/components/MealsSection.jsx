import React, { useState } from 'react';
import MealCard from './MealCard';
import { useNutrition } from '../hooks/useNutrition'

const MEAL_EMOJIS = {
  Desayuno: '🥗',
  Almuerzo: '🍽️',
  Cena: '🌙',
  Snack: '🥑',
};


const MealsSection = () => {
  const { meals, lastUpdated, loading, error, refetch } = useNutrition()

  //Macros acumulados solo de comidas consumidas o en curso
  const consumed = meals.filter((m) => m.status !== 'pending')
  const totalMacros = consumed.reduce(
    (acc, m) => ({
      proteina: acc.proteina + (m.macros?.proteina ?? 0),
      carbos:   acc.carbos   + (m.macros?.carbos   ?? 0),
      grasas:   acc.grasas   + (m.macros?.grasas   ?? 0),
      kcal:     acc.kcal     + macrosToKcal(m.macros ?? {}),
    }),
    { proteina: 0, carbos: 0, grasas: 0, kcal: 0 }
  )

  return (
    <div className="mt-8 animate-fadeInUp animation-delay-300">

      {/*Encabezado sección*/}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gym-text">Comidas del día</h2>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-[10px] text-gym-muted uppercase tracking-wider">
              Última actualización: {lastUpdated}
            </span>
          )}
          <button
            className="flex items-center gap-1.5 text-xs font-semibold text-gym-cyan border border-gym-cyan/30 px-3 py-1.5 rounded-lg bg-gym-cyan/5 hover:bg-gym-cyan/10 transition-all duration-200"
            onClick={() => { /*TODO: abrir modal de registro manual*/ }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Registrar comida
          </button>
        </div>
      </div>

      {/*Estado: loading*/}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-gym-card border border-gym-border animate-pulse" />
          ))}
        </div>
      )}

      {/*Estado: error*/}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="text-gym-muted text-sm">{error}</span>
          <button
            onClick={refetch}
            className="text-xs font-semibold text-gym-cyan border border-gym-cyan/30 px-3 py-1.5 rounded-lg bg-gym-cyan/5 hover:bg-gym-cyan/10 transition-all duration-200"
          >
            Reintentar
          </button>
        </div>
      )}

      {/*Estado: sin comidas*/}
      {!loading && !error && meals.length === 0 && (
        <div className="py-8 text-center">
          <span className="text-gym-muted text-sm">No hay comidas registradas hoy.</span>
        </div>
      )}

      {/*Lista de comidas*/}
      {!loading && !error && meals.length > 0 && (
        <div className="flex flex-col gap-3">
          {meals.map((meal, i) => (
            <div
              key={meal.id}
              className="animate-fadeInUp"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <MealCard
                {...meal}
                emoji={MEAL_EMOJIS[meal.name] ?? '🍽️'}
              />
            </div>
          ))}
        </div>
      )}

      {/*resumen de macros del día*/}
      {!loading && !error && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gym-card border border-gym-border">
          <span className="text-xs text-gym-muted">Macros consumidos hoy</span>
          <div className="flex items-center gap-5">
            <MacroSummaryItem label="Proteína" value={`${totalMacros.proteina}g`} color="text-gym-cyan" />
            <MacroSummaryItem label="Carbos"   value={`${totalMacros.carbos}g`}   color="text-gym-yellow" />
            <MacroSummaryItem label="Grasas"   value={`${totalMacros.grasas}g`}   color="text-red-400" />
            <div className="w-px h-6 bg-gym-border" />
            <MacroSummaryItem label="Consumido" value={`${totalMacros.kcal} kcal`} color="text-gym-text" />
          </div>
        </div>
      )}

    </div>
  )
}

const macrosToKcal = ({ proteina = 0, carbos = 0, grasas = 0 }) =>
  proteina * 4 + carbos * 4 + grasas * 9

const MacroSummaryItem = ({ label, value, color }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className={`text-sm font-bold ${color}`}>{value}</span>
    <span className="text-[10px] text-gym-muted uppercase tracking-wide">{label}</span>
  </div>
)

export default MealsSection
import React from "react";
import { Link } from "react-router-dom";
import CircularProgress from "../components/CircularProgress";
import TipCard from "../components/TipCard";
import MealsSection from "../components/MealsSection";
import { useNutrition } from "../hooks/useNutrition";

const Nutrition = () => {
  const nutrition = useNutrition();
  const { meals, profile, profileLoading, tip, tipLoading } = nutrition;
  const consumed = Math.round(meals.filter((m) => m.status === "completed").reduce((acc, m) => acc + (m.kcal || 0), 0));

  return (
    <div className="w-full">
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-3xl font-bold text-gym-text mb-2">Analisis Nutricional</h1>
        <p className="text-gym-muted text-sm">Optimiza tu ingesta calorica basada en tu rendimiento biomecanico.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 animate-fadeInUp animation-delay-100">
          <div className="bg-gym-card rounded-lg p-4 border border-gym-border h-full flex items-center justify-center transition-all duration-500 hover:border-gym-cyan hover:shadow-lg hover:shadow-gym-cyan/20">
            {profileLoading ? (
              <div className="w-40 h-40 rounded-full border border-gym-border animate-pulse" />
            ) : profile.incomplete ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-gym-muted">Completa tu perfil para ver tu objetivo</p>
                <Link to="/profile" className="text-gym-cyan text-xs font-semibold">Ir a perfil</Link>
              </div>
            ) : (
              <CircularProgress current={consumed} target={profile.objetivo_kcal || 0} />
            )}
          </div>
        </div>

        <div className="lg:col-span-8 animate-fadeInUp animation-delay-200">
          {tipLoading ? (
            <div className="rounded-lg border border-gym-cyan bg-gym-card p-6 h-full animate-pulse">
              <div className="h-4 w-24 bg-gym-border rounded mb-4" />
              <div className="h-6 w-1/2 bg-gym-border rounded mb-3" />
              <div className="h-4 w-full bg-gym-border rounded mb-2" />
              <div className="h-4 w-4/5 bg-gym-border rounded" />
            </div>
          ) : (
            <TipCard title={tip.title} content={tip.tip} />
          )}
        </div>
      </div>
      <MealsSection
        meals={nutrition.meals}
        lastUpdated={nutrition.lastUpdated}
        loading={nutrition.loading}
        error={nutrition.error}
        refetch={nutrition.refetch}
        registerMeal={nutrition.registerMeal}
        suggestMeals={nutrition.suggestMeals}
        updateMealStatus={nutrition.updateMealStatus}
        actionLoading={nutrition.actionLoading}
      />
    </div>
  );
};

export default Nutrition;

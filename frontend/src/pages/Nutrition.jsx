import React, { useState } from 'react';
import CircularProgress from '../components/CircularProgress';
import TipCard from '../components/TipCard';
import WaterWidget from '../components/WaterWidget';

const Nutrition = () => {
  // Mock data - This will be replaced with API calls
  const [nutritionData] = useState({
    caloriesCurrent: 1875,
    caloriesTarget: 2500,
    waterCurrent: 1.8,
    waterTarget: 3.5,
    tipTitle: "Hidratación Inteligente",
    tipContent: "Tu rendimiento decae un 15% con solo un 2% de deshidratación. Para hoy, prioriza beber 500ml adicionales después de tu sesión de pierna para facilitar la recuperación neuromuscular."
  });

  return (
    <div className="w-full">
      {/*Page Header*/}
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-3xl font-bold text-gym-text mb-2">
          Análisis Nutricional
        </h1>
        <p className="text-gym-muted text-sm">
          Optimiza tu ingesta calórica basada en tu rendimiento biomecánico.
        </p>
      </div>

      {/*Main content grid*/}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/*Left column - Caloric Progress*/}
        <div className="lg:col-span-4 animate-fadeInUp animation-delay-100">
          <div className="bg-gym-card rounded-lg p-4 border border-gym-border h-full flex items-center justify-center transition-all duration-500 hover:border-gym-cyan hover:shadow-lg hover:shadow-gym-cyan/20">
            <CircularProgress
              current={nutritionData.caloriesCurrent}
              target={nutritionData.caloriesTarget}
            />
          </div>
        </div>

        {/*Right column - Tips and Hydration*/}
        <div className="lg:col-span-8 animate-fadeInUp animation-delay-200">
          <TipCard
            title={nutritionData.tipTitle}
            content={nutritionData.tipContent}
            waterWidget={
              <WaterWidget
                current={nutritionData.waterCurrent}
                target={nutritionData.waterTarget}
              />
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Nutrition;

import React from 'react';

/**
 * @param {number} current - Current water consumed in liters
 * @param {number} target - Target water consumption in liters
 */
const WaterWidget = ({ current = 1.8, target = 3.5 }) => {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="flex items-center gap-3 animate-fadeInUp animation-delay-200">
      {/*Water drop icon*/}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gym-cyan bg-opacity-20 flex items-center justify-center animate-bounce" style={{ animationDuration: '1.5s' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-gym-cyan"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.32 0z" />
          </svg>
        </div>
      </div>

      {/*Water consumption info*/}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gym-muted">Consumo actual</span>
          <span className="text-sm font-semibold text-gym-cyan">
            {current.toFixed(1)}L / {target.toFixed(1)}L
          </span>
        </div>
        
        {/*Progress bar*/}
        <div className="w-full h-1.5 bg-gym-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gym-cyan to-gym-cyan-dim rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default WaterWidget;

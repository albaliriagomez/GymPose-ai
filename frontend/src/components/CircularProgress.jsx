import React from 'react';

/**
 * @param {number} current - Current calories consumed
 * @param {number} target - Target calories for the day
 * @param {string} unit - Unit label KCAL
 */
const CircularProgress = ({ current = 1875, target = 2500, unit = "KCAL" }) => {
  const percentage = Math.min((current / target) * 100, 100);
  
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/*Circular Progress Ring*/}
      <div className="relative w-40 h-40 flex items-center justify-center mb-2 animate-slide-in-left animation-delay-100">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 160 160"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/*Background circle*/}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#1e2d45"
            strokeWidth="8"
          />
          
          {/*Progress circle*/}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>

        {/*Center content*/}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-gym-text">
            {current.toLocaleString()}
          </div>
          <div className="text-xs text-gym-muted font-medium">
            {unit} HOY
          </div>
        </div>
      </div>

      {/*Labels below circle*/}
      <div className="text-center mt-1">
        <p className="text-gym-muted text-xs mb-1">Objetivo Calórico</p>
        <p className="text-sm font-semibold">
          <span className="text-gym-cyan">META:</span>{' '}
          <span className="text-gym-text">{target.toLocaleString()} kcal</span>
        </p>
      </div>

      {/*Energy icon decoration - background*/}
      <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-15 text-gym-cyan pointer-events-none">
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" />
        </svg>
      </div>
    </div>
  );
};

export default CircularProgress;

import React from 'react';

const MealCard = ({
  name,
  description,
  time,
  status = 'pending',
  macros = { proteina: 30, carbos: 50, grasas: 15 },
  emoji = '🍽️',
  aiSuggested = false,
}) => {

  const isCompleted   = status === 'completed';
  const isInProgress  = status === 'in_progress';

  return (
    <div
      className={`
        relative flex items-center gap-4 rounded-lg p-4 border
        transition-all duration-300 group
        ${isInProgress
          ? 'bg-gym-card border-gym-yellow/30 shadow-md shadow-gym-yellow/10'
          : 'bg-gym-card border-gym-border hover:border-gym-cyan/40 hover:shadow-md hover:shadow-gym-cyan/10'
        }
      `}
    >
      {/*Acento lateral para "en curso"*/}
      {isInProgress && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-gym-yellow rounded-full" />
      )}

      {/*Thumbnail / Emoji*/}
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-gym-border/50 flex items-center justify-center text-xl select-none">
        {emoji}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gym-text">{name}</span>
          {aiSuggested && (
            <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border border-gym-cyan/30 text-gym-cyan bg-gym-cyan/10">
              IA
            </span>
          )}
        </div>

        <p className="text-xs text-gym-muted truncate mb-2">{description}</p>

        {/*Macro tags*/}
        <div className="flex flex-wrap gap-1.5">
          <MacroTag color="text-gym-cyan"   dot="bg-gym-cyan"    label="Proteína" value={macros.proteina} />
          <MacroTag color="text-gym-yellow" dot="bg-gym-yellow"  label="Carbos"   value={macros.carbos}   />
          <MacroTag color="text-red-400"    dot="bg-red-400"     label="Grasas"   value={macros.grasas}   />
        </div>
      </div>

      {/*Columna derecha: hora + estado*/}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <span className="text-[11px] text-gym-muted tabular-nums">{time}</span>

        {isInProgress && (
          <span className="text-[9px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-gym-yellow/20 border border-gym-yellow/40 text-gym-yellow">
            En curso
          </span>
        )}

        {/*Icono de estado*/}
        {isCompleted ? (
          <CheckIcon />
        ) : (
          <CircleIcon />
        )}
      </div>
    </div>
  );
};

const MacroTag = ({ color, dot, label, value }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gym-muted px-2 py-0.5 rounded-full border border-gym-border bg-gym-border/30`}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
    {label}: {value}g
  </span>
);

const CheckIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gym-cyan/15 flex items-center justify-center">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6.5l3 3 5-5"
        stroke="#00e5ff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const CircleIcon = () => (
  <div className="w-5 h-5 rounded-full border-2 border-gym-border" />
);

export default MealCard;
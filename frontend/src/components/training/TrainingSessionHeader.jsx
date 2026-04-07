export default function TrainingSessionHeader({
  isLive,
  onToggleSession,
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">
          Entrenar En Vivo
        </p>
        <h1 className="mt-1 font-display text-4xl font-bold text-white">
          Entrena en vivo
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gym-muted">
          Enciende tu camara para verte en pantalla y seguir tu movimiento en tiempo real.
        </p>
      </div>

      <button
        onClick={onToggleSession}
        className={`inline-flex items-center justify-center rounded-xl px-5 py-3 font-display text-sm font-bold tracking-wide transition-all ${
          isLive
            ? 'bg-red-600 text-white hover:bg-red-500'
            : 'bg-gym-cyan text-gym-bg hover:brightness-110'
        }`}
      >
        {isLive ? 'Detener camara' : 'Iniciar camara'}
      </button>
    </div>
  )
}

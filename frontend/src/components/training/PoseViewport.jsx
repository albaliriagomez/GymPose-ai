export default function PoseViewport({
  videoRef,
  canvasRef,
  cameraError,
  poseError,
  isLive,
}) {
  const statusText = isLive
    ? 'Camara encendida'
    : 'Camara apagada'

  return (
    <section className="rounded-[28px] border border-gym-border bg-gym-sidebar p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">Vista en vivo</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">Tu camara</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] ${
          isLive ? 'bg-gym-green/10 text-gym-green' : 'bg-gym-accent text-gym-muted'
        }`}>
          {statusText}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[26px] border border-gym-border bg-[#07111f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.16),transparent_38%)]" />
        <video
          ref={videoRef}
          className="camera-mirror aspect-video w-full object-cover"
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="camera-mirror pointer-events-none absolute inset-0 h-full w-full"
        />

        {!isLive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gym-bg/70 backdrop-blur-sm">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gym-cyan/20 bg-gym-cyan/10 text-gym-cyan">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                  <path d="M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                  <path d="M15 10l5-3v10l-5-3z" />
                </svg>
              </div>
              <p className="mt-4 font-display text-2xl font-bold text-white">Activa la camara para iniciar</p>
              <p className="mt-2 text-sm leading-6 text-gym-muted">
                Cuando la enciendas, podras verte en pantalla y seguir tu postura.
              </p>
            </div>
          </div>
        )}
      </div>

      {(cameraError || poseError) && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {cameraError || poseError}
        </div>
      )}
    </section>
  )
}

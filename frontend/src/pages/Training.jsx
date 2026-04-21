import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import PoseViewport from '../components/training/PoseViewport'
import TrainingSessionHeader from '../components/training/TrainingSessionHeader'
import { useCameraStream } from '../hooks/useCameraStream'
import { useLivePose } from '../hooks/useLivePose'

export default function Training() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lastFeedbackRef = useRef('')
  const lastRepCountRef = useRef(0)

  const [isSessionLive, setIsSessionLive] = useState(false)
  const [notice, setNotice] = useState(null)

  const {
    status: cameraStatus,
    error: cameraError,
    startCamera,
    stopCamera,
    isActive: isCameraActive,
    isStarting,
  } = useCameraStream(videoRef)

  const {
    status: poseStatus,
    error: poseError,
    insights,
    repCount,
    squatValidation,
  } = useLivePose({
    videoRef,
    canvasRef,
    isRunning: isSessionLive && isCameraActive,
  })

  async function handleToggleSession() {
    if (isSessionLive) {
      setIsSessionLive(false)
      stopCamera()
      return
    }

    const started = await startCamera()
    setIsSessionLive(started)
  }

  const statusMessage = getStatusMessage({
    cameraError,
    poseError,
    cameraStatus,
    poseStatus,
    isSessionLive,
    hasPose: insights.hasPose,
  })

  useEffect(() => {
    const feedback = squatValidation?.feedback || insights.feedback || ''
    if (!feedback || feedback === lastFeedbackRef.current) return

    lastFeedbackRef.current = feedback
    setNotice({
      tone: squatValidation?.isValid ? 'success' : 'info',
      title: !squatValidation?.hasFullBody
        ? 'Cuerpo incompleto'
        : squatValidation?.isValid
          ? 'Sentadilla detectada'
          : 'Aviso postural',
      message: feedback,
    })
  }, [insights.feedback, squatValidation?.feedback, squatValidation?.hasFullBody, squatValidation?.isValid])

  useEffect(() => {
    if (repCount <= lastRepCountRef.current) return

    lastRepCountRef.current = repCount
    setNotice({
      tone: 'success',
      title: 'Repetición contabilizada',
      message: `Llevas ${repCount} sentadilla${repCount === 1 ? '' : 's'}.`,
    })
  }, [repCount])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <TrainingSessionHeader
          isLive={isSessionLive}
          onToggleSession={handleToggleSession}
          disabled={cameraStatus === 'requesting' || isStarting}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <PoseViewport
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraError={cameraError}
            poseError={poseError}
            isLive={isSessionLive}
          />

          <aside className="xl:sticky xl:top-6">
            <section className="rounded-2xl border border-gym-border bg-gym-sidebar px-5 py-4">
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4 text-center">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                    Repeticiones
                  </p>
                  <p className="mt-2 font-display text-5xl font-bold leading-none text-white">
                    {repCount}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition-all ${
                    notice?.tone === 'success'
                      ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-50'
                      : 'border-cyan-400/40 bg-slate-950/88 text-white'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] opacity-80">
                    {notice?.title || 'Feedback en vivo'}
                  </p>
                  <div className="mt-3 flex items-start gap-3">
                    <div
                      className={`mt-1 h-3 w-3 rounded-full ${
                        notice?.tone === 'success' ? 'bg-emerald-300' : 'bg-cyan-300 animate-pulse'
                      }`}
                    />
                    <p className="text-sm leading-6 text-white">
                      {notice?.message || squatValidation?.feedback || insights.feedback || 'Esperando datos de la cámara.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}

function getStatusMessage({
  cameraError,
  poseError,
  cameraStatus,
  poseStatus,
  isSessionLive,
  hasPose,
}) {
  if (cameraError || poseError) {
    return cameraError || poseError
  }

  if (!isSessionLive) {
    return 'Pulsa "Iniciar camara" para comenzar.'
  }

  if (cameraStatus === 'requesting' || poseStatus === 'loading') {
    return 'Estamos preparando la camara.'
  }

  if (hasPose) {
    return 'Te vemos bien en pantalla.'
  }

  return 'La camara esta encendida. Ponte frente a ella para comenzar.'
}

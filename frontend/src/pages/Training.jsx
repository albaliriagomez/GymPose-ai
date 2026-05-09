import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import PoseViewport from '../components/training/PoseViewport'
import TrainingSessionHeader from '../components/training/TrainingSessionHeader'
import { useCameraStream } from '../hooks/useCameraStream'
import { useLivePose } from '../hooks/useLivePose'

const EXERCISE_OPTIONS = {
  squat: {
    label: 'Sentadilla',
    shortLabel: 'Sentadilla',
    description: 'Piernas, cadera y torso',
    repLabel: 'sentadilla',
  },
  press: {
    label: 'Press militar',
    shortLabel: 'Press',
    description: 'Hombros, codos y control del torso',
    repLabel: 'press militar',
  },
  curl: {
    label: 'Bíceps',
    shortLabel: 'Bíceps',
    description: 'Brazo izquierdo y derecho por separado',
    repLabel: 'curl de bíceps',
  },
}

const ARM_LABELS = {
  left: 'izquierdo',
  right: 'derecho',
}

export default function Training() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lastFeedbackRef = useRef('')
  const lastRepCountRef = useRef(0)
  const lastCompletionRef = useRef(false)

  const [isSessionLive, setIsSessionLive] = useState(false)
  const [notice, setNotice] = useState(null)
  const [exerciseMode, setExerciseMode] = useState('squat')
  const [curlStartArm, setCurlStartArm] = useState('left')
  const [curlRepsPerArm, setCurlRepsPerArm] = useState(10)

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
    repPlan,
    squatValidation,
  } = useLivePose({
    videoRef,
    canvasRef,
    isRunning: isSessionLive && isCameraActive,
    exerciseMode,
    curlArmSide: curlStartArm,
    curlRepsPerArm,
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
    lastFeedbackRef.current = ''
    lastRepCountRef.current = 0
    lastCompletionRef.current = false
    queueMicrotask(() => setNotice(null))
  }, [exerciseMode, curlStartArm, curlRepsPerArm])

  useEffect(() => {
    const feedback = squatValidation?.feedback || insights.feedback || ''
    if (!feedback || feedback === lastFeedbackRef.current) return

    lastFeedbackRef.current = feedback
    queueMicrotask(() => {
      setNotice({
        tone: squatValidation?.isValid ? 'success' : 'info',
          title:
            exerciseMode === 'curl'
              ? !squatValidation?.hasRequiredView
                ? 'Bíceps incompletos'
                : squatValidation?.isValid
                  ? 'Curl detectado'
                  : 'Aviso de bíceps'
              : !squatValidation?.hasRequiredView
              ? exerciseMode === 'press'
                ? 'Press incompleto'
                : 'Cuerpo incompleto'
              : squatValidation?.isValid
                ? exerciseMode === 'press'
                  ? 'Press detectado'
                  : 'Sentadilla detectada'
                : 'Aviso postural',
        message: feedback,
      })
    })
  }, [exerciseMode, insights.feedback, squatValidation?.feedback, squatValidation?.hasRequiredView, squatValidation?.isValid])

  useEffect(() => {
    if (repCount <= lastRepCountRef.current) return

    lastRepCountRef.current = repCount
    queueMicrotask(() => {
      setNotice({
        tone: 'success',
        title: 'Repeticion contabilizada',
        message: `Llevas ${repCount} repeticiones de ${EXERCISE_OPTIONS[exerciseMode].repLabel}.`,
      })
    })
  }, [exerciseMode, repCount])

  useEffect(() => {
    if (exerciseMode !== 'curl' || !repPlan?.isComplete || lastCompletionRef.current) return

    lastCompletionRef.current = true
    queueMicrotask(() => {
      setNotice({
        tone: 'success',
        title: 'Serie completada',
        message: `Terminaste ${curlRepsPerArm} con el ${ARM_LABELS[curlStartArm]} y ${curlRepsPerArm} con el otro brazo.`,
      })
    })
  }, [curlRepsPerArm, curlStartArm, exerciseMode, repPlan?.isComplete])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-gym-border bg-gym-sidebar p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gym-cyan">
                Selecciona el ejercicio
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                Modo de entrenamiento
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(EXERCISE_OPTIONS).map(([mode, config]) => {
                const active = exerciseMode === mode
                return (
                  <button
                    key={mode}
                    onClick={() => setExerciseMode(mode)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                      active
                        ? 'border-gym-cyan bg-gym-cyan/10 text-white shadow-[0_0_25px_rgba(0,229,255,0.18)]'
                        : 'border-gym-border bg-gym-accent text-gym-muted hover:border-gym-cyan/30 hover:text-white'
                    }`}
                  >
                    <div className="text-sm font-display font-bold">{config.shortLabel}</div>
                    <div className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">
                      {config.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <TrainingSessionHeader
          isLive={isSessionLive}
          onToggleSession={handleToggleSession}
          exerciseLabel={EXERCISE_OPTIONS[exerciseMode].label}
          disabled={cameraStatus === 'requesting' || isStarting}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <PoseViewport
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraError={cameraError}
            poseError={poseError}
            isLive={isSessionLive}
            statusMessage={statusMessage}
            exerciseLabel={EXERCISE_OPTIONS[exerciseMode].label}
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

                {exerciseMode === 'curl' && (
                  <div className="rounded-2xl border border-gym-border bg-gym-accent px-4 py-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Plan de bíceps
                    </p>

                    <div className="mt-3 grid gap-3">
                      <label className="space-y-1">
                        <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                          Brazo inicial
                        </span>
                        <select
                          value={curlStartArm}
                          onChange={(event) => setCurlStartArm(event.target.value)}
                          className="w-full rounded-xl border border-gym-border bg-gym-sidebar px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="left">Izquierdo</option>
                          <option value="right">Derecho</option>
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted">
                          Reps por brazo
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={curlRepsPerArm}
                          onChange={(event) => setCurlRepsPerArm(Number(event.target.value) || 1)}
                          className="w-full rounded-xl border border-gym-border bg-gym-sidebar px-3 py-2 text-sm text-white outline-none"
                        />
                      </label>

                      <p className="text-sm leading-6 text-white">
                        Haz {curlRepsPerArm} con el {ARM_LABELS[curlStartArm]} y luego {curlRepsPerArm} con el otro brazo.
                      </p>
                    </div>
                  </div>
                )}

                {exerciseMode === 'curl' && (
                  <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/88 px-4 py-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">
                      Progreso
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-white">
                      <p>
                        Brazo actual: <span className="font-semibold">{ARM_LABELS[repPlan?.currentArm || curlStartArm]}</span>
                      </p>
                      <p>
                        En este brazo: <span className="font-semibold">{repPlan?.armRepCount ?? 0}/{curlRepsPerArm}</span>
                      </p>
                      <p>
                        Estado: <span className="font-semibold">{repPlan?.isComplete ? 'Serie completa' : 'En curso'}</span>
                      </p>
                    </div>
                  </div>
                )}

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
                    {notice?.title || `Feedback ${EXERCISE_OPTIONS[exerciseMode].shortLabel.toLowerCase()}`}
                  </p>
                  <div className="mt-3 flex items-start gap-3">
                    <div
                      className={`mt-1 h-3 w-3 rounded-full ${
                        notice?.tone === 'success' ? 'bg-emerald-300' : 'bg-cyan-300 animate-pulse'
                      }`}
                    />
                        <p className="text-sm leading-6 text-white">
                      {notice?.message || squatValidation?.feedback || insights.feedback || 'Esperando datos de la camara.'}
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

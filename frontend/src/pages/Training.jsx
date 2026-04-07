import { useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import PoseViewport from '../components/training/PoseViewport'
import TrainingSessionHeader from '../components/training/TrainingSessionHeader'
import { useCameraStream } from '../hooks/useCameraStream'
import { useLivePose } from '../hooks/useLivePose'

export default function Training() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [isSessionLive, setIsSessionLive] = useState(false)

  const {
    status: cameraStatus,
    error: cameraError,
    startCamera,
    stopCamera,
    isActive: isCameraActive,
  } = useCameraStream(videoRef)

  const {
    status: poseStatus,
    error: poseError,
    insights,
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

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <TrainingSessionHeader
          isLive={isSessionLive}
          onToggleSession={handleToggleSession}
        />

        <PoseViewport
          videoRef={videoRef}
          canvasRef={canvasRef}
          cameraError={cameraError}
          poseError={poseError}
          isLive={isSessionLive}
        />

        <section className="rounded-2xl border border-gym-border bg-gym-sidebar px-5 py-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-cyan">
            Estado
          </p>
          <p className="mt-2 text-sm text-white">{statusMessage}</p>
        </section>
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

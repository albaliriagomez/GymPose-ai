import { useEffect, useRef, useState } from 'react'
import { buildPoseInsights } from '../lib/biomechanics'
import { createPoseLandmarker } from '../lib/pose'
import { drawPoseLandmarks, resizeCanvasToVideo } from '../lib/poseDrawing'

export function useLivePose({ videoRef, canvasRef, isRunning }) {
  const landmarkerRef = useRef(null)
  const frameRequestRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const lastUiUpdateRef = useRef(0)

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [insights, setInsights] = useState({
    hasPose: false,
    kneeAngle: null,
    torsoAngle: null,
    repCount: 0,
    feedback: 'Inicializando detector de pose',
  })

  useEffect(() => {
    let cancelled = false

    async function loadLandmarker() {
      try {
        setStatus('loading')
        setError('')

        const poseLandmarker = await createPoseLandmarker()

        if (cancelled) {
          poseLandmarker?.close?.()
          return
        }

        landmarkerRef.current = poseLandmarker
        setStatus('ready')
      } catch (err) {
        setStatus('error')
        setError(err.message || 'No se pudo cargar MediaPipe Pose.')
      }
    }

    loadLandmarker()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameRequestRef.current)
      landmarkerRef.current?.close?.()
      landmarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isRunning || !landmarkerRef.current) {
      window.cancelAnimationFrame(frameRequestRef.current)
      lastVideoTimeRef.current = -1
      const canvas = canvasRef.current
      const ctx = canvas?.getContext?.('2d')
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
      setInsights((current) => ({
        ...current,
        hasPose: false,
      }))
      return undefined
    }

    const renderFrame = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const poseLandmarker = landmarkerRef.current

      if (!video || !canvas || !poseLandmarker) {
        frameRequestRef.current = window.requestAnimationFrame(renderFrame)
        return
      }

      if (video.readyState < 2) {
        frameRequestRef.current = window.requestAnimationFrame(renderFrame)
        return
      }

      resizeCanvasToVideo(canvas, video)

      if (video.currentTime !== lastVideoTimeRef.current) {
        const result = poseLandmarker.detectForVideo(video, performance.now())
        const ctx = canvas.getContext('2d')

        if (ctx) {
          drawPoseLandmarks(ctx, result, canvas.width, canvas.height)
        }

        const now = performance.now()
        if (now - lastUiUpdateRef.current > 120) {
          setInsights(buildPoseInsights(result))
          lastUiUpdateRef.current = now
        }

        lastVideoTimeRef.current = video.currentTime
      }

      frameRequestRef.current = window.requestAnimationFrame(renderFrame)
    }

    setStatus((current) => (current === 'ready' ? 'tracking' : current))
    frameRequestRef.current = window.requestAnimationFrame(renderFrame)

    return () => {
      window.cancelAnimationFrame(frameRequestRef.current)
    }
  }, [canvasRef, isRunning, status, videoRef])

  return {
    status,
    error,
    insights,
    isReady: status === 'ready' || status === 'tracking',
  }
}

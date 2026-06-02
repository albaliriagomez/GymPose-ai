import { useEffect, useRef, useState } from 'react'
import { createHandLandmarker, detectOkGesture } from '../lib/hand'

export function useHandGesture({ videoRef, isRunning }) {
  const landmarkerRef = useRef(null)
  const frameRequestRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const stableOkFramesRef = useRef(0)

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [isOkGesture, setIsOkGesture] = useState(false)
  const [gestureConfidence, setGestureConfidence] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadLandmarker() {
      try {
        setStatus('loading')
        setError('')

        const handLandmarker = await createHandLandmarker()

        if (cancelled) {
          handLandmarker?.close?.()
          return
        }

        landmarkerRef.current = handLandmarker
        setStatus('ready')
      } catch (err) {
        setStatus('error')
        setError(err.message || 'No se pudo cargar MediaPipe Hands.')
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
      stableOkFramesRef.current = 0
      queueMicrotask(() => {
        setIsOkGesture(false)
        setGestureConfidence(0)
      })
      window.cancelAnimationFrame(frameRequestRef.current)
      return undefined
    }

    const renderFrame = () => {
      const video = videoRef.current
      const handLandmarker = landmarkerRef.current

      if (!video || !handLandmarker) {
        frameRequestRef.current = window.requestAnimationFrame(renderFrame)
        return
      }

      if (video.readyState < 2) {
        frameRequestRef.current = window.requestAnimationFrame(renderFrame)
        return
      }

      if (video.currentTime !== lastVideoTimeRef.current) {
        const result = handLandmarker.detectForVideo(video, performance.now())
        const okGesture = detectOkGesture(result)

        setGestureConfidence(okGesture.confidence)

        if (okGesture.detected) {
          stableOkFramesRef.current += 1
        } else {
          stableOkFramesRef.current = 0
        }

        setIsOkGesture(stableOkFramesRef.current >= 2)
        lastVideoTimeRef.current = video.currentTime
      }

      frameRequestRef.current = window.requestAnimationFrame(renderFrame)
    }

    frameRequestRef.current = window.requestAnimationFrame(renderFrame)

    return () => {
      window.cancelAnimationFrame(frameRequestRef.current)
    }
  }, [isRunning, videoRef])

  return {
    status,
    error,
    isOkGesture,
    gestureConfidence,
  }
}

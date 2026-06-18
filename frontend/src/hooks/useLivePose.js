import { useEffect, useRef, useState } from 'react'
import { buildPoseInsights } from '../lib/biomechanics'
import { createPoseLandmarker } from '../lib/pose'
import { drawPoseLandmarks, resizeCanvasToVideo } from '../lib/poseDrawing'
import { useRepCounter } from './useRepCounter'
import { useSquatValidator } from './useSquatValidator'

export function useLivePose({
  videoRef,
  canvasRef,
  isRunning,
  exerciseMode = 'squat',
  exerciseLabel = '',
  enablePose = true,
  curlArmSide = 'left',
  curlRepsPerArm = 10,
}) {
  const landmarkerRef = useRef(null)
  const frameRequestRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const lastUiUpdateRef = useRef(0)
  const lastInferenceTimeRef = useRef(0)

  const isArmMode = exerciseMode === 'press' || exerciseMode === 'curl' || exerciseMode === 'russian' || exerciseMode === 'row'

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [insights, setInsights] = useState({
    exerciseMode,
    hasPose: false,
    hasRequiredView: false,
    requiredView: isArmMode ? 'arm' : 'full',
    bodyCoverage: 0,
    kneeAngle: null,
    torsoAngle: null,
    elbowAngle: null,
    leftElbowAngle: null,
    rightElbowAngle: null,
    dominantArmSide: 'left',
    dominantElbowAngle: null,
    wristSpread: null,
    ankleSpread: null,
    handsAboveShoulders: false,
    feetApart: false,
    repCount: 0,
    currentArm: curlArmSide,
    armRepCount: 0,
    targetPerArm: curlRepsPerArm,
    isComplete: false,
    feedback: exerciseMode === 'curl'
      ? 'Inicializando detector bilateral de biceps'
      : exerciseMode === 'press'
        ? 'Inicializando detector de press militar'
        : exerciseMode === 'russian'
          ? 'Inicializando detector de flexiones rusas'
        : exerciseMode === 'core'
          ? 'Inicializando detector de plank'
          : exerciseMode === 'manual'
            ? 'Inicializando modo guia'
          : 'Inicializando detector de pose',
  })

  const squatValidation = useSquatValidator({
    exerciseMode,
    exerciseLabel,
    kneeAngle: insights.kneeAngle,
    torsoAngle: insights.torsoAngle,
    elbowAngle: insights.elbowAngle,
    leftElbowAngle: insights.leftElbowAngle,
    rightElbowAngle: insights.rightElbowAngle,
    dominantArmSide: insights.dominantArmSide,
    wristSpread: insights.wristSpread,
    ankleSpread: insights.ankleSpread,
    handsAboveShoulders: insights.handsAboveShoulders,
    feetApart: insights.feetApart,
    curlArmSide,
    hasPose: insights.hasPose,
    hasRequiredView: insights.hasRequiredView,
    bodyCoverage: insights.bodyCoverage,
    enabled: isRunning,
  })

  const repCounter = useRepCounter({
    exerciseMode,
    exerciseLabel,
    kneeAngle: insights.kneeAngle,
    torsoAngle: insights.torsoAngle,
    elbowAngle: insights.elbowAngle,
    leftElbowAngle: insights.leftElbowAngle,
    rightElbowAngle: insights.rightElbowAngle,
    dominantArmSide: insights.dominantArmSide,
    wristSpread: insights.wristSpread,
    ankleSpread: insights.ankleSpread,
    handsAboveShoulders: insights.handsAboveShoulders,
    feetApart: insights.feetApart,
    curlArmSide,
    curlRepsPerArm,
    hasPose: insights.hasPose,
    isValid: squatValidation.isValid,
    enabled: isRunning,
  })

  useEffect(() => {
    if (!enablePose) {
      landmarkerRef.current?.close?.()
      landmarkerRef.current = null
      return undefined
    }

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
  }, [enablePose, isRunning])

  useEffect(() => {
    if (!enablePose) {
      window.cancelAnimationFrame(frameRequestRef.current)
      lastVideoTimeRef.current = -1
      const canvas = canvasRef.current
      const ctx = canvas?.getContext?.('2d')
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
      return undefined
    }

    if (!isRunning || !landmarkerRef.current) {
      window.cancelAnimationFrame(frameRequestRef.current)
      lastVideoTimeRef.current = -1
      const canvas = canvasRef.current
      const ctx = canvas?.getContext?.('2d')
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
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

      const now = performance.now()
      const shouldRunInference =
        video.currentTime !== lastVideoTimeRef.current ||
        now - lastInferenceTimeRef.current >= 33

      if (shouldRunInference) {
        const result = poseLandmarker.detectForVideo(video, now)
        const ctx = canvas.getContext('2d')

        if (ctx) {
          drawPoseLandmarks(ctx, result, canvas.width, canvas.height, exerciseMode)
        }

        if (now - lastUiUpdateRef.current > 120) {
          setInsights(buildPoseInsights(result, exerciseMode))
          lastUiUpdateRef.current = now
        }

        lastVideoTimeRef.current = video.currentTime
        lastInferenceTimeRef.current = now
      }

      frameRequestRef.current = window.requestAnimationFrame(renderFrame)
    }

    frameRequestRef.current = window.requestAnimationFrame(renderFrame)

    return () => {
      window.cancelAnimationFrame(frameRequestRef.current)
    }
  }, [canvasRef, enablePose, exerciseMode, isRunning, status, videoRef])

  const effectiveStatus = !enablePose
    ? (isRunning ? 'tracking' : 'ready')
    : status === 'ready' && isRunning
      ? 'tracking'
      : status

  return {
    status: effectiveStatus,
    error: enablePose ? error : '',
    insights: {
      ...insights,
      exerciseMode,
      exerciseLabel,
      hasPose: isRunning ? insights.hasPose : false,
      requiredView: isArmMode ? 'arm' : 'full',
      repCount: repCounter.repCount,
      currentArm: repCounter.currentArm,
      armRepCount: repCounter.armRepCount,
      targetPerArm: repCounter.targetPerArm,
      isComplete: repCounter.isComplete,
      wristSpread: insights.wristSpread,
      ankleSpread: insights.ankleSpread,
      handsAboveShoulders: insights.handsAboveShoulders,
      feetApart: insights.feetApart,
      validation: squatValidation,
      feedback: squatValidation.feedback || insights.feedback,
    },
    repCount: repCounter.repCount,
    repPlan: {
      currentArm: repCounter.currentArm,
      armRepCount: repCounter.armRepCount,
      targetPerArm: repCounter.targetPerArm,
      isComplete: repCounter.isComplete,
    },
    squatValidation,
    resetRepCounter: repCounter.reset,
    isReady: effectiveStatus === 'ready' || effectiveStatus === 'tracking',
  }
}

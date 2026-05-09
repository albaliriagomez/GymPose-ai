import { useCallback, useEffect, useRef, useState } from 'react'

const DOWN_THRESHOLD = 150
const UP_THRESHOLD = 165
const CURL_FLEX_THRESHOLD = 70
const CURL_EXTENDED_THRESHOLD = 150
const STABLE_FRAMES = 1

function getOppositeArm(arm) {
  return arm === 'left' ? 'right' : 'left'
}

export function useRepCounter({
  exerciseMode = 'squat',
  kneeAngle,
  torsoAngle,
  elbowAngle,
  leftElbowAngle,
  rightElbowAngle,
  curlArmSide = 'left',
  curlRepsPerArm = 10,
  hasPose,
  isValid,
  enabled = false,
}) {
  const [repCount, setRepCount] = useState(0)
  const [currentArm, setCurrentArm] = useState(curlArmSide)
  const [armRepCount, setArmRepCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const phaseRef = useRef('up')
  const downFramesRef = useRef(0)
  const upFramesRef = useRef(0)
  const currentArmRef = useRef(curlArmSide)
  const armRepCountRef = useRef(0)
  const isCompleteRef = useRef(false)
  const lastModeRef = useRef(exerciseMode)
  const lastPlanRef = useRef(`${curlArmSide}:${curlRepsPerArm}`)

  const resetAll = useCallback(() => {
    phaseRef.current = exerciseMode === 'curl' || exerciseMode === 'bicep' ? 'extended' : 'up'
    downFramesRef.current = 0
    upFramesRef.current = 0
    currentArmRef.current = curlArmSide
    armRepCountRef.current = 0
    isCompleteRef.current = false
    setCurrentArm(curlArmSide)
    setArmRepCount(0)
    setIsComplete(false)
    setRepCount(0)
  }, [curlArmSide, exerciseMode])

  useEffect(() => {
    const planKey = `${curlArmSide}:${curlRepsPerArm}`
    if (lastModeRef.current !== exerciseMode || lastPlanRef.current !== planKey) {
      lastModeRef.current = exerciseMode
      lastPlanRef.current = planKey
      queueMicrotask(resetAll)
    }

    if (!enabled) {
      queueMicrotask(resetAll)
      return
    }

    if (!hasPose) {
      downFramesRef.current = 0
      upFramesRef.current = 0
      return
    }

    if (exerciseMode === 'curl') {
      if (isCompleteRef.current) return

      const selectedElbowAngle = currentArmRef.current === 'left' ? leftElbowAngle : rightElbowAngle

      if (selectedElbowAngle == null) {
        downFramesRef.current = 0
        upFramesRef.current = 0
        return
      }

      if (selectedElbowAngle <= CURL_FLEX_THRESHOLD) {
        upFramesRef.current += 1
        downFramesRef.current = 0

        if (upFramesRef.current >= STABLE_FRAMES) {
          let switchedArm = false

          if (phaseRef.current === 'extended') {
            const nextArmRepCount = armRepCountRef.current + 1
            armRepCountRef.current = nextArmRepCount
            setArmRepCount(nextArmRepCount)
            setRepCount((count) => count + 1)

            if (nextArmRepCount >= curlRepsPerArm) {
              const nextArm = getOppositeArm(currentArmRef.current)
              if (currentArmRef.current === curlArmSide) {
                currentArmRef.current = nextArm
                armRepCountRef.current = 0
                phaseRef.current = 'extended'
                setCurrentArm(nextArm)
                setArmRepCount(0)
                switchedArm = true
              } else {
                isCompleteRef.current = true
                setIsComplete(true)
              }
            }
          }

          if (!switchedArm && !isCompleteRef.current) {
            phaseRef.current = 'flexed'
          }
        }

        return
      }

      if (selectedElbowAngle >= CURL_EXTENDED_THRESHOLD) {
        downFramesRef.current += 1
        upFramesRef.current = 0

        if (downFramesRef.current >= STABLE_FRAMES) {
          phaseRef.current = 'extended'
        }

        return
      }

      downFramesRef.current = 0
      upFramesRef.current = 0
      return
    }

    if (exerciseMode === 'bicep') {
      if (elbowAngle == null) {
        downFramesRef.current = 0
        upFramesRef.current = 0
        return
      }

      if (elbowAngle <= 70) {
        upFramesRef.current += 1
        downFramesRef.current = 0

        if (upFramesRef.current >= STABLE_FRAMES) {
          if (phaseRef.current === 'extended') {
            queueMicrotask(() => setRepCount((count) => count + 1))
          }

          phaseRef.current = 'flexed'
        }

        return
      }

      if (elbowAngle >= 150) {
        downFramesRef.current += 1
        upFramesRef.current = 0

        if (downFramesRef.current >= STABLE_FRAMES) {
          phaseRef.current = 'extended'
        }

        return
      }

      downFramesRef.current = 0
      upFramesRef.current = 0
      return
    }

    if (kneeAngle == null) {
      downFramesRef.current = 0
      upFramesRef.current = 0
      return
    }

    if (kneeAngle <= DOWN_THRESHOLD) {
      downFramesRef.current += 1
      upFramesRef.current = 0

      if (downFramesRef.current >= STABLE_FRAMES) {
        if (phaseRef.current === 'up') {
          queueMicrotask(() => setRepCount((count) => count + 1))
        }

        phaseRef.current = 'down'
      }

      return
    }

    if (kneeAngle >= UP_THRESHOLD) {
      upFramesRef.current += 1
      downFramesRef.current = 0

      if (upFramesRef.current >= STABLE_FRAMES) {
        phaseRef.current = 'up'
      }

      return
    }

    downFramesRef.current = 0
    upFramesRef.current = 0
  }, [enabled, exerciseMode, hasPose, isValid, kneeAngle, torsoAngle, elbowAngle, leftElbowAngle, rightElbowAngle, curlArmSide, curlRepsPerArm, resetAll])

  return {
    repCount,
    currentArm,
    armRepCount,
    targetPerArm: curlRepsPerArm,
    isComplete,
    reset: resetAll,
  }
}

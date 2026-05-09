import { useCallback, useEffect, useRef, useState } from 'react'

const SQUAT_DOWN_THRESHOLD = 150
const SQUAT_UP_THRESHOLD = 165
const PRESS_EXTENSION_THRESHOLD = 160
const PRESS_RESET_THRESHOLD = 120
const CURL_FLEX_THRESHOLD = 70
const CURL_RESET_THRESHOLD = 150
const STABLE_FRAMES = 1

function getOppositeArm(arm) {
  return arm === 'left' ? 'right' : 'left'
}

export function useRepCounter({
  exerciseMode = 'squat',
  kneeAngle,
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
    phaseRef.current =
      exerciseMode === 'press'
        ? 'down'
        : exerciseMode === 'curl'
          ? 'extended'
          : 'up'
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
          if (phaseRef.current === 'extended') {
            const nextArmRepCount = armRepCountRef.current + 1
            armRepCountRef.current = nextArmRepCount
            setArmRepCount(nextArmRepCount)
            setRepCount((count) => count + 1)

            if (nextArmRepCount >= curlRepsPerArm) {
              if (currentArmRef.current === curlArmSide) {
                const nextArm = getOppositeArm(currentArmRef.current)
                currentArmRef.current = nextArm
                armRepCountRef.current = 0
                phaseRef.current = 'extended'
                setCurrentArm(nextArm)
                setArmRepCount(0)
              } else {
                isCompleteRef.current = true
                setIsComplete(true)
              }
            }
          }

          if (!isCompleteRef.current) {
            phaseRef.current = 'flexed'
          }
        }

        return
      }

      if (selectedElbowAngle >= CURL_RESET_THRESHOLD) {
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

    if (exerciseMode === 'press') {
      if (elbowAngle == null) {
        downFramesRef.current = 0
        upFramesRef.current = 0
        return
      }

      if (elbowAngle >= PRESS_EXTENSION_THRESHOLD) {
        upFramesRef.current += 1
        downFramesRef.current = 0

        if (upFramesRef.current >= STABLE_FRAMES) {
          if (phaseRef.current === 'down' && isValid) {
            setRepCount((count) => count + 1)
          }

          phaseRef.current = 'up'
        }

        return
      }

      if (elbowAngle <= PRESS_RESET_THRESHOLD) {
        downFramesRef.current += 1
        upFramesRef.current = 0

        if (downFramesRef.current >= STABLE_FRAMES) {
          phaseRef.current = 'down'
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

    if (kneeAngle <= SQUAT_DOWN_THRESHOLD) {
      downFramesRef.current += 1
      upFramesRef.current = 0

      if (downFramesRef.current >= STABLE_FRAMES) {
        if (phaseRef.current === 'up' && isValid) {
          setRepCount((count) => count + 1)
        }

        phaseRef.current = 'down'
      }

      return
    }

    if (kneeAngle >= SQUAT_UP_THRESHOLD) {
      upFramesRef.current += 1
      downFramesRef.current = 0

      if (upFramesRef.current >= STABLE_FRAMES) {
        phaseRef.current = 'up'
      }

      return
    }

    downFramesRef.current = 0
    upFramesRef.current = 0
  }, [enabled, exerciseMode, hasPose, isValid, kneeAngle, elbowAngle, leftElbowAngle, rightElbowAngle, curlArmSide, curlRepsPerArm, resetAll])

  return {
    repCount,
    currentArm,
    armRepCount,
    targetPerArm: curlRepsPerArm,
    isComplete,
    reset: resetAll,
  }
}

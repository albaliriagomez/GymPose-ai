import { useCallback, useEffect, useRef, useState } from 'react'

const SQUAT_DOWN_THRESHOLD = 165
const SQUAT_UP_THRESHOLD = 175
const PRESS_EXTENSION_THRESHOLD = 160
const PRESS_RESET_THRESHOLD = 120
const CURL_FLEX_THRESHOLD = 55
const CURL_RESET_THRESHOLD = 165
const STABLE_FRAMES = 1

function getOppositeArm(arm) {
  return arm === 'left' ? 'right' : 'left'
}

export function useRepCounter({
  exerciseMode = 'squat',
  exerciseLabel = '',
  kneeAngle,
  elbowAngle,
  leftElbowAngle,
  rightElbowAngle,
  wristSpread,
  ankleSpread,
  handsAboveShoulders,
  feetApart,
  dominantArmSide = 'left',
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
  const lastPlanRef = useRef(`${exerciseMode}:${exerciseLabel}:${curlArmSide}:${curlRepsPerArm}`)
  const normalizedExerciseLabel = String(exerciseLabel || '').toLowerCase()
  const isDiamondPattern = /diamante/.test(normalizedExerciseLabel)
  const isRowPattern = /remo|row/.test(normalizedExerciseLabel)
  const isRussianPattern = /rusa|antebrazo/.test(normalizedExerciseLabel)
  const isJumpingJackPattern = /polichinela|jumping jack|jumpingjack/.test(normalizedExerciseLabel)
  const isBurpeePattern = /burpee/.test(normalizedExerciseLabel)
  const isHighKneesPattern = /rodillas altas|high knees|marcha en sitio/.test(normalizedExerciseLabel)
  const isMountainClimberPattern = /mountain climber|mountain climbers|escalador/.test(normalizedExerciseLabel)
  const isDynamicLegPattern = isBurpeePattern || isHighKneesPattern || isMountainClimberPattern
  const pressExtensionThreshold = isDiamondPattern ? 145 : PRESS_EXTENSION_THRESHOLD
  const pressResetThreshold = isDiamondPattern ? 105 : PRESS_RESET_THRESHOLD
  const rowFlexThreshold = 100
  const rowResetThreshold = 145
  const russianDownThreshold = 110
  const russianUpThreshold = 150

  const resetAll = useCallback(() => {
    phaseRef.current =
      exerciseMode === 'press' || exerciseMode === 'russian' || exerciseMode === 'row'
        ? isRussianPattern
          ? 'up'
          : 'down'
        : exerciseMode === 'curl'
          ? 'extended'
          : isJumpingJackPattern
            ? 'closed'
            : isDynamicLegPattern
              ? 'up'
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
  }, [curlArmSide, exerciseLabel, exerciseMode, isRussianPattern])

  useEffect(() => {
    const planKey = `${exerciseMode}:${exerciseLabel}:${curlArmSide}:${curlRepsPerArm}`
    if (lastModeRef.current !== exerciseMode || lastPlanRef.current !== planKey) {
      lastModeRef.current = exerciseMode
      lastPlanRef.current = planKey
      queueMicrotask(resetAll)
    }

    if (!enabled) {
      queueMicrotask(resetAll)
      return
    }

    if (exerciseMode === 'manual') {
      downFramesRef.current = 0
      upFramesRef.current = 0
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

    if (exerciseMode === 'squat' && isJumpingJackPattern) {
      if (wristSpread == null || ankleSpread == null) {
        downFramesRef.current = 0
        upFramesRef.current = 0
        return
      }

      const isOpen = (handsAboveShoulders && feetApart) || (wristSpread >= 0.28 && ankleSpread >= 0.18)
      const isClosed = (!handsAboveShoulders && !feetApart) || (wristSpread <= 0.18 && ankleSpread <= 0.12)

      if (isOpen) {
        upFramesRef.current += 1
        downFramesRef.current = 0

        if (upFramesRef.current >= STABLE_FRAMES && phaseRef.current === 'closed') {
          phaseRef.current = 'open'
        }

        return
      }

      if (isClosed) {
        downFramesRef.current += 1
        upFramesRef.current = 0

        if (downFramesRef.current >= STABLE_FRAMES) {
          if (phaseRef.current === 'open' && isValid) {
            setRepCount((count) => count + 1)
          }

          phaseRef.current = 'closed'
        }

        return
      }

      downFramesRef.current = 0
      upFramesRef.current = 0
      return
    }

    if (exerciseMode === 'squat' && isDynamicLegPattern) {
      if (kneeAngle == null) {
        downFramesRef.current = 0
        upFramesRef.current = 0
        return
      }

      const downThreshold = isBurpeePattern ? 138 : 128
      const upThreshold = isBurpeePattern ? 155 : 148

      if (kneeAngle <= downThreshold) {
        downFramesRef.current += 1
        upFramesRef.current = 0

        if (downFramesRef.current >= STABLE_FRAMES) {
          phaseRef.current = 'down'
        }

        return
      }

      if (kneeAngle >= upThreshold) {
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

      downFramesRef.current = 0
      upFramesRef.current = 0
      return
    }

    if (exerciseMode === 'core') {
      return
    }

    if (exerciseMode === 'row') {
      const selectedElbowAngle = dominantArmSide === 'right' ? rightElbowAngle ?? leftElbowAngle : leftElbowAngle ?? rightElbowAngle

      if (selectedElbowAngle == null) {
        downFramesRef.current = 0
        upFramesRef.current = 0
        return
      }

      if (selectedElbowAngle <= rowFlexThreshold) {
        upFramesRef.current += 1
        downFramesRef.current = 0

        if (upFramesRef.current >= STABLE_FRAMES) {
          if (phaseRef.current === 'extended' && isValid) {
            setRepCount((count) => count + 1)
          }

          phaseRef.current = 'flexed'
        }

        return
      }

      if (selectedElbowAngle >= rowResetThreshold) {
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

    if (exerciseMode === 'press' || exerciseMode === 'russian') {
      const selectedElbowAngle =
        (isRowPattern || isRussianPattern)
          ? dominantArmSide === 'right'
            ? rightElbowAngle ?? leftElbowAngle
            : leftElbowAngle ?? rightElbowAngle
          : elbowAngle

      if (selectedElbowAngle == null) {
        downFramesRef.current = 0
        upFramesRef.current = 0
        return
      }

      if (isRussianPattern ? selectedElbowAngle >= russianUpThreshold : selectedElbowAngle >= pressExtensionThreshold) {
        upFramesRef.current += 1
        downFramesRef.current = 0

        if (upFramesRef.current >= STABLE_FRAMES) {
          if (!isRussianPattern && phaseRef.current === 'down' && isValid) {
            setRepCount((count) => count + 1)
          }

          phaseRef.current = 'up'
        }

        return
      }

      if (isRussianPattern ? selectedElbowAngle <= russianDownThreshold : selectedElbowAngle <= pressResetThreshold) {
        downFramesRef.current += 1
        upFramesRef.current = 0

        if (downFramesRef.current >= STABLE_FRAMES) {
          if (isRussianPattern && phaseRef.current === 'up' && isValid) {
            setRepCount((count) => count + 1)
          }

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
  }, [enabled, exerciseMode, exerciseLabel, hasPose, isValid, kneeAngle, elbowAngle, leftElbowAngle, rightElbowAngle, dominantArmSide, curlArmSide, curlRepsPerArm, resetAll, pressExtensionThreshold, pressResetThreshold, russianDownThreshold, russianUpThreshold, isRussianPattern, isJumpingJackPattern, isDynamicLegPattern, wristSpread, ankleSpread])

  return {
    repCount,
    currentArm,
    armRepCount,
    targetPerArm: curlRepsPerArm,
    isComplete,
    reset: resetAll,
  }
}

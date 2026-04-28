import { useEffect, useRef, useState } from 'react'

const DOWN_THRESHOLD = 95
const UP_THRESHOLD = 160
const STABLE_FRAMES = 2

export function useRepCounter({
  kneeAngle,
  torsoAngle,
  hasPose,
  isValid,
  enabled = false,
}) {
  const [repCount, setRepCount] = useState(0)
  const phaseRef = useRef('up')
  const downFramesRef = useRef(0)
  const upFramesRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      phaseRef.current = 'up'
      downFramesRef.current = 0
      upFramesRef.current = 0
      setRepCount(0)
      return
    }

    if (!hasPose || kneeAngle == null) {
      downFramesRef.current = 0
      upFramesRef.current = 0
      return
    }

    const torsoStable = torsoAngle == null ? true : torsoAngle <= 20
    const squatIsValid = isValid ?? (kneeAngle <= 100 && torsoStable)

    if (kneeAngle <= DOWN_THRESHOLD) {
      downFramesRef.current += 1
      upFramesRef.current = 0

      if (downFramesRef.current >= STABLE_FRAMES) {
        if (phaseRef.current === 'up' && squatIsValid) {
          setRepCount((count) => count + 1)
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
  }, [enabled, hasPose, isValid, kneeAngle, torsoAngle])

  return {
    repCount,
    phase: phaseRef.current,
    reset: () => {
      phaseRef.current = 'up'
      downFramesRef.current = 0
      upFramesRef.current = 0
      setRepCount(0)
    },
  }
}

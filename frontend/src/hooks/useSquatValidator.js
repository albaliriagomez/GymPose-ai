import { useEffect, useState } from 'react'

const DEPTH_THRESHOLD = 160
const TORSO_THRESHOLD = 40

export function useSquatValidator({
  kneeAngle,
  torsoAngle,
  hasPose,
  hasFullBody,
  bodyCoverage = 0,
  enabled = false,
}) {
  const [validation, setValidation] = useState({
    isReady: false,
    isValid: false,
    deepEnough: false,
    torsoStable: false,
    hasFullBody: false,
    bodyCoverage: 0,
    feedback: 'Activa la camara para validar la sentadilla.',
  })

  useEffect(() => {
    if (!enabled) {
      setValidation({
        isReady: false,
        isValid: false,
        deepEnough: false,
        torsoStable: false,
        hasFullBody: false,
        bodyCoverage: 0,
        feedback: 'Activa la camara para validar la sentadilla.',
      })
      return
    }

    if (!hasPose || kneeAngle == null || torsoAngle == null) {
      setValidation({
        isReady: false,
        isValid: false,
        deepEnough: false,
        torsoStable: false,
        hasFullBody: false,
        bodyCoverage,
        feedback: 'Ponte frente a la camara para empezar a contar sentadillas.',
      })
      return
    }

    if (!hasFullBody) {
      setValidation({
        isReady: false,
        isValid: false,
        deepEnough: false,
        torsoStable: false,
        hasFullBody: false,
        bodyCoverage,
        feedback: `No veo tu cuerpo completo. Ajusta la camara para mostrar hombros, cadera, rodillas y tobillos (${bodyCoverage}%).`,
      })
      return
    }

    const deepEnough = kneeAngle <= DEPTH_THRESHOLD
    const torsoStable = torsoAngle <= TORSO_THRESHOLD
    const isValid = deepEnough && torsoStable

    let feedback = 'Sentadilla detectada.'

    if (!deepEnough) {
      feedback = 'Baja un poco mas para llegar a profundidad.'
    } else if (!torsoStable) {
      feedback = 'Mantén el torso mas vertical para una mejor repeticion.'
    } else {
      feedback = 'Buena repeticion. Mantén el control en la subida.'
    }

    setValidation({
      isReady: true,
      isValid,
      deepEnough,
      torsoStable,
      hasFullBody: true,
      bodyCoverage,
      feedback,
    })
  }, [bodyCoverage, enabled, hasFullBody, hasPose, kneeAngle, torsoAngle])

  return validation
}

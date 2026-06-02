import { useMemo } from 'react'

const SQUAT_DEPTH_THRESHOLD = 165
const SQUAT_TORSO_THRESHOLD = 60
const CURL_FLEX_THRESHOLD = 70
const PRESS_EXTENSION_THRESHOLD = 160

export function useSquatValidator({
  exerciseMode = 'squat',
  kneeAngle,
  torsoAngle,
  elbowAngle,
  leftElbowAngle,
  rightElbowAngle,
  curlArmSide = 'left',
  hasPose,
  hasRequiredView,
  bodyCoverage = 0,
  enabled = false,
}) {
  return useMemo(() => {
    const isArmMode = exerciseMode === 'press' || exerciseMode === 'curl'
    const isCoreMode = exerciseMode === 'core'
    const isManualMode = exerciseMode === 'manual'
    const activeElbowAngle =
      exerciseMode === 'curl'
        ? curlArmSide === 'left'
          ? leftElbowAngle
          : rightElbowAngle
        : elbowAngle

    const armLabel = curlArmSide === 'left' ? 'izquierdo' : 'derecho'

    const baseValidation = {
      isReady: false,
      isValid: false,
      deepEnough: false,
      torsoStable: false,
      hasRequiredView: false,
      requiredView: isArmMode ? 'arm' : 'full',
      bodyCoverage: 0,
      feedback: isArmMode
        ? exerciseMode === 'curl'
          ? 'Activa la camara para validar el curl de biceps.'
          : 'Activa la camara para validar el press militar.'
        : isCoreMode
          ? 'Activa la camara para validar el plank.'
        : isManualMode
          ? 'Este ejercicio sigue el contador del plan sin validacion por puntos.'
        : 'Activa la camara para validar la sentadilla.',
    }

    if (!enabled) {
      return baseValidation
    }

    if (!hasPose) {
      return {
        ...baseValidation,
        bodyCoverage,
        feedback: isArmMode
          ? exerciseMode === 'curl'
            ? 'Ponte frente a la camara para empezar a contar curls.'
            : 'Ponte frente a la camara para empezar a contar presses.'
          : isCoreMode
            ? 'Ponte frente a la camara para empezar a validar el plank.'
            : isManualMode
              ? 'Ponte frente a la camara si quieres ver la postura, pero este ejercicio es manual.'
            : 'Ponte frente a la camara para empezar a contar sentadillas.',
      }
    }

    if (isManualMode) {
      return {
        ...baseValidation,
        bodyCoverage,
        hasRequiredView: true,
        feedback: 'Contador del plan activo. Sigue la serie o el tiempo definido.',
      }
    }

    if (exerciseMode === 'curl') {
      if (activeElbowAngle == null) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: `Necesito ver el brazo ${armLabel} para medir el curl.`,
        }
      }

      if (!hasRequiredView) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: `No veo tu parte superior del cuerpo completa. Ajusta la camara para mostrar hombros, codos y munecas (${bodyCoverage}%).`,
        }
      }

      const deepEnough = activeElbowAngle <= CURL_FLEX_THRESHOLD
      const torsoStable = torsoAngle == null ? true : torsoAngle <= SQUAT_TORSO_THRESHOLD

      let feedback = `Curl detectado con el brazo ${armLabel}.`

      if (!deepEnough) {
        feedback = `Flexiona un poco mas el codo ${armLabel} para completar el curl.`
      } else if (!torsoStable) {
        feedback = 'Mantén el torso mas estable y evita balancearte.'
      }

      return {
        ...baseValidation,
        isReady: true,
        isValid: deepEnough,
        deepEnough,
        torsoStable,
        hasRequiredView: true,
        bodyCoverage,
        feedback,
      }
    }

    if (exerciseMode === 'press') {
      if (elbowAngle == null) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: 'Necesito ver hombros, codos y munecas para medir el press militar.',
        }
      }

      if (!hasRequiredView) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: `No veo tu tren superior completo. Ajusta la camara para mostrar hombros, codos y munecas (${bodyCoverage}%).`,
        }
      }

      const deepEnough = elbowAngle >= PRESS_EXTENSION_THRESHOLD
      const torsoStable = torsoAngle == null ? true : torsoAngle <= SQUAT_TORSO_THRESHOLD

      let feedback = 'Press militar detectado.'

      if (!deepEnough) {
        feedback = 'Extiende un poco mas los brazos para completar el press militar.'
      } else if (!torsoStable) {
        feedback = 'Mantén el torso mas estable y evita balancearte.'
      }

      return {
        ...baseValidation,
        isReady: true,
        isValid: deepEnough,
        deepEnough,
        torsoStable,
        hasRequiredView: true,
        bodyCoverage,
        feedback,
      }
    }

    if (exerciseMode === 'core') {
      if (torsoAngle == null) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: 'Necesito ver hombros, caderas y piernas para validar el plank.',
        }
      }

      if (!hasRequiredView) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: `No veo tu cuerpo completo. Ajusta la camara para mostrar hombros, caderas y piernas (${bodyCoverage}%).`,
        }
      }

      const torsoStable = torsoAngle <= 20
      const deepEnough = bodyCoverage >= 75

      return {
        ...baseValidation,
        isReady: true,
        isValid: torsoStable && deepEnough,
        deepEnough,
        torsoStable,
        hasRequiredView: true,
        bodyCoverage,
        feedback: torsoStable
          ? 'Plank detectado. Mantén el core firme y la cadera estable.'
          : 'Alinea mejor el torso para sostener el plank.',
      }
    }

    if (kneeAngle == null || torsoAngle == null) {
      return {
        ...baseValidation,
        bodyCoverage,
        feedback: 'Ponte frente a la camara para empezar a contar sentadillas.',
      }
    }

    if (!hasRequiredView && bodyCoverage < 65) {
      return {
        ...baseValidation,
        bodyCoverage,
        feedback: `Aun falta un poco de cuerpo visible para validar bien la sentadilla (${bodyCoverage}%).`,
      }
    }

    const deepEnough = kneeAngle <= SQUAT_DEPTH_THRESHOLD
    const torsoStable = torsoAngle <= SQUAT_TORSO_THRESHOLD
    const isValid = deepEnough && torsoStable

    let feedback = 'Sentadilla detectada.'

    if (!deepEnough) {
      feedback = 'Baja un poco mas para llegar a profundidad.'
    } else if (!torsoStable) {
      feedback = 'Mantén el torso mas vertical para una mejor repeticion.'
    } else {
      feedback = 'Buena repeticion. Mantén el control en la subida.'
    }

    return {
      ...baseValidation,
      isReady: true,
      isValid,
      deepEnough,
      torsoStable,
      hasRequiredView: true,
      bodyCoverage,
      feedback,
    }
  }, [bodyCoverage, curlArmSide, enabled, elbowAngle, exerciseMode, hasPose, hasRequiredView, kneeAngle, leftElbowAngle, rightElbowAngle, torsoAngle])
}

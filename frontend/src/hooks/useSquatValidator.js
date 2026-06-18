import { useMemo } from 'react'

const SQUAT_DEPTH_THRESHOLD = 178
const SQUAT_TORSO_THRESHOLD = 90
const CURL_FLEX_THRESHOLD = 55
const PRESS_EXTENSION_THRESHOLD = 160

const getCorrectionPrefix = (exerciseMode, exerciseLabel) => {
  const normalizedExerciseLabel = String(exerciseLabel || '').toLowerCase()
  const isArmMode = exerciseMode === 'press' || exerciseMode === 'curl' || exerciseMode === 'russian' || exerciseMode === 'row'
  const isCoreMode = exerciseMode === 'core'
  const isJumpingJackPattern = /polichinela|jumping jack|jumpingjack/.test(normalizedExerciseLabel)
  const isBurpeePattern = /burpee/.test(normalizedExerciseLabel)
  const isHighKneesPattern = /rodillas altas|high knees|marcha en sitio/.test(normalizedExerciseLabel)
  const isMountainClimberPattern = /mountain climber|mountain climbers|escalador/.test(normalizedExerciseLabel)

  if (isJumpingJackPattern) return 'Corrige el polichinela'
  if (isBurpeePattern) return 'Corrige el burpee'
  if (isHighKneesPattern) return 'Corrige las rodillas altas'
  if (isMountainClimberPattern) return 'Corrige el mountain climber'
  if (isCoreMode) return 'Corrige la postura del core'
  if (exerciseMode === 'curl') return 'Corrige el curl'
  if (exerciseMode === 'row') return 'Corrige el remo'
  if (exerciseMode === 'russian') return 'Corrige la flexion rusa'
  if (isArmMode) return 'Corrige el movimiento'
  return 'Corrige la posicion'
}

const withCorrectionHint = (exerciseMode, exerciseLabel, message) => {
  const prefix = getCorrectionPrefix(exerciseMode, exerciseLabel)
  if (!message) return `${prefix}.`
  if (String(message).toLowerCase().startsWith('corrige')) return message
  return `${prefix}: ${message}`
}

function getVisibleAverageAngle(...angles) {
  const validAngles = angles.filter((angle) => Number.isFinite(angle))
  if (!validAngles.length) return null
  return validAngles.reduce((sum, angle) => sum + angle, 0) / validAngles.length
}

export function useSquatValidator({
  exerciseMode = 'squat',
  exerciseLabel = '',
  kneeAngle,
  torsoAngle,
  elbowAngle,
  leftElbowAngle,
  rightElbowAngle,
  wristSpread,
  ankleSpread,
  handsAboveShoulders,
  feetApart,
  dominantArmSide = 'left',
  curlArmSide = 'left',
  hasPose,
  hasRequiredView,
  bodyCoverage = 0,
  enabled = false,
}) {
  return useMemo(() => {
    const isArmMode = exerciseMode === 'press' || exerciseMode === 'curl' || exerciseMode === 'russian' || exerciseMode === 'row'
    const isCoreMode = exerciseMode === 'core'
    const isManualMode = exerciseMode === 'manual'
    const normalizedExerciseLabel = String(exerciseLabel || '').toLowerCase()
    const isPushPattern = /flexion|push|push-up|pushup/.test(normalizedExerciseLabel)
    const isRowPattern = /remo|row/.test(normalizedExerciseLabel)
    const isDiamondPattern = /diamante/.test(normalizedExerciseLabel)
    const isRowMode = exerciseMode === 'row'
    const isRussianPattern = /rusa|antebrazo/.test(normalizedExerciseLabel)
    const isJumpingJackPattern = /polichinela|jumping jack|jumpingjack/.test(normalizedExerciseLabel)
    const isBurpeePattern = /burpee/.test(normalizedExerciseLabel)
    const isHighKneesPattern = /rodillas altas|high knees|marcha en sitio/.test(normalizedExerciseLabel)
    const isMountainClimberPattern = /mountain climber|mountain climbers|escalador/.test(normalizedExerciseLabel)
    const pressExtensionThreshold = isDiamondPattern ? 145 : PRESS_EXTENSION_THRESHOLD
    const rowFlexThreshold = 100
    const rowResetThreshold = 145
    const russianDownThreshold = 110
    const russianUpThreshold = 150
  const activeElbowAngle =
      exerciseMode === 'curl'
        ? curlArmSide === 'left'
          ? leftElbowAngle
          : rightElbowAngle
        : isRowMode
          ? dominantArmSide === 'right'
            ? rightElbowAngle ?? leftElbowAngle
            : leftElbowAngle ?? rightElbowAngle
        : (isRowPattern || isRussianPattern)
          ? dominantArmSide === 'right'
            ? rightElbowAngle ?? leftElbowAngle
            : leftElbowAngle ?? rightElbowAngle
        : elbowAngle

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
          : isRowMode
            ? 'Activa la camara para validar el remo.'
            : isPushPattern
              ? 'Activa la camara para validar la flexion.'
              : isRowPattern
                ? 'Activa la camara para validar el remo.'
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
            : isRowMode
              ? 'Ponte frente a la camara para empezar a contar remos.'
              : isPushPattern
                ? 'Ponte frente a la camara para empezar a contar flexiones.'
                : isRowPattern
                  ? 'Ponte frente a la camara para empezar a contar remos.'
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
          feedback: `Necesito ver el brazo ${curlArmSide === 'left' ? 'izquierdo' : 'derecho'} para medir el curl.`,
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

      const armLabel = curlArmSide === 'left' ? 'izquierdo' : 'derecho'
      let feedback = `Curl detectado con el brazo ${armLabel}.`

      if (!deepEnough) {
        feedback = `Baja un poco mas el brazo ${armLabel} para completar el curl.`
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

    if (exerciseMode === 'row') {
      if (activeElbowAngle == null) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: 'Necesito ver hombros, codos y munecas del brazo visible para medir el remo.',
        }
      }

      if (!hasRequiredView) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: `No veo tu tren superior completo. Ajusta la camara para mostrar hombros, codos y munecas (${bodyCoverage}%).`,
        }
      }

      const selectedElbowAngle = activeElbowAngle

      if (selectedElbowAngle == null) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: 'Necesito ver un brazo claro para medir el remo.',
        }
      }

      const deepEnough = selectedElbowAngle <= rowFlexThreshold
      const torsoStable = torsoAngle == null ? true : torsoAngle <= SQUAT_TORSO_THRESHOLD

      let feedback = `Remo detectado con el brazo ${dominantArmSide === 'right' ? 'derecho' : 'izquierdo'}.`

      if (!deepEnough) {
        feedback = 'Tira un poco mas del codo hacia atras para completar el remo.'
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

    if (exerciseMode === 'press' || exerciseMode === 'russian') {
      if ((isRowPattern || isRussianPattern ? activeElbowAngle : elbowAngle) == null) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: isPushPattern
            ? 'Necesito ver hombros, codos y munecas para medir la flexion.'
            : isRowPattern
              ? 'Necesito ver hombros, codos y munecas para medir el remo.'
              : isRussianPattern
                ? 'Necesito ver hombros, codos y munecas para medir la flexion rusa.'
              : 'Necesito ver hombros, codos y munecas para medir el press militar.',
        }
      }

      if (!hasRequiredView) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: `No veo tu tren superior completo. Ajusta la camara para mostrar hombros, codos y munecas (${bodyCoverage}%).`,
        }
      }

      const selectedElbowAngle = isRowPattern || isRussianPattern ? activeElbowAngle : elbowAngle

      if (selectedElbowAngle == null) {
        return {
          ...baseValidation,
          bodyCoverage,
          feedback: isRowPattern
            ? 'Necesito ver un brazo claro para medir el remo.'
            : isRussianPattern
              ? 'Necesito ver un brazo claro para medir la flexion rusa.'
            : 'Necesito ver hombros, codos y munecas para medir el press militar.',
        }
      }

      const deepEnough = isRussianPattern
        ? selectedElbowAngle <= russianDownThreshold
        : selectedElbowAngle >= pressExtensionThreshold
      const torsoStable = torsoAngle == null ? true : torsoAngle <= SQUAT_TORSO_THRESHOLD

      let feedback = isPushPattern
        ? 'Flexion detectada.'
        : isRowPattern
          ? `Remo detectado con el brazo ${dominantArmSide === 'right' ? 'derecho' : 'izquierdo'}.`
          : isRussianPattern
            ? `Flexion rusa detectada con el brazo ${dominantArmSide === 'right' ? 'derecho' : 'izquierdo'}.`
          : 'Press militar detectado.'

      if (!deepEnough) {
        feedback = isPushPattern
          ? 'Extiende un poco mas los brazos para completar la flexion.'
          : isRowPattern
            ? 'Extiende un poco mas los brazos para completar el remo.'
            : isRussianPattern
              ? 'Baja un poco mas hasta apoyar el antebrazo para completar la fase.'
              : 'Extiende un poco mas los brazos para completar el press militar.'
      } else if (!torsoStable) {
        feedback = 'Mantén el torso mas estable y evita balancearte.'
      } else if (isRussianPattern && selectedElbowAngle >= russianUpThreshold) {
        feedback = 'Vuelve a subir con control y completa la transicion a manos.'
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

      const torsoStable = torsoAngle == null ? true : torsoAngle <= 40
      const deepEnough = bodyCoverage >= 35

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
        feedback: isJumpingJackPattern
          ? 'Ponte frente a la camara para empezar a contar polichinelas.'
          : isBurpeePattern
            ? 'Ponte frente a la camara para empezar a contar burpees.'
            : isHighKneesPattern
              ? 'Ponte frente a la camara para empezar a contar rodillas altas.'
              : isMountainClimberPattern
                ? 'Ponte frente a la camara para empezar a contar mountain climbers.'
                : 'Ponte frente a la camara para empezar a contar sentadillas.',
      }
    }

    if (!hasRequiredView && bodyCoverage < 30) {
      return {
        ...baseValidation,
        bodyCoverage,
        feedback: isJumpingJackPattern
          ? `Aun falta un poco de cuerpo visible para validar bien los polichinelas (${bodyCoverage}%).`
          : isBurpeePattern
            ? `Aun falta un poco de cuerpo visible para validar bien los burpees (${bodyCoverage}%).`
            : isHighKneesPattern
              ? `Aun falta un poco de cuerpo visible para validar bien las rodillas altas (${bodyCoverage}%).`
              : isMountainClimberPattern
                ? `Aun falta un poco de cuerpo visible para validar bien los mountain climbers (${bodyCoverage}%).`
                : `Aun falta un poco de cuerpo visible para validar bien la sentadilla (${bodyCoverage}%).`,
      }
    }

    const deepEnough = isJumpingJackPattern
      ? Boolean(handsAboveShoulders && feetApart)
      : kneeAngle <= (
          isBurpeePattern
            ? 145
            : isHighKneesPattern
              ? 150
              : isMountainClimberPattern
                ? 148
                : SQUAT_DEPTH_THRESHOLD
        )
    const torsoStable = torsoAngle == null ? true : torsoAngle <= SQUAT_TORSO_THRESHOLD
    const isValid = deepEnough

    let feedback = isJumpingJackPattern
      ? 'Polichinela detectado.'
      : isBurpeePattern
        ? 'Burpee detectado.'
        : isHighKneesPattern
          ? 'Rodillas altas detectadas.'
          : isMountainClimberPattern
            ? 'Mountain climber detectado.'
            : 'Sentadilla detectada.'

    if (!deepEnough) {
      feedback = isJumpingJackPattern
        ? 'Abre brazos y piernas un poco mas para completar el polichinela.'
        : isBurpeePattern
          ? 'Baja un poco mas para completar el burpee.'
          : isHighKneesPattern
            ? 'Eleva un poco mas la rodilla para completar el movimiento.'
            : isMountainClimberPattern
              ? 'Lleva la rodilla mas cerca del pecho para completar el movimiento.'
              : 'Baja un poco mas para llegar a profundidad.'
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
  }, [ankleSpread, bodyCoverage, curlArmSide, dominantArmSide, enabled, elbowAngle, exerciseLabel, exerciseMode, feetApart, handsAboveShoulders, hasPose, hasRequiredView, kneeAngle, leftElbowAngle, rightElbowAngle, torsoAngle, wristSpread])
}

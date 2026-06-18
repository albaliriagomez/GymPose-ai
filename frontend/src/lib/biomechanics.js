function toDegrees(radians) {
  return (radians * 180) / Math.PI
}

export function calculateJointAngle(a, b, c) {
  if (!a || !b || !c) return null

  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x)

  let angle = Math.abs(toDegrees(radians))
  if (angle > 180) angle = 360 - angle

  return Number(angle.toFixed(1))
}

export function calculateTorsoAngle(shoulder, hip) {
  if (!shoulder || !hip) return null

  const radians = Math.atan2(shoulder.x - hip.x, shoulder.y - hip.y)
  return Number(Math.abs(toDegrees(radians)).toFixed(1))
}

function averageLandmark(left, right) {
  if (!left || !right) return null

  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  }
}

function averageAngles(values) {
  const valid = values.filter((value) => Number.isFinite(value))
  if (!valid.length) return null

  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1))
}

function getArmVisibilityScore(pose, side) {
  const indices = side === 'left' ? [11, 13, 15] : [12, 14, 16]

  return indices.reduce((score, index) => {
    const landmark = pose[index]
    if (!isLandmarkVisible(landmark, 0.4)) {
      return score
    }

    return score + (landmark.visibility ?? 1)
  }, 0)
}

function getArmVisibleCount(pose, side) {
  const indices = side === 'left' ? [11, 13, 15] : [12, 14, 16]
  return indices.reduce((count, index) => count + (isLandmarkVisible(pose[index], 0.4) ? 1 : 0), 0)
}

function getDominantArmSide(pose) {
  const leftScore = getArmVisibilityScore(pose, 'left')
  const rightScore = getArmVisibilityScore(pose, 'right')

  if (leftScore === rightScore) {
    return 'left'
  }

  return leftScore > rightScore ? 'left' : 'right'
}

function getVisibleLandmarkStats(pose, landmarkIndices) {
  const visiblePoints = landmarkIndices
    .map((index) => pose[index])
    .filter((landmark) => isLandmarkVisible(landmark))

  if (!visiblePoints.length) {
    return null
  }

  const xs = visiblePoints.map((point) => point.x)
  const ys = visiblePoints.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const centerX = visiblePoints.reduce((sum, point) => sum + point.x, 0) / visiblePoints.length
  const centerY = visiblePoints.reduce((sum, point) => sum + point.y, 0) / visiblePoints.length

  return {
    centerX: Number(centerX.toFixed(3)),
    centerY: Number(centerY.toFixed(3)),
    width: Number((maxX - minX).toFixed(3)),
    height: Number((maxY - minY).toFixed(3)),
    area: Number(Math.max((maxX - minX) * (maxY - minY), 0).toFixed(3)),
    visibleCount: visiblePoints.length,
  }
}

function isPrimarySubjectVisible(pose, requiredLandmarks, requiredView) {
  const stats = getVisibleLandmarkStats(pose, requiredLandmarks)
  if (!stats) {
    return {
      isPrimarySubject: false,
      bodyCenterX: null,
      bodyCenterY: null,
      bodyArea: 0,
      bodyCentered: false,
    }
  }

  const centerOffsetX = Math.abs(stats.centerX - 0.5)
  const centerOffsetY = Math.abs(stats.centerY - 0.5)
  const isArmView = requiredView === 'arm' || requiredView === 'single-arm'
  const minArea = isArmView ? 0.018 : 0.04
  const maxCenterOffsetX = isArmView ? 0.34 : 0.24
  const maxCenterOffsetY = isArmView ? 0.34 : 0.28
  const minWidth = isArmView ? 0.14 : 0.24
  const minHeight = isArmView ? 0.16 : 0.28

  const bodyCentered = centerOffsetX <= maxCenterOffsetX && centerOffsetY <= maxCenterOffsetY
  const bodyVisibleEnough =
    stats.area >= minArea &&
    stats.width >= minWidth &&
    stats.height >= minHeight

  return {
    isPrimarySubject: bodyCentered && bodyVisibleEnough,
    bodyCenterX: stats.centerX,
    bodyCenterY: stats.centerY,
    bodyArea: stats.area,
    bodyCentered,
  }
}

const SQUAT_REQUIRED_LANDMARKS = [
  11, 12,
  23, 24,
  25, 26,
  27, 28,
]

const ARM_REQUIRED_LANDMARKS = [
  11, 12,
  13, 14,
  15, 16,
]

function isLandmarkVisible(landmark, threshold = 0.6) {
  return Boolean(landmark && (landmark.visibility ?? 1) >= threshold)
}

function getExerciseConfig(exerciseMode) {
  if (exerciseMode === 'manual') {
    return {
      requiredLandmarks: [],
      requiredView: 'guide',
      label: 'ejercicio manual',
    }
  }

  if (exerciseMode === 'curl') {
    return {
      requiredLandmarks: ARM_REQUIRED_LANDMARKS,
      requiredView: 'arm',
      label: 'biceps',
    }
  }

  if (exerciseMode === 'press') {
    return {
      requiredLandmarks: ARM_REQUIRED_LANDMARKS,
      requiredView: 'arm',
      label: 'press militar',
    }
  }

  if (exerciseMode === 'row') {
    return {
      requiredLandmarks: ARM_REQUIRED_LANDMARKS,
      requiredView: 'single-arm',
      label: 'remo sentado con banda',
    }
  }

  if (exerciseMode === 'russian') {
    return {
      requiredLandmarks: ARM_REQUIRED_LANDMARKS,
      requiredView: 'single-arm',
      label: 'flexiones rusas de antebrazos',
    }
  }

  if (exerciseMode === 'core') {
    return {
      requiredLandmarks: SQUAT_REQUIRED_LANDMARKS,
      requiredView: 'full',
      label: 'plank',
    }
  }

  return {
    requiredLandmarks: SQUAT_REQUIRED_LANDMARKS,
    requiredView: 'full',
    label: 'sentadilla',
  }
}

export function buildPoseInsights(poseLandmarkerResult, exerciseMode = 'squat') {
  const pose = poseLandmarkerResult?.landmarks?.[0]
  const config = getExerciseConfig(exerciseMode)

  if (exerciseMode === 'manual') {
    return {
      exerciseMode,
      hasPose: Boolean(pose),
      requiredView: config.requiredView,
      hasRequiredView: Boolean(pose),
      hasPrimarySubject: Boolean(pose),
      bodyCoverage: 0,
      bodyCenterX: null,
      bodyCenterY: null,
      bodyArea: 0,
      kneeAngle: null,
      torsoAngle: null,
      elbowAngle: null,
      leftElbowAngle: null,
      rightElbowAngle: null,
      repCount: 0,
      feedback: pose
        ? 'Ejercicio sin validación por puntos. Sigue el contador del plan.'
        : 'Ejercicio sin validación por puntos. Sigue el contador del plan.',
    }
  }

  if (!pose) {
    return {
      exerciseMode,
      hasPose: false,
      requiredView: config.requiredView,
      hasRequiredView: false,
      hasPrimarySubject: false,
      bodyCoverage: 0,
      bodyCenterX: null,
      bodyCenterY: null,
      bodyArea: 0,
      kneeAngle: null,
      torsoAngle: null,
      elbowAngle: null,
      leftElbowAngle: null,
      rightElbowAngle: null,
      repCount: 0,
      feedback: `Esperando pose valida para ${config.label}.`,
    }
  }

  const leftHip = pose[23]
  const leftKnee = pose[25]
  const leftAnkle = pose[27]
  const leftShoulder = pose[11]
  const leftElbow = pose[13]
  const leftWrist = pose[15]
  const rightHip = pose[24]
  const rightKnee = pose[26]
  const rightAnkle = pose[28]
  const rightShoulder = pose[12]
  const rightElbow = pose[14]
  const rightWrist = pose[16]
  const shoulders = averageLandmark(leftShoulder, rightShoulder)
  const hips = averageLandmark(pose[23], pose[24])
  const visibleLandmarks = config.requiredLandmarks.filter((index) => isLandmarkVisible(pose[index]))
  const bodyCoverage = Number(((visibleLandmarks.length / config.requiredLandmarks.length) * 100).toFixed(0))
  const primarySubject = isPrimarySubjectVisible(pose, config.requiredLandmarks, config.requiredView)
  const leftArmVisibleCount = getArmVisibleCount(pose, 'left')
  const rightArmVisibleCount = getArmVisibleCount(pose, 'right')
  const russianArmVisibleCount = Math.max(leftArmVisibleCount, rightArmVisibleCount)
  const hasRequiredView =
    exerciseMode === 'squat' || exerciseMode === 'core'
      ? bodyCoverage >= 75
      : exerciseMode === 'russian' || exerciseMode === 'row'
        ? russianArmVisibleCount >= 2
      : visibleLandmarks.length === config.requiredLandmarks.length

  const kneeAngle = averageAngles([
    calculateJointAngle(leftHip, leftKnee, leftAnkle),
    calculateJointAngle(rightHip, rightKnee, rightAnkle),
  ])

  const leftElbowAngle = calculateJointAngle(leftShoulder, leftElbow, leftWrist)
  const rightElbowAngle = calculateJointAngle(rightShoulder, rightElbow, rightWrist)
  const elbowAngle = averageAngles([leftElbowAngle, rightElbowAngle])
  const dominantArmSide = getDominantArmSide(pose)
  const dominantElbowAngle = dominantArmSide === 'right' ? rightElbowAngle ?? leftElbowAngle : leftElbowAngle ?? rightElbowAngle
  const torsoAngle = calculateTorsoAngle(shoulders, hips)
  const wristSpread = leftWrist && rightWrist ? Number(Math.abs(leftWrist.x - rightWrist.x).toFixed(3)) : null
  const ankleSpread = leftAnkle && rightAnkle ? Number(Math.abs(leftAnkle.x - rightAnkle.x).toFixed(3)) : null
  const handsAboveShoulders =
    Boolean(leftWrist && rightWrist && leftShoulder && rightShoulder) &&
    leftWrist.y < leftShoulder.y &&
    rightWrist.y < rightShoulder.y
  const feetApart = Boolean(ankleSpread != null && ankleSpread >= 0.18)

  if (!hasRequiredView) {
    return {
      exerciseMode,
      hasPose: true,
      requiredView: config.requiredView,
      hasRequiredView: false,
      bodyCoverage,
      hasPrimarySubject: primarySubject.isPrimarySubject,
      bodyCenterX: primarySubject.bodyCenterX,
      bodyCenterY: primarySubject.bodyCenterY,
      bodyArea: primarySubject.bodyArea,
      kneeAngle,
      torsoAngle,
      elbowAngle,
      leftElbowAngle,
      rightElbowAngle,
      dominantArmSide,
      dominantElbowAngle,
      wristSpread,
      ankleSpread,
      handsAboveShoulders,
      feetApart,
      repCount: 0,
      feedback: config.requiredView === 'arm'
        ? `No veo tu tren superior completo. Necesito hombros, codos y munecas visibles (${bodyCoverage}%).`
        : `Aun no veo suficiente cuerpo para validar con confianza (${bodyCoverage}%).`,
    }
  }

  if (!primarySubject.isPrimarySubject) {
    return {
      exerciseMode,
      hasPose: true,
      requiredView: config.requiredView,
      hasRequiredView: false,
      bodyCoverage,
      hasPrimarySubject: false,
      bodyCenterX: primarySubject.bodyCenterX,
      bodyCenterY: primarySubject.bodyCenterY,
      bodyArea: primarySubject.bodyArea,
      kneeAngle,
      torsoAngle,
      elbowAngle,
      leftElbowAngle,
      rightElbowAngle,
      dominantArmSide,
      dominantElbowAngle,
      wristSpread,
      ankleSpread,
      handsAboveShoulders,
      feetApart,
      repCount: 0,
      feedback: 'Ajusta la camara para centrar tu cuerpo y evitar que se mezclen otras personas en la deteccion.',
    }
  }

  let feedback = `Pose detectada. Lista para ${config.label}.`

  if (exerciseMode === 'curl') {
    if (elbowAngle && elbowAngle < 70) {
      feedback = 'Curl profundo. Mantén el control del brazo.'
    } else if (torsoAngle && torsoAngle > 18) {
      feedback = 'Torso inclinado. Trata de no balancear el cuerpo.'
    }
  } else if (exerciseMode === 'row') {
    if (dominantElbowAngle && dominantElbowAngle > 150) {
      feedback = 'Remo listo. Tira del codo hacia atras con control.'
    } else if (dominantElbowAngle && dominantElbowAngle < 100) {
      feedback = 'Remo cerrado. Vuelve a extender el brazo para la siguiente repeticion.'
    } else {
      feedback = `Remo detectado con el brazo ${dominantArmSide === 'right' ? 'derecho' : 'izquierdo'}.`
    }
  } else if (exerciseMode === 'press') {
    if (elbowAngle && elbowAngle > 165) {
      feedback = 'Press completo. Mantén los brazos estables arriba.'
    } else if (torsoAngle && torsoAngle > 18) {
      feedback = 'Torso inclinado. Trata de no balancear el cuerpo.'
    } else {
      feedback = 'Empuja la barra o peso por encima de la cabeza.'
    }
  } else if (exerciseMode === 'russian') {
    const visibleArmSide = dominantArmSide
    if (dominantElbowAngle && dominantElbowAngle > 150) {
      feedback = 'Posición alta. Baja al antebrazo con control.'
    } else if (dominantElbowAngle && dominantElbowAngle < 115) {
      feedback = 'Antebrazo apoyado. Vuelve a extender para completar la fase.'
    } else {
      feedback = `Flexión rusa detectada con el brazo ${visibleArmSide === 'right' ? 'derecho' : 'izquierdo'}.`
    }
  } else if (exerciseMode === 'core') {
    if (torsoAngle && torsoAngle > 20) {
      feedback = 'Alinea mejor el torso para sostener el plank.'
    } else {
      feedback = 'Plank detectado. Mantén el core firme y la cadera estable.'
    }
  } else {
    if (kneeAngle && kneeAngle < 80) {
      feedback = 'Profundidad alta. Evalua control de rodilla y talon.'
    } else if (torsoAngle && torsoAngle > 18) {
      feedback = 'Torso inclinado. La base para feedback postural ya esta lista.'
    }
  }

  return {
    exerciseMode,
    hasPose: true,
    requiredView: config.requiredView,
    hasRequiredView: true,
    bodyCoverage,
    hasPrimarySubject: true,
    bodyCenterX: primarySubject.bodyCenterX,
    bodyCenterY: primarySubject.bodyCenterY,
    bodyArea: primarySubject.bodyArea,
    kneeAngle,
    torsoAngle,
    elbowAngle,
    leftElbowAngle,
    rightElbowAngle,
    dominantArmSide,
    dominantElbowAngle,
    wristSpread,
    ankleSpread,
    handsAboveShoulders,
    feetApart,
    repCount: 0,
    feedback,
  }
}

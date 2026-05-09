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
  if (exerciseMode === 'curl') {
    return {
      requiredLandmarks: ARM_REQUIRED_LANDMARKS,
      requiredView: 'arm',
      label: 'bíceps',
    }
  }

  if (exerciseMode === 'bicep') {
    return {
      requiredLandmarks: ARM_REQUIRED_LANDMARKS,
      requiredView: 'arm',
      label: 'press militar',
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

  if (!pose) {
    return {
      exerciseMode,
      hasPose: false,
      requiredView: config.requiredView,
      hasRequiredView: false,
      bodyCoverage: 0,
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
  const hasRequiredView =
    exerciseMode === 'squat'
      ? bodyCoverage >= 75
      : visibleLandmarks.length === config.requiredLandmarks.length

  const kneeAngle = averageAngles([
    calculateJointAngle(leftHip, leftKnee, leftAnkle),
    calculateJointAngle(rightHip, rightKnee, rightAnkle),
  ])

  const leftElbowAngle = calculateJointAngle(leftShoulder, leftElbow, leftWrist)
  const rightElbowAngle = calculateJointAngle(rightShoulder, rightElbow, rightWrist)
  const elbowAngle = averageAngles([leftElbowAngle, rightElbowAngle])
  const torsoAngle = calculateTorsoAngle(shoulders, hips)

  if (!hasRequiredView) {
    return {
      exerciseMode,
      hasPose: true,
      requiredView: config.requiredView,
      hasRequiredView: false,
      bodyCoverage,
      kneeAngle,
      torsoAngle,
      elbowAngle,
      leftElbowAngle,
      rightElbowAngle,
      repCount: 0,
      feedback: config.requiredView === 'arm'
        ? `No veo tu tren superior completo. Necesito hombros, codos y munecas visibles (${bodyCoverage}%).`
        : `Aun no veo suficiente cuerpo para validar con confianza (${bodyCoverage}%).`,
    }
  }

  let feedback = `Pose detectada. Lista para ${config.label}.`

  if (exerciseMode === 'curl') {
    if (elbowAngle && elbowAngle < 70) {
      feedback = 'Curl profundo. Mantén el control del brazo.'
    } else if (torsoAngle && torsoAngle > 18) {
      feedback = 'Torso inclinado. Trata de no balancear el cuerpo.'
    }
  } else if (exerciseMode === 'bicep') {
    if (elbowAngle && elbowAngle < 70) {
      feedback = 'Press profundo. Mantén los codos alineados.'
    } else if (torsoAngle && torsoAngle > 18) {
      feedback = 'Torso inclinado. Trata de no balancear el cuerpo.'
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
    kneeAngle,
    torsoAngle,
    elbowAngle,
    leftElbowAngle,
    rightElbowAngle,
    repCount: 0,
    feedback,
  }
}

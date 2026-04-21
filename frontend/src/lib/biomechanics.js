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

const BODY_REQUIRED_LANDMARKS = [
  11, 12, // shoulders
  23, 24, // hips
  25, 26, // knees
  27, 28, // ankles
]

function isLandmarkVisible(landmark, threshold = 0.6) {
  return Boolean(landmark && (landmark.visibility ?? 1) >= threshold)
}

export function buildPoseInsights(poseLandmarkerResult) {
  const pose = poseLandmarkerResult?.landmarks?.[0]

  if (!pose) {
    return {
      hasPose: false,
      hasFullBody: false,
      bodyCoverage: 0,
      kneeAngle: null,
      torsoAngle: null,
      repCount: 0,
      feedback: 'Esperando pose valida',
    }
  }

  const leftHip = pose[23]
  const leftKnee = pose[25]
  const leftAnkle = pose[27]
  const rightHip = pose[24]
  const rightKnee = pose[26]
  const rightAnkle = pose[28]
  const shoulders = averageLandmark(pose[11], pose[12])
  const hips = averageLandmark(pose[23], pose[24])
  const visibleLandmarks = BODY_REQUIRED_LANDMARKS.filter((index) => isLandmarkVisible(pose[index]))
  const bodyCoverage = Number(((visibleLandmarks.length / BODY_REQUIRED_LANDMARKS.length) * 100).toFixed(0))
  const hasFullBody = visibleLandmarks.length === BODY_REQUIRED_LANDMARKS.length

  const kneeAngle = averageAngles([
    calculateJointAngle(leftHip, leftKnee, leftAnkle),
    calculateJointAngle(rightHip, rightKnee, rightAnkle),
  ])
  const torsoAngle = calculateTorsoAngle(shoulders, hips)

  if (!hasFullBody) {
    return {
      hasPose: true,
      hasFullBody: false,
      bodyCoverage,
      kneeAngle,
      torsoAngle,
      repCount: 0,
      feedback: `No veo tu cuerpo completo. Necesito hombros, cadera, rodillas y tobillos visibles (${bodyCoverage}%).`,
    }
  }

  let feedback = 'Pose detectada. Lista para feedback biomecanico.'

  if (kneeAngle && kneeAngle < 80) {
    feedback = 'Profundidad alta. Evalua control de rodilla y talon.'
  } else if (torsoAngle && torsoAngle > 18) {
    feedback = 'Torso inclinado. La base para feedback postural ya esta lista.'
  }

  return {
    hasPose: true,
    hasFullBody: true,
    bodyCoverage,
    kneeAngle,
    torsoAngle,
    repCount: 0,
    feedback,
  }
}

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

export function buildPoseInsights(poseLandmarkerResult) {
  const pose = poseLandmarkerResult?.landmarks?.[0]

  if (!pose) {
    return {
      hasPose: false,
      kneeAngle: null,
      torsoAngle: null,
      repCount: 0,
      feedback: 'Esperando pose valida',
    }
  }

  const leftHip = pose[23]
  const leftKnee = pose[25]
  const leftAnkle = pose[27]
  const shoulders = averageLandmark(pose[11], pose[12])
  const hips = averageLandmark(pose[23], pose[24])

  const kneeAngle = calculateJointAngle(leftHip, leftKnee, leftAnkle)
  const torsoAngle = calculateTorsoAngle(shoulders, hips)

  let feedback = 'Pose detectada. Lista para feedback biomecanico.'

  if (kneeAngle && kneeAngle < 80) {
    feedback = 'Profundidad alta. Evalua control de rodilla y talon.'
  } else if (torsoAngle && torsoAngle > 18) {
    feedback = 'Torso inclinado. La base para feedback postural ya esta lista.'
  }

  return {
    hasPose: true,
    kneeAngle,
    torsoAngle,
    repCount: 0,
    feedback,
  }
}

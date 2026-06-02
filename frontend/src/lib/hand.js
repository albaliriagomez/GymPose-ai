import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export const DEFAULT_HAND_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

export const DEFAULT_HAND_MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export async function createHandLandmarker({
  wasmRoot = DEFAULT_HAND_WASM_URL,
  modelAssetPath = DEFAULT_HAND_MODEL_ASSET_PATH,
  numHands = 1,
  runningMode = 'VIDEO',
} = {}) {
  const vision = await FilesetResolver.forVisionTasks(wasmRoot)

  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath,
        delegate: 'GPU',
      },
      runningMode,
      numHands,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
  } catch {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath,
        delegate: 'CPU',
      },
      runningMode,
      numHands,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
  }
}

function distance(a, b) {
  if (!a || !b) return null
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function isFingerExtended(landmarks, tipIndex, pipIndex, wristIndex = 0) {
  const tip = landmarks?.[tipIndex]
  const pip = landmarks?.[pipIndex]
  const wrist = landmarks?.[wristIndex]

  if (!tip || !pip || !wrist) return false

  return distance(wrist, tip) > distance(wrist, pip)
}

export function detectOkGesture(handResult) {
  const landmarks = handResult?.landmarks?.[0]
  if (!landmarks?.length) {
    return { detected: false, confidence: 0 }
  }

  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const thumbMcp = landmarks[2]
  const indexMcp = landmarks[5]
  const middleMcp = landmarks[9]

  const palmScale = distance(landmarks[0], middleMcp) || distance(landmarks[0], indexMcp) || 0.1
  const pinchDistance = distance(thumbTip, indexTip)

  if (pinchDistance == null) {
    return { detected: false, confidence: 0 }
  }

  const middleExtended = isFingerExtended(landmarks, 12, 10)
  const ringExtended = isFingerExtended(landmarks, 16, 14)
  const pinkyExtended = isFingerExtended(landmarks, 20, 18)
  const thumbCurled = distance(thumbTip, thumbMcp) < palmScale * 0.7

  const pinchOk = pinchDistance <= palmScale * 0.35
  const fingersOk = middleExtended && ringExtended && pinkyExtended

  const confidence =
    [
      pinchOk,
      fingersOk,
      thumbCurled,
    ].filter(Boolean).length / 3

  return {
    detected: pinchOk && fingersOk && thumbCurled,
    confidence,
  }
}

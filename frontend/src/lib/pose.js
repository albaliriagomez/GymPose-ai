import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export const DEFAULT_POSE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

export const DEFAULT_POSE_MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export async function createPoseLandmarker({
  wasmRoot = DEFAULT_POSE_WASM_URL,
  modelAssetPath = DEFAULT_POSE_MODEL_ASSET_PATH,
  numPoses = 1,
  runningMode = 'VIDEO',
} = {}) {
  const vision = await FilesetResolver.forVisionTasks(wasmRoot)

  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath,
        delegate: 'GPU',
      },
      runningMode,
      numPoses,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    })
  } catch {
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath,
        delegate: 'CPU',
      },
      runningMode,
      numPoses,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    })
  }
}

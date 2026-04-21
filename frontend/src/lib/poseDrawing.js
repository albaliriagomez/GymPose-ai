const POSE_CONNECTIONS = [
  [11, 12],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28],
]

const SQUAT_KEYPOINTS = new Set([11, 12, 23, 24, 25, 26, 27, 28])

function toCanvasPoint(landmark, width, height) {
  return {
    x: landmark.x * width,
    y: landmark.y * height,
  }
}

export function resizeCanvasToVideo(canvas, video) {
  const width = video.videoWidth || 0
  const height = video.videoHeight || 0

  if (!width || !height) return false

  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  return true
}

export function drawPoseLandmarks(ctx, poseLandmarkerResult, width, height) {
  ctx.clearRect(0, 0, width, height)

  const poses = poseLandmarkerResult?.landmarks ?? []

  poses.forEach((landmarks) => {
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.9)'

    POSE_CONNECTIONS.forEach(([startIndex, endIndex]) => {
      const start = landmarks[startIndex]
      const end = landmarks[endIndex]

      if (!start || !end) return
      if ((start.visibility ?? 1) < 0.35 || (end.visibility ?? 1) < 0.35) return

      const a = toCanvasPoint(start, width, height)
      const b = toCanvasPoint(end, width, height)

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    })

    landmarks.forEach((landmark, index) => {
      if ((landmark.visibility ?? 1) < 0.35) return

      const point = toCanvasPoint(landmark, width, height)
      const isPrimary = SQUAT_KEYPOINTS.has(index)

      ctx.beginPath()
      ctx.fillStyle = isPrimary ? '#ffffff' : '#22d3ee'
      ctx.shadowColor = 'rgba(34, 211, 238, 0.8)'
      ctx.shadowBlur = isPrimary ? 14 : 8
      ctx.arc(point.x, point.y, isPrimary ? 4 : 3, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.shadowBlur = 0
  })
}

import { useEffect, useState } from 'react'

const DEFAULT_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
}

export function useCameraStream(videoRef) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      stopCamera(videoRef.current)
    }
  }, [videoRef])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError('Este navegador no soporta getUserMedia().')
      return false
    }

    try {
      setStatus('requesting')
      setError('')

      const stream = await navigator.mediaDevices.getUserMedia(DEFAULT_CONSTRAINTS)
      const video = videoRef.current

      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        setStatus('error')
        setError('No se encontro el elemento de video.')
        return false
      }

      video.srcObject = stream
      video.muted = true
      video.playsInline = true

      await video.play()
      setStatus('ready')
      return true
    } catch (err) {
      setStatus('error')
      setError(err.message || 'No se pudo abrir la camara.')
      return false
    }
  }

  function stopCurrentCamera() {
    stopCamera(videoRef.current)
    setStatus('idle')
    setError('')
  }

  return {
    status,
    error,
    startCamera,
    stopCamera: stopCurrentCamera,
    isActive: status === 'ready',
  }
}

function stopCamera(videoElement) {
  const stream = videoElement?.srcObject

  if (stream && typeof stream.getTracks === 'function') {
    stream.getTracks().forEach((track) => track.stop())
  }

  if (videoElement) {
    videoElement.pause?.()
    videoElement.srcObject = null
  }
}

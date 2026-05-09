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
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    const videoElement = videoRef.current

    return () => {
      stopCamera(videoElement)
    }
  }, [videoRef])

  async function startCamera() {
    if (isStarting || status === 'requesting' || status === 'ready') {
      return status === 'ready'
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError('Este navegador no soporta getUserMedia().')
      return false
    }

    try {
      setIsStarting(true)
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

      await waitForVideoReady(video)
      await video.play()
      setStatus('ready')
      return true
    } catch (err) {
      setStatus('error')
      setError(err.message || 'No se pudo abrir la camara.')
      return false
    } finally {
      setIsStarting(false)
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
    isStarting,
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

function waitForVideoReady(videoElement) {
  return new Promise((resolve, reject) => {
    if (!videoElement) {
      reject(new Error('No se encontro el elemento de video.'))
      return
    }

    if (videoElement.readyState >= 2) {
      resolve()
      return
    }

    const onLoadedMetadata = () => {
      cleanup()
      resolve()
    }

    const onError = () => {
      cleanup()
      reject(new Error('No se pudo preparar el video.'))
    }

    const cleanup = () => {
      videoElement.removeEventListener('loadedmetadata', onLoadedMetadata)
      videoElement.removeEventListener('error', onError)
    }

    videoElement.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
    videoElement.addEventListener('error', onError, { once: true })
  })
}

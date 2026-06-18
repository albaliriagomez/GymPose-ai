import api from './apiClient'
const headers  = () => ({ Authorization: `Bearer ${localStorage.getItem('gympose_token')}` })

// Crear sesión y guardar repetición
export const saveTrainingSession = async ({ exercise, score, duration_seconds = 0 }) => {
  try {
    const { data } = await api.post(
      '/sessions/save',
      { exercise, score, duration_seconds },
      { headers: headers() }
    )
    return data
  } catch (err) {
    console.error('Error guardando sesión:', err)
  }
}

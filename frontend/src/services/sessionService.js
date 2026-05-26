import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const headers  = () => ({ Authorization: `Bearer ${localStorage.getItem('gympose_token')}` })

// Crear sesión y guardar repetición
export const saveTrainingSession = async ({ exercise, score, duration_seconds = 0 }) => {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/sessions/save`,
      { exercise, score, duration_seconds },
      { headers: headers() }
    )
    return data
  } catch (err) {
    console.error('Error guardando sesión:', err)
  }
}
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const getTrainingPlan = async (token, frequency = 'media') => {
  const { data } = await axios.get(`${API}/training/plan`, {
    params: { frequency },
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const headers  = () => ({ Authorization: `Bearer ${localStorage.getItem('gympose_token')}` })

export const getProfile = async () => {
  const { data } = await axios.get(`${BASE_URL}/auth/me`, { headers: headers() })
  return data
}

export const updateProfile = async (profileData) => {
  const { data } = await axios.put(`${BASE_URL}/auth/me`, profileData, { headers: headers() })
  return data
}
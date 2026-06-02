import api from './apiClient'
const headers  = () => ({ Authorization: `Bearer ${localStorage.getItem('gympose_token')}` })

export const getProfile = async () => {
  const { data } = await api.get('/auth/me', { headers: headers() })
  return data
}

export const updateProfile = async (profileData) => {
  const { data } = await api.put('/auth/me', profileData, { headers: headers() })
  return data
}

export const getTrainers = async () => {
  const { data } = await api.get('/trainers')
  return data
}

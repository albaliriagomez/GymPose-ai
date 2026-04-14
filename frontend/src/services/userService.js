import api from './authService'

export const getProfile = async (token) => {
  const { data } = await api.get(`/auth/me?token=${token}`)
  return data
}

export const updateProfile = async (token, profileData) => {
  const { data } = await api.put(`/auth/me?token=${token}`, profileData)
  return data
}
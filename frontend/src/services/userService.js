import api from './authService'

const getToken = () => localStorage.getItem('gympose_token')

export const getProfile = async () => {
  const { data } = await api.get(`/auth/me?token=${getToken()}`)
  return data
}

export const updateProfile = async (profileData) => {
  const { data } = await api.put(`/auth/me?token=${getToken()}`, profileData)
  return data
}
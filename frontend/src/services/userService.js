import api from './authService'

export const getProfile = async () => {
  const { data } = await api.get('/auth/me')
  return data
}

export const updateProfile = async (profileData) => {
  const { data } = await api.put('/auth/me', profileData)
  return data
}

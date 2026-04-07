import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gympose_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gympose_token')
      localStorage.removeItem('gympose_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const register = async (userData) => {
  try {
    const { data } = await api.post('/auth/register', userData)
    localStorage.setItem('gympose_token', data.access_token)
    localStorage.setItem('gympose_user', JSON.stringify(data.user))
    return data
  } catch (err) {
    const errorMessage = err.response?.data?.detail || 'Error al registrarse'
    throw new Error(errorMessage)
  }
}

export const login = async (email, password) => {
  try {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('gympose_token', data.access_token)
    localStorage.setItem('gympose_user', JSON.stringify(data.user))
    return data
  } catch (err) {
    const errorMessage = err.response?.data?.detail || 'Email o contraseña incorrectos'
    throw new Error(errorMessage)
  }
}

export const fetchUserProfile = async (token) => {
  try {
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return data
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Error al obtener perfil')
  }
}

export const updateProfile = async (updateData, token) => {
  try {
    const { data } = await api.put('/auth/me', updateData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    localStorage.setItem('gympose_user', JSON.stringify(data))
    return data
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Error al actualizar perfil')
  }
}

export const logout = () => {
  localStorage.removeItem('gympose_token')
  localStorage.removeItem('gympose_user')
}

export const getUser = () => {
  const user = localStorage.getItem('gympose_user')
  return user ? JSON.parse(user) : null
}

export const getToken = () => {
  return localStorage.getItem('gympose_token')
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('gympose_token')
}

export default api
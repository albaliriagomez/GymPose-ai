import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

const normalizeUser = (user) => user ? { ...user, role: user.role || 'user' } : user

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
    data.user = normalizeUser(data.user)
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
    data.user = normalizeUser(data.user)
    localStorage.setItem('gympose_token', data.access_token)
    localStorage.setItem('gympose_user', JSON.stringify(data.user))
    return data
  } catch (err) {
    //manejo de diferentes tipos de errores
    let errorMessage = 'Error al registrarse'
    
    if (err.response?.data?.detail) {
      errorMessage = err.response.data.detail
    } else if (err.response?.data?.errors) {
      //validación de Pydantic - array de errores
      errorMessage = err.response.data.errors.map(e => e.msg).join(', ')
    } else if (Array.isArray(err.response?.data)) {
      //otro formato de array de errores
      errorMessage = err.response.data.map(e => e.msg || e.detail || String(e)).join(', ')
    }
    
    throw new Error(errorMessage)
  }
}

export const fetchUserProfile = async (token) => {
  try {
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return normalizeUser(data)
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Error al obtener perfil')
  }
}

export const updateProfile = async (updateData, token) => {
  try {
    const { data } = await api.put('/auth/me', updateData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const normalized = normalizeUser(data)
    localStorage.setItem('gympose_user', JSON.stringify(normalized))
    return normalized
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
  return user ? normalizeUser(JSON.parse(user)) : null
}

export const getToken = () => {
  return localStorage.getItem('gympose_token')
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('gympose_token')
}

export default api

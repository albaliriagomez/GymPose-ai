import axios from 'axios'

const API_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gympose_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const login = async (email, password) => {
  // DEMO hardcodeado — funciona sin backend
  if (email === 'alex@gympose.com' && password === 'demo1234') {
    const user = { name: 'Alex', email }
    localStorage.setItem('gympose_token', 'demo_token_123')
    localStorage.setItem('gympose_user', JSON.stringify(user))
    return { token: 'demo_token_123', user }
  }
  try {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('gympose_token', data.token)
    localStorage.setItem('gympose_user', JSON.stringify(data.user))
    return data
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Credenciales incorrectas')
  }
}

export const register = async (data) => {
  if (data.email === 'alex@gympose.com') throw new Error('Este email ya está registrado')
  try {
    const res = await api.post('/auth/register', data)
    return res.data
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Error al registrarse')
  }
}

export const logout = () => {
  localStorage.removeItem('gympose_token')
  localStorage.removeItem('gympose_user')
}

export const getUser        = () => { const u = localStorage.getItem('gympose_user'); return u ? JSON.parse(u) : null }
export const isAuthenticated = () => !!localStorage.getItem('gympose_token')

export default api
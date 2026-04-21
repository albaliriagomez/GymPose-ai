import api from './authService'

export const getDashboardStats = async (token) => {
  const { data } = await api.get(`/dashboard/stats?token=${token}`)
  return data
}

export const getWeeklySummary = async (token) => {
  const { data } = await api.get(`/dashboard/weekly?token=${token}`)
  return data
}

export const getLastAnalysis = async (token) => {
  const { data } = await api.get(`/dashboard/last-analysis?token=${token}`)
  return data
}

export const getDashboardTips = async (token) => {
  const { data } = await api.get(`/dashboard/tips?token=${token}`)
  return data
}
import api from './authService'

export const getDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats')
  return data
}

export const getWeeklySummary = async () => {
  const { data } = await api.get('/dashboard/weekly')
  return data
}

export const getLastAnalysis = async () => {
  const { data } = await api.get('/dashboard/last-analysis')
  return data
}

export const getDashboardTips = async () => {
  const { data } = await api.get('/dashboard/tips')
  return data
}

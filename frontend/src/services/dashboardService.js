import api from './apiClient'
const getToken = () => localStorage.getItem('gympose_token')
const headers  = () => ({ Authorization: `Bearer ${getToken()}` })

export const getDashboardFull = async () => {
  const { data } = await api.get('/dashboard/full', { headers: headers() })
  return data
}

export const getWeeklySummary = async () => {
  const { data } = await api.get('/dashboard/weekly', { headers: headers() })
  return data
}

export const getDashboardTips = async () => {
  const { data } = await api.get('/dashboard/tips', { headers: headers() })
  return data
}

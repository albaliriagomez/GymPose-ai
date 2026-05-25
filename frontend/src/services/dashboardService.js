import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const getToken = () => localStorage.getItem('gympose_token')
const headers  = () => ({ Authorization: `Bearer ${getToken()}` })

export const getDashboardFull = async () => {
  const { data } = await axios.get(`${BASE_URL}/dashboard/full`, { headers: headers() })
  return data
}

export const getWeeklySummary = async () => {
  const { data } = await axios.get(`${BASE_URL}/dashboard/weekly`, { headers: headers() })
  return data
}

export const getDashboardTips = async () => {
  const { data } = await axios.get(`${BASE_URL}/dashboard/tips`, { headers: headers() })
  return data
}
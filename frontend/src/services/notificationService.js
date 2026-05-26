import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const headers  = () => ({ Authorization: `Bearer ${localStorage.getItem('gympose_token')}` })

export const getNotifications = async () => {
  const { data } = await axios.get(`${BASE_URL}/notifications/`, { headers: headers() })
  return data
}

export const getUnreadCount = async () => {
  const { data } = await axios.get(`${BASE_URL}/notifications/unread-count`, { headers: headers() })
  return data.unread
}

export const markAsRead = async (id) => {
  await axios.patch(`${BASE_URL}/notifications/${id}/read`, {}, { headers: headers() })
}

export const markAllRead = async () => {
  await axios.patch(`${BASE_URL}/notifications/read-all`, {}, { headers: headers() })
}
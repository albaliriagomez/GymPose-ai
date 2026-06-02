import api from './apiClient'
const headers  = () => ({ Authorization: `Bearer ${localStorage.getItem('gympose_token')}` })

export const getNotifications = async () => {
  const { data } = await api.get('/notifications/', { headers: headers() })
  return data
}

export const getUnreadCount = async () => {
  const { data } = await api.get('/notifications/unread-count', { headers: headers() })
  return data.unread
}

export const markAsRead = async (id) => {
  await api.patch(`/notifications/${id}/read`, {}, { headers: headers() })
}

export const markAllRead = async () => {
  await api.patch('/notifications/read-all', {}, { headers: headers() })
}

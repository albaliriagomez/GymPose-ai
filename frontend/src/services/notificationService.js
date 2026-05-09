import api from './authService'

export const getNotifications = async () => {
  const { data } = await api.get('/notifications/')
  return data
}

export const getUnreadCount = async () => {
  const { data } = await api.get('/notifications/unread-count')
  return data.unread
}

export const markAsRead = async (id) => {
  await api.patch(`/notifications/${id}/read`)
}

export const markAllRead = async () => {
  await api.patch('/notifications/read-all')
}

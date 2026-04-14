import api from './authService'

export const getNotifications = async (token) => {
  const { data } = await api.get(`/notifications/?token=${token}`)
  return data
}

export const getUnreadCount = async (token) => {
  const { data } = await api.get(`/notifications/unread-count?token=${token}`)
  return data.unread
}

export const markAsRead = async (token, id) => {
  await api.patch(`/notifications/${id}/read?token=${token}`)
}

export const markAllRead = async (token) => {
  await api.patch(`/notifications/read-all?token=${token}`)
}
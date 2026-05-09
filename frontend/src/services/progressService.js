import api from './authService'

export const getProgressPlan = async () => {
  const { data } = await api.get('/progress/plan')
  return data
}

export const getProgressSummary = async (period = 'weekly') => {
  const { data } = await api.get('/progress/summary', {
    params: { period },
  })
  return data
}

export const createProgressLog = async (logData) => {
  const { data } = await api.post('/progress/log', logData)
  return data
}

export const generateProgressPlan = async (planData) => {
  const { data } = await api.post('/progress/generate', planData)
  return data
}

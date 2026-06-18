/**
 * services/trainingService.js — GymPose
 */
import api from './apiClient'

/**
 * Obtiene las 3 variantes de plan + recomendación IA.
 * @returns {Promise<{ variantes: { A, B, C }, recomendacion: { variante_recomendada, razon, coaching_tip } }>}
 */
export async function getTrainingPlans(token, frequency = 'media') {
  const { data } = await api.get('/training/plans', {
    params: { frequency },
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function selectTrainingPlan(token, { planVariant, frequency = 'media' }) {
  const { data } = await api.post(
    '/training/plans/select',
    { plan_variant: planVariant, frequency },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function getRoutineProgress(token, dayId) {
  const { data } = await api.get(`/training/routines/${dayId}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function getRoutinesProgress(token) {
  const { data } = await api.get('/training/routines/progress', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function getCurrentTrainingState(token) {
  try {
    const { data } = await api.get('/training/routines/current', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  } catch (err) {
    if (err.response?.status === 401) {
      return null
    }

    const { data } = await api.get('/training/plans/current', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  }
}

export async function startRoutineDay(token, dayId, payload = {}) {
  const { data } = await api.post(
    `/training/routines/${dayId}/start`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function recordRoutineReps(token, dayId, payload = {}) {
  const { data } = await api.post(
    `/training/routines/${dayId}/exercise/reps`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function completeRoutineSet(token, dayId, payload = {}) {
  const { data } = await api.post(
    `/training/routines/${dayId}/exercise/set-complete`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function completeRoutineDay(token, dayId, payload = {}) {
  const { data } = await api.post(
    `/training/routines/${dayId}/complete`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

/**
 * @deprecated Usa getTrainingPlans. Mantiene compatibilidad con código antiguo.
 */
export async function getTrainingPlan(token, frequency = 'media') {
  const { data } = await api.get('/training/plan', {
    params: { frequency },
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

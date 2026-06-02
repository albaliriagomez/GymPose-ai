/**
 * services/trainingService.js — GymPose
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Obtiene las 3 variantes de plan + recomendación IA.
 * @returns {Promise<{ variantes: { A, B, C }, recomendacion: { variante_recomendada, razon, coaching_tip } }>}
 */
export async function getTrainingPlans(token, frequency = 'media') {
  const { data } = await axios.get(`${BASE_URL}/training/plans`, {
    params: { frequency },
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function selectTrainingPlan(token, { planVariant, frequency = 'media' }) {
  const { data } = await axios.post(
    `${BASE_URL}/training/plans/select`,
    { plan_variant: planVariant, frequency },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function getRoutineProgress(token, dayId) {
  const { data } = await axios.get(`${BASE_URL}/training/routines/${dayId}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function getRoutinesProgress(token) {
  const { data } = await axios.get(`${BASE_URL}/training/routines/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function getCurrentTrainingState(token) {
  try {
    const { data } = await axios.get(`${BASE_URL}/training/routines/current`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  } catch {
    const { data } = await axios.get(`${BASE_URL}/training/plans/current`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  }
}

export async function startRoutineDay(token, dayId) {
  const { data } = await axios.post(
    `${BASE_URL}/training/routines/${dayId}/start`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function recordRoutineReps(token, dayId, payload = {}) {
  const { data } = await axios.post(
    `${BASE_URL}/training/routines/${dayId}/exercise/reps`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function completeRoutineSet(token, dayId, payload = {}) {
  const { data } = await axios.post(
    `${BASE_URL}/training/routines/${dayId}/exercise/set-complete`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function completeRoutineDay(token, dayId, payload = {}) {
  const { data } = await axios.post(
    `${BASE_URL}/training/routines/${dayId}/complete`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

/**
 * @deprecated Usa getTrainingPlans. Mantiene compatibilidad con código antiguo.
 */
export async function getTrainingPlan(token, frequency = 'media') {
  const { data } = await axios.get(`${BASE_URL}/training/plan`, {
    params: { frequency },
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

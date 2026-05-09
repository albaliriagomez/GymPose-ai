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
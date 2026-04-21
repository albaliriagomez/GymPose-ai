import { useState, useEffect, useCallback } from 'react'
import api from '../services/authService'

export const useNutrition = () => {
  const [meals, setMeals] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMeals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/nutrition/meals')
      setMeals(data.meals ?? [])
      setLastUpdated(data.lastUpdated ?? null)
    } catch (err) {
      //401 lo maneja el interceptor de authService (redirige a /login) aquí solo capturamos errores reales (404, 500, red caída, etc.)
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
        ? detail.map(d => d.msg || String(d)).join(', ')
        : 'No se pudieron cargar las comidas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  return { meals, lastUpdated, loading, error, refetch: fetchMeals }
}
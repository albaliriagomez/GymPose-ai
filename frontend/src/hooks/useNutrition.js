import { useCallback, useEffect, useState } from "react";
import api from "../services/authService";

const FALLBACK_TIP = {
  title: "Hidratacion Inteligente",
  tip: "Mantente hidratado durante el dia. Beber suficiente agua mejora tu rendimiento y recuperacion muscular.",
};

export const useNutrition = () => {
  const [meals, setMeals] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({ incomplete: true });
  const [profileLoading, setProfileLoading] = useState(true);
  const [tip, setTip] = useState(FALLBACK_TIP);
  const [tipLoading, setTipLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/nutrition/meals");
      setMeals(data.meals ?? []);
      setLastUpdated(data.lastUpdated ?? null);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudieron cargar las comidas");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const { data } = await api.get("/nutrition/profile");
      setProfile(data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchTip = useCallback(async () => {
    setTipLoading(true);
    try {
      const { data } = await api.get("/nutrition/tip");
      setTip(data?.title && data?.tip ? data : FALLBACK_TIP);
    } catch {
      setTip(FALLBACK_TIP);
    } finally {
      setTipLoading(false);
    }
  }, []);

  const registerMeal = useCallback(
    async (payload) => {
      setActionLoading(true);
      try {
        await api.post("/nutrition/meals", payload);
        await fetchMeals();
      } finally {
        setActionLoading(false);
      }
    },
    [fetchMeals]
  );

  const suggestMeals = useCallback(
    async (force = false) => {
      setActionLoading(true);
      try {
        await api.get(`/nutrition/suggest-meals${force ? "?force=true" : ""}`);
        await fetchMeals();
        return { ok: true };
      } catch (err) {
        const payload = err.response?.data || {};
        const detail = payload?.detail;
        if (err.response?.status === 409) {
          return { conflict: true, message: payload.message || detail?.message || "Ya tienes comidas registradas hoy" };
        }
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [fetchMeals]
  );

  useEffect(() => {
    fetchMeals();
    fetchProfile();
    fetchTip();
  }, [fetchMeals, fetchProfile, fetchTip]);

  return {
    meals,
    lastUpdated,
    loading,
    error,
    refetch: fetchMeals,
    profile,
    profileLoading,
    tip,
    tipLoading,
    registerMeal,
    suggestMeals,
    actionLoading,
  };
};

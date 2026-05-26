import { useCallback } from "react";
import api from "../services/authService";

export const useTrainer = () => {
  const fetchClients = useCallback(async () => {
    const { data } = await api.get("/trainer/clients");
    return data;
  }, []);

  const fetchClientDetail = useCallback(async (userId) => {
    const { data } = await api.get(`/trainer/clients/${userId}`);
    return data;
  }, []);

  const fetchAiAnalysis = useCallback(async (userId) => {
    const { data } = await api.get(`/trainer/ai-analysis/${userId}`);
    return data;
  }, []);

  const fetchNutritionHistory = useCallback(async (userId) => {
    const { data } = await api.get(`/trainer/clients/${userId}/nutrition-history`);
    return data;
  }, []);

  return {
    fetchClients,
    fetchClientDetail,
    fetchAiAnalysis,
    fetchNutritionHistory,
  };
};

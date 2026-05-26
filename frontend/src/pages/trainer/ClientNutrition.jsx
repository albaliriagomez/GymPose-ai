import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTrainer } from "../../hooks/useTrainer";

function SkeletonBlock({ className = "" }) {
  return <div className={`rounded-lg border border-gym-border bg-gym-card animate-pulse ${className}`} />;
}

function ErrorState({ message }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-900/10 p-5 text-sm text-red-300">
      {message || "No se pudo cargar el plan nutricional."}
    </div>
  );
}

function shortDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short" }).format(date);
}

function bestStreak(history) {
  let best = 0;
  let current = 0;
  history.forEach((day) => {
    if (Number(day.total_kcal || 0) >= Number(day.objetivo_kcal || 0) * 0.9) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

export default function ClientNutrition() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fetchClientDetail, fetchNutritionHistory } = useTrainer();
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([fetchClientDetail(id), fetchNutritionHistory(id)])
      .then(([detail, nutritionHistory]) => {
        setClient(detail);
        setHistory(nutritionHistory || []);
      })
      .catch((err) => setError(err.response?.data?.detail || "No se pudo cargar el plan nutricional"))
      .finally(() => setLoading(false));
  }, [fetchClientDetail, fetchNutritionHistory, id]);

  const summary = useMemo(() => {
    if (!history.length) return { average: 0, completedDays: 0, streak: 0, objective: 0 };
    const total = history.reduce((acc, day) => acc + Number(day.total_kcal || 0), 0);
    const completedDays = history.filter((day) => Number(day.total_kcal || 0) >= Number(day.objetivo_kcal || 0) * 0.9).length;
    return {
      average: Math.round(total / history.length),
      completedDays,
      streak: bestStreak(history),
      objective: history[history.length - 1]?.objetivo_kcal || 0,
    };
  }, [history]);

  const chartData = history.map((day) => ({
    fecha: shortDate(day.fecha),
    kcal: Math.round(Number(day.total_kcal || 0)),
    objetivo: Number(day.objetivo_kcal || 0),
  }));

  return (
    <div className="min-h-screen bg-gym-bg p-5 text-gym-text md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-gym-muted">Panel entrenador</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-white">
              Plan Nutricional — {loading ? "Cargando..." : client?.name || "Cliente"}
            </h1>
          </div>
          <button
            onClick={() => navigate("/trainer/dashboard")}
            className="rounded-xl border border-gym-border bg-gym-accent px-4 py-2.5 text-sm font-mono text-gym-muted hover:text-white"
          >
            ← Volver
          </button>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SkeletonBlock className="h-28" />
              <SkeletonBlock className="h-28" />
              <SkeletonBlock className="h-28" />
            </div>
            <SkeletonBlock className="h-80" />
            <SkeletonBlock className="h-64" />
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
                <p className="text-xs font-mono text-gym-muted">Kcal promedio</p>
                <p className="mt-2 font-display text-4xl font-extrabold text-white">{summary.average}</p>
              </div>
              <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
                <p className="text-xs font-mono text-gym-muted">Días en objetivo</p>
                <p className="mt-2 font-display text-4xl font-extrabold text-gym-green">{summary.completedDays}</p>
              </div>
              <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
                <p className="text-xs font-mono text-gym-muted">Mejor racha</p>
                <p className="mt-2 font-display text-4xl font-extrabold text-gym-cyan">{summary.streak}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
              <h2 className="mb-4 font-display text-xl font-bold text-white">Kcal por día últimos 30 días</h2>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="fecha" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e2d45", borderRadius: 8 }} />
                    <ReferenceLine y={summary.objective} stroke="#ffd60a" strokeDasharray="5 5" />
                    <Bar dataKey="kcal" fill="#00e5ff" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
              <h2 className="mb-4 font-display text-xl font-bold text-white">Comidas del mes</h2>
              <div className="space-y-4">
                {history.map((day) => (
                  <div key={day.fecha} className="rounded-xl border border-gym-border bg-gym-card p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-white">{shortDate(day.fecha)}</h3>
                      <span className="text-sm font-mono text-gym-cyan">{Math.round(day.total_kcal || 0)} / {day.objetivo_kcal} kcal</span>
                    </div>
                    {day.comidas?.length ? (
                      <div className="space-y-2">
                        {day.comidas.map((meal) => (
                          <div key={meal.id} className="flex items-center justify-between gap-4 rounded-lg bg-gym-accent px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">{meal.name}</p>
                              <p className="truncate text-xs text-gym-muted">{meal.description || "Sin descripción"}</p>
                            </div>
                            <span className="flex-shrink-0 text-sm text-gym-cyan">{Math.round(meal.kcal || 0)} kcal</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gym-muted">Sin comidas registradas</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

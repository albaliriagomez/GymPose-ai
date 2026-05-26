import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/authContext.js";
import { useTrainer } from "../hooks/useTrainer";

const statusStyles = {
  objetivo_cumplido: {
    label: "✓ En objetivo",
    badge: "bg-gym-green/10 text-gym-green border-gym-green/25",
    avatar: "bg-gym-green/15 text-gym-green border-gym-green/30",
    bar: "bg-gym-green",
  },
  en_progreso: {
    label: "→ En progreso",
    badge: "bg-gym-cyan/10 text-gym-cyan border-gym-cyan/25",
    avatar: "bg-gym-cyan/15 text-gym-cyan border-gym-cyan/30",
    bar: "bg-gym-cyan",
  },
  necesita_atencion: {
    label: "⚠ Atención",
    badge: "bg-orange-400/10 text-orange-300 border-orange-300/25",
    avatar: "bg-orange-400/15 text-orange-300 border-orange-300/30",
    bar: "bg-orange-300",
  },
};

const macroColors = {
  proteina: "#00e5ff",
  carbos: "#00ff88",
  grasas: "#fb923c",
};

const navItems = [
  { id: "panel", label: "Panel", icon: <GridIcon /> },
  { id: "clientes", label: "Mis Clientes", icon: <UsersIcon /> },
  { id: "ia", label: "Análisis IA", icon: <SparkIcon /> },
];

function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}

function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

function SparkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" /></svg>;
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
}

function StatusBadge({ estado }) {
  const style = statusStyles[estado] || statusStyles.en_progreso;
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-mono ${style.badge}`}>{style.label}</span>;
}

function SkeletonBlock({ className = "" }) {
  return <div className={`rounded-lg border border-gym-border bg-gym-card animate-pulse ${className}`} />;
}

function ErrorState({ message }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-900/10 p-5 text-sm text-red-300">
      {message || "No se pudieron cargar los datos. Intenta nuevamente."}
    </div>
  );
}

function EmptyClients() {
  return (
    <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-8 text-center">
      <p className="font-display text-xl font-bold text-white">Aún no tienes clientes asignados.</p>
      <p className="mt-2 text-sm text-gym-muted">Los usuarios pueden seleccionarte como entrenador desde su perfil.</p>
    </div>
  );
}

function formatActivity(value) {
  if (!value) return "Sin actividad";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin actividad";
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("es-BO", { weekday: "short" }).format(date);
}

function TrainerSidebar({ activeView, onViewChange }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-full border-b border-gym-border bg-gym-sidebar px-3 py-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r md:py-6">
      <div className="mb-5 px-3 md:mb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gym-cyan flex items-center justify-center glow-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5" className="w-5 h-5"><path d="M6 4v16M18 4v16M3 8h18M3 16h18" /></svg>
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-none tracking-wider">GymPose</div>
            <div className="mt-1 inline-flex rounded-full border border-gym-cyan/30 bg-gym-cyan/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-gym-cyan">Entrenador</div>
          </div>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-mono transition-all ${
              activeView === item.id
                ? "border border-gym-cyan/20 bg-gym-cyan/10 text-gym-cyan"
                : "text-gym-muted hover:bg-gym-accent hover:text-white"
            }`}
          >
            {item.icon}
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        onClick={() => { logout(); navigate("/login"); }}
        className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-mono text-gym-muted transition-all hover:bg-red-900/10 hover:text-red-400 md:mt-8"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
        Cerrar Sesión
      </button>
    </aside>
  );
}

function MetricCard({ label, value, accent, loading }) {
  return (
    <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
      <div className={`mb-4 h-1 w-12 rounded-full ${accent}`} />
      <p className="text-xs font-mono text-gym-muted">{label}</p>
      {loading ? <SkeletonBlock className="mt-3 h-10 w-20" /> : <p className="mt-2 font-display text-4xl font-extrabold text-white">{value}</p>}
    </div>
  );
}

function PanelView({ clients, loading, error }) {
  const metrics = useMemo(() => ({
    active: clients.length,
    completed: clients.filter((client) => client.estado === "objetivo_cumplido").length,
    deficit: clients.filter((client) => Number(client.kcal_hoy || 0) < Number(client.objetivo_kcal || 0)).length,
    attention: clients.filter((client) => client.estado === "necesita_atencion").length,
  }), [clients]);

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clientes activos" value={metrics.active} accent="bg-gym-cyan" loading={loading} />
        <MetricCard label="Cumplieron objetivo hoy" value={metrics.completed} accent="bg-gym-green" loading={loading} />
        <MetricCard label="En déficit calórico" value={metrics.deficit} accent="bg-orange-300" loading={loading} />
        <MetricCard label="Necesitan atención" value={metrics.attention} accent="bg-gym-yellow" loading={loading} />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-20" />)}</div>
      ) : clients.length === 0 ? (
        <EmptyClients />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-gym-border bg-gym-sidebar">
          <div className="border-b border-gym-border px-5 py-4">
            <h2 className="font-display text-xl font-bold text-white">Clientes recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gym-card text-xs uppercase tracking-widest text-gym-muted">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Objetivo</th>
                  <th className="px-5 py-3">Kcal hoy</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 5).map((client) => (
                  <tr key={client.id} className="border-t border-gym-border/70">
                    <td className="px-5 py-4 font-display font-bold text-white">{client.name}</td>
                    <td className="px-5 py-4 text-gym-muted">{client.goal || "Sin objetivo"}</td>
                    <td className="px-5 py-4 text-gym-text">{Math.round(client.kcal_hoy || 0)} / {client.objetivo_kcal}</td>
                    <td className="px-5 py-4"><StatusBadge estado={client.estado} /></td>
                    <td className="px-5 py-4 text-gym-muted">{formatActivity(client.ultima_actividad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ClientsView({ clients, loading, error, onSelect }) {
  if (error) return <ErrorState message={error} />;
  if (loading) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <SkeletonBlock key={item} className="h-64" />)}</div>;
  if (clients.length === 0) return <EmptyClients />;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => {
        const pct = Math.min(100, Math.round(((client.kcal_hoy || 0) / (client.objetivo_kcal || 1)) * 100));
        const style = statusStyles[client.estado] || statusStyles.en_progreso;
        const macros = client.macros_hoy || {};
        return (
          <article key={client.id} className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border font-display font-extrabold ${style.avatar}`}>
                {initials(client.name)}
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-bold text-white">{client.name}</h3>
                <p className="truncate text-sm text-gym-muted">{client.goal || "Sin objetivo"}</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex justify-between text-xs font-mono text-gym-muted">
                <span>{Math.round(client.kcal_hoy || 0)} kcal</span>
                <span>{client.objetivo_kcal} kcal</span>
              </div>
              <div className="h-2 rounded-full bg-gym-accent">
                <div className={`h-2 rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="rounded-lg bg-gym-card py-2 text-gym-muted">P <span className="text-white">{Math.round(macros.proteina || 0)}g</span></div>
              <div className="rounded-lg bg-gym-card py-2 text-gym-muted">C <span className="text-white">{Math.round(macros.carbos || 0)}g</span></div>
              <div className="rounded-lg bg-gym-card py-2 text-gym-muted">G <span className="text-white">{Math.round(macros.grasas || 0)}g</span></div>
            </div>

            <button
              onClick={() => onSelect(client)}
              className="w-full rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2.5 font-display text-sm font-bold text-gym-cyan transition-all hover:bg-gym-cyan/20"
            >
              Ver detalle
            </button>
          </article>
        );
      })}
    </div>
  );
}

function ClientSlideOver({ client, onClose }) {
  const navigate = useNavigate();
  const { fetchClientDetail, fetchNutritionHistory } = useTrainer();
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client?.id) return;
    setLoading(true);
    setError("");
    Promise.all([fetchClientDetail(client.id), fetchNutritionHistory(client.id)])
      .then(([detailData, historyData]) => {
        setDetail(detailData);
        setHistory(historyData);
      })
      .catch((err) => setError(err.response?.data?.detail || "No se pudo cargar el detalle del cliente"))
      .finally(() => setLoading(false));
  }, [client?.id, fetchClientDetail, fetchNutritionHistory]);

  if (!client) return null;

  const style = statusStyles[client.estado] || statusStyles.en_progreso;
  const caloriesData = (detail?.kcal_history || []).map((item) => ({
    fecha: shortDate(item.fecha),
    kcal: item.kcal_consumidas,
    objetivo: item.objetivo_kcal,
  }));
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayHistory = history.find((item) => item.fecha === todayKey);
  const macros = todayHistory?.macros || client.macros_hoy || {};
  const macroData = [
    { name: "Proteína", value: Number(macros.proteina || 0), color: macroColors.proteina },
    { name: "Carbos", value: Number(macros.carbos || 0), color: macroColors.carbos },
    { name: "Grasas", value: Number(macros.grasas || 0), color: macroColors.grasas },
  ];
  const hasMacros = macroData.some((item) => item.value > 0);
  const meals = detail?.latest_meals || [];

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-30 w-full border-l border-gym-border bg-gym-sidebar shadow-2xl transition-transform md:w-[40vw]">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-gym-border p-5">
          <div className="flex min-w-0 gap-3">
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border font-display text-xl font-extrabold ${style.avatar}`}>
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl font-bold text-white">{client.name}</h2>
              <p className="truncate text-sm text-gym-muted">{client.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-gym-border bg-gym-card px-2.5 py-1 text-xs text-gym-cyan">{client.goal || "Sin objetivo"}</span>
                <StatusBadge estado={client.estado} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-gym-muted hover:bg-gym-accent hover:text-white">X</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-4">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-48" />
              <SkeletonBlock className="h-44" />
              <SkeletonBlock className="h-32" />
            </div>
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gym-border bg-gym-card p-4">
                <p className="text-xs font-mono text-gym-muted">Objetivo calórico diario</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-white">{client.objetivo_kcal} kcal</p>
              </div>

              <section className="rounded-2xl border border-gym-border bg-gym-card p-4">
                <h3 className="mb-3 font-display font-bold text-white">Calorías últimos 7 días</h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={caloriesData}>
                      <XAxis dataKey="fecha" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e2d45", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="kcal" stroke="#00e5ff" strokeWidth={2.5} dot={false} name="Kcal" />
                      <Line type="monotone" dataKey="objetivo" stroke="#ffd60a" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Objetivo" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-gym-border bg-gym-card p-4">
                <h3 className="mb-3 font-display font-bold text-white">Distribución de macros de hoy</h3>
                {hasMacros ? (
                  <>
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={macroData} dataKey="value" innerRadius={42} outerRadius={68} paddingAngle={3}>
                            {macroData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e2d45", borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      {macroData.map((item) => (
                        <div key={item.name} className="rounded-lg bg-gym-accent py-2 text-gym-muted">
                          <span style={{ color: item.color }}>{item.name}</span>
                          <span className="block text-white">{Math.round(item.value)}g</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-gym-muted">Sin macros registrados hoy</p>
                )}
              </section>

              <section className="rounded-2xl border border-gym-border bg-gym-card p-4">
                <h3 className="mb-3 font-display font-bold text-white">Últimas comidas</h3>
                {meals.length ? (
                  <div className="space-y-2">
                    {meals.slice(0, 5).map((meal) => (
                      <div key={meal.id} className="rounded-xl bg-gym-accent px-3 py-2">
                        <div className="flex justify-between gap-3">
                          <p className="font-display font-bold text-white">{meal.name}</p>
                          <span className="text-sm text-gym-cyan">{Math.round(meal.kcal || 0)} kcal</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-gym-muted">{meal.description || "Sin descripción"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-gym-muted">Sin comidas registradas hoy</p>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="border-t border-gym-border p-5">
          <div className="grid gap-3">
            <button onClick={() => navigate(`/trainer/clients/${client.id}/nutrition`)} className="rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-3 text-left font-display font-bold text-gym-cyan hover:bg-gym-cyan/20">
              Ver plan nutricional completo →
            </button>
            <button onClick={() => navigate(`/trainer/clients/${client.id}/training`)} className="rounded-xl border border-gym-border bg-gym-accent px-4 py-3 text-left font-display font-bold text-white hover:border-gym-cyan/30">
              Ver plan de entrenamiento →
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AnalysisSkeleton() {
  return (
    <section className="rounded-2xl border border-gym-cyan bg-gym-card p-6 animate-pulse">
      <p className="mb-4 text-sm text-gym-cyan">Analizando datos del cliente...</p>
      <div className="h-5 w-2/3 rounded bg-gym-border mb-3" />
      <div className="h-4 w-full rounded bg-gym-border mb-2" />
      <div className="h-4 w-4/5 rounded bg-gym-border" />
    </section>
  );
}

function AnalysisView({ clients, loading, error }) {
  const { fetchAiAnalysis } = useTrainer();
  const [clientId, setClientId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    if (!clientId && clients.length) setClientId(clients[0].id);
  }, [clientId, clients]);

  const handleGenerate = async () => {
    if (!clientId) return;
    setAnalysis(null);
    setAnalysisError("");
    setAnalysisLoading(true);
    const startedAt = Date.now();
    try {
      const data = await fetchAiAnalysis(clientId);
      setAnalysis(data);
    } catch (err) {
      setAnalysisError(err.response?.data?.detail || "No se pudo generar el análisis. Intenta nuevamente.");
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 3000) {
        await new Promise((resolve) => setTimeout(resolve, 3000 - elapsed));
      }
      setAnalysisLoading(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <AnalysisSkeleton />;
  if (clients.length === 0) return <EmptyClients />;

  return (
    <div className="max-w-3xl space-y-5">
      <section className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={clientId}
            onChange={(event) => { setClientId(event.target.value); setAnalysis(null); setAnalysisError(""); }}
            className="rounded-xl border border-gym-border bg-gym-accent px-4 py-3 text-white outline-none focus:border-gym-cyan"
          >
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <button
            onClick={handleGenerate}
            disabled={analysisLoading}
            className="rounded-xl px-5 py-3 font-display font-bold text-gym-bg transition-all hover:scale-[1.02] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#ffd60a,#00e5ff)" }}
          >
            {analysisLoading ? "Generando..." : "Generar análisis"}
          </button>
        </div>
      </section>

      {analysisLoading && <AnalysisSkeleton />}
      {analysisError && <ErrorState message={analysisError} />}
      {analysis && (
        <section className="rounded-2xl border border-gym-cyan bg-gym-card p-6">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-gym-cyan">Análisis IA</p>
          <p className="leading-relaxed text-gym-text">{analysis.resumen}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <AnalysisList title="Puntos positivos" color="text-gym-green" icon="✓" items={analysis.puntos_positivos} />
            <AnalysisList title="Áreas de mejora" color="text-gym-yellow" icon="→" items={analysis.areas_mejora} />
            <AnalysisList title="Recomendaciones" color="text-gym-cyan" icon="•" items={analysis.recomendaciones} />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs font-mono text-gym-muted">
              <span>Nivel de adherencia</span>
              <span className="text-white">{analysis.nivel_adherencia || 0}%</span>
            </div>
            <div className="h-3 rounded-full bg-gym-accent">
              <div className="h-3 rounded-full bg-gym-cyan" style={{ width: `${Math.min(100, analysis.nivel_adherencia || 0)}%` }} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AnalysisList({ title, color, icon, items = [] }) {
  return (
    <div className="rounded-xl border border-gym-border bg-gym-sidebar p-4">
      <h3 className={`mb-3 font-display font-bold ${color}`}>{title}</h3>
      <ul className="space-y-2 text-sm text-gym-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={color}>{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { fetchClients } = useTrainer();
  const [activeView, setActiveView] = useState("panel");
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const today = useMemo(() => new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date()), []);

  useEffect(() => {
    setClientsLoading(true);
    setClientsError("");
    fetchClients()
      .then((data) => setClients(data || []))
      .catch((err) => setClientsError(err.response?.data?.detail || "No se pudieron cargar los clientes"))
      .finally(() => setClientsLoading(false));
  }, [fetchClients]);

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text md:flex">
      <TrainerSidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-y-auto p-5 md:p-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-gym-muted">Buen día, {user?.name || "Entrenador"}</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold text-white">
              {activeView === "panel" && "Panel"}
              {activeView === "clientes" && "Mis Clientes"}
              {activeView === "ia" && "Análisis IA"}
            </h1>
          </div>
          <p className="text-sm capitalize text-gym-muted">{today}</p>
        </header>

        {activeView === "panel" && <PanelView clients={clients} loading={clientsLoading} error={clientsError} />}
        {activeView === "clientes" && <ClientsView clients={clients} loading={clientsLoading} error={clientsError} onSelect={setSelectedClient} />}
        {activeView === "ia" && <AnalysisView clients={clients} loading={clientsLoading} error={clientsError} />}
      </main>
      {selectedClient && <ClientSlideOver client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}

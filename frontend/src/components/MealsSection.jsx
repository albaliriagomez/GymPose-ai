import React, { useMemo, useState } from "react";
import MealCard from "./MealCard";

const MEAL_EMOJIS = { Desayuno: "🥣", Almuerzo: "🍽️", Cena: "🌙", Snack: "🥑" };

const now12h = () => {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const MealsSection = ({ meals, lastUpdated, loading, error, refetch, registerMeal, suggestMeals, updateMealStatus, actionLoading }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", hora: now12h(), name: "Desayuno" });
  const [optimisticStatus, setOptimisticStatus] = useState({});
  const [togglingId, setTogglingId] = useState(null);

  const mealsWithStatus = useMemo(
    () => meals.map((m) => ({ ...m, status: optimisticStatus[m.id] ?? m.status })),
    [meals, optimisticStatus]
  );

  const totals = useMemo(
    () =>
      mealsWithStatus.reduce(
        (acc, m) => ({
          proteina: acc.proteina + (m.macros?.proteina ?? 0),
          carbos: acc.carbos + (m.macros?.carbos ?? 0),
          grasas: acc.grasas + (m.macros?.grasas ?? 0),
          kcal: acc.kcal + (m.kcal ?? 0),
        }),
        { proteina: 0, carbos: 0, grasas: 0, kcal: 0 }
      ),
    [mealsWithStatus]
  );

  const onRegister = async () => {
    if (!form.description.trim()) return;
    await registerMeal({ name: form.name, description: form.description, hora: form.hora, ai_suggested: false });
    setOpen(false);
    setForm({ description: "", hora: now12h(), name: "Desayuno" });
  };

  const onSuggest = async () => {
    const result = await suggestMeals(false);
    if (result?.conflict) {
      const confirmReplace = window.confirm("Ya tienes comidas registradas. ¿Reemplazar con el plan de IA?");
      if (confirmReplace) await suggestMeals(true);
    }
  };

  const onToggleStatus = async (id, status) => {
    const previous = mealsWithStatus.find((m) => m.id === id)?.status ?? "pending";
    setOptimisticStatus((state) => ({ ...state, [id]: status }));
    setTogglingId(id);
    try {
      await updateMealStatus(id, status);
      setOptimisticStatus((state) => {
        const next = { ...state };
        delete next[id];
        return next;
      });
    } catch {
      setOptimisticStatus((state) => ({ ...state, [id]: previous }));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="mt-8 animate-fadeInUp animation-delay-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gym-text">Comidas del dia</h2>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-[10px] text-gym-muted uppercase tracking-wider">Ultima actualizacion: {lastUpdated}</span>}
          <button className="text-xs font-semibold text-gym-yellow border border-gym-yellow/30 px-3 py-1.5 rounded-lg bg-gym-yellow/5 hover:bg-gym-yellow/10 transition-all duration-200 disabled:opacity-50" disabled={actionLoading} onClick={onSuggest}>✨ Generar plan con IA</button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gym-cyan border border-gym-cyan/30 px-3 py-1.5 rounded-lg bg-gym-cyan/5 hover:bg-gym-cyan/10 transition-all duration-200" onClick={() => setOpen(true)}>Registrar comida</button>
        </div>
      </div>

      {loading && <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-gym-card border border-gym-border animate-pulse" />)}</div>}
      {!loading && error && <div className="flex flex-col items-center gap-3 py-8 text-center"><span className="text-gym-muted text-sm">{error}</span><button onClick={refetch} className="text-xs font-semibold text-gym-cyan border border-gym-cyan/30 px-3 py-1.5 rounded-lg bg-gym-cyan/5 hover:bg-gym-cyan/10 transition-all duration-200">Reintentar</button></div>}
      {!loading && !error && mealsWithStatus.length === 0 && <div className="py-8 text-center"><span className="text-gym-muted text-sm">No hay comidas registradas hoy.</span></div>}
      {!loading && !error && mealsWithStatus.length > 0 && <div className="flex flex-col gap-3">{mealsWithStatus.map((meal, i) => <div key={meal.id} className="animate-fadeInUp" style={{ animationDelay: `${0.1 + i * 0.08}s` }}><MealCard {...meal} emoji={MEAL_EMOJIS[meal.name] ?? "🍽️"} onToggleStatus={onToggleStatus} toggling={togglingId === meal.id} /></div>)}</div>}

      {!loading && !error && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gym-card border border-gym-border">
          <span className="text-xs text-gym-muted">Macros consumidos hoy</span>
          <div className="flex items-center gap-5">
            <MacroSummaryItem label="Proteina" value={`${Math.round(totals.proteina)}g`} color="text-gym-cyan" />
            <MacroSummaryItem label="Carbos" value={`${Math.round(totals.carbos)}g`} color="text-gym-yellow" />
            <MacroSummaryItem label="Grasas" value={`${Math.round(totals.grasas)}g`} color="text-red-400" />
            <div className="w-px h-6 bg-gym-border" />
            <MacroSummaryItem label="Consumido" value={`${Math.round(totals.kcal)} kcal`} color="text-gym-text" />
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gym-sidebar border border-gym-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold text-white text-lg">Registrar comida</h3>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">¿Que comiste?</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej: 2 huevos revueltos con pan integral" className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan" />
            </div>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Hora</label>
              <input value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan" />
            </div>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Tipo de comida</label>
              <select value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan">
                <option>Desayuno</option><option>Almuerzo</option><option>Cena</option><option>Snack</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="text-xs font-mono text-gym-muted border border-gym-border bg-gym-accent px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={onRegister} disabled={actionLoading} className="text-xs font-mono text-gym-bg font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: "linear-gradient(135deg,#00e5ff,#00b8d4)" }}>{actionLoading ? "Registrando..." : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MacroSummaryItem = ({ label, value, color }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className={`text-sm font-bold ${color}`}>{value}</span>
    <span className="text-[10px] text-gym-muted uppercase tracking-wide">{label}</span>
  </div>
);

export default MealsSection;

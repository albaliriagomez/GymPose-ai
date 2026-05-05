import React, { useMemo, useState } from "react";
import MealCard from "./MealCard";

const MEAL_EMOJIS = { Desayuno: "🥣", Almuerzo: "🍽️", Cena: "🌙", Snack: "🥑" };

const now12h = () => {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const MealsSection = ({
  meals,
  lastUpdated,
  loading,
  error,
  refetch,
  registerMeal,
  suggestMeals,
  updateMealStatus,
  updateMealDetails,
  deleteMeal,
  regenerateMeal,
  getMealRecipe,
  getDailySummary,
  actionLoading,
}) => {
  const [openRegister, setOpenRegister] = useState(false);
  const [form, setForm] = useState({ description: "", hora: now12h(), name: "Desayuno" });
  const [optimisticStatus, setOptimisticStatus] = useState({});
  const [togglingId, setTogglingId] = useState(null);

  const [detailMealId, setDetailMealId] = useState(null);
  const [detailForm, setDetailForm] = useState({ description: "", hora: "" });
  const [savingDetail, setSavingDetail] = useState(false);
  const [deletingDetail, setDeletingDetail] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState("");
  const [recipeData, setRecipeData] = useState(null);

  const [regenerateOpenFor, setRegenerateOpenFor] = useState(null);
  const [ingredientes, setIngredientes] = useState("");
  const [regeneratingId, setRegeneratingId] = useState(null);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryData, setSummaryData] = useState(null);

  const mealsWithStatus = useMemo(
    () => meals.map((m) => ({ ...m, status: optimisticStatus[m.id] ?? m.status })),
    [meals, optimisticStatus]
  );

  const detailMeal = useMemo(() => mealsWithStatus.find((m) => m.id === detailMealId) || null, [mealsWithStatus, detailMealId]);

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
    setOpenRegister(false);
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

  const openDetail = (meal) => {
    setDetailMealId(meal.id);
    setDetailForm({ description: meal.description || "", hora: meal.time || now12h() });
    setRecipeOpen(false);
    setRecipeData(null);
    setRecipeError("");
  };

  const onSaveDetail = async () => {
    if (!detailMeal) return;
    setSavingDetail(true);
    try {
      await updateMealDetails(detailMeal.id, { description: detailForm.description, hora: detailForm.hora });
      setDetailMealId(null);
    } finally {
      setSavingDetail(false);
    }
  };

  const onDeleteDetail = async () => {
    if (!detailMeal) return;
    const ok = window.confirm("¿Seguro?");
    if (!ok) return;
    setDeletingDetail(true);
    try {
      await deleteMeal(detailMeal.id);
      setDetailMealId(null);
    } finally {
      setDeletingDetail(false);
    }
  };

  const onLoadRecipe = async () => {
    if (!detailMeal) return;
    setRecipeOpen(true);
    setRecipeLoading(true);
    setRecipeError("");
    try {
      const data = await getMealRecipe(detailMeal.id);
      setRecipeData(data);
    } catch {
      setRecipeError("No se pudo obtener la receta. Intenta de nuevo.");
    } finally {
      setRecipeLoading(false);
    }
  };

  const onRegenerate = async (mealId) => {
    setRegeneratingId(mealId);
    try {
      await regenerateMeal(mealId, ingredientes);
      setRegenerateOpenFor(null);
      setIngredientes("");
    } finally {
      setRegeneratingId(null);
    }
  };

  const onAnalyzeDay = async () => {
    if (mealsWithStatus.length === 0) {
      setSummaryOpen(true);
      setSummaryData(null);
      setSummaryError("Registra tus comidas primero para obtener un análisis.");
      return;
    }
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await getDailySummary();
      setSummaryData(data);
    } catch {
      setSummaryError("No se pudo generar el análisis del día. Intenta de nuevo.");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="mt-8 animate-fadeInUp animation-delay-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gym-text">Comidas del dia</h2>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-[10px] text-gym-muted uppercase tracking-wider">Ultima actualizacion: {lastUpdated}</span>}
          <button className="text-xs font-semibold text-gym-yellow border border-gym-yellow/30 px-3 py-1.5 rounded-lg bg-gym-yellow/5 hover:bg-gym-yellow/10 transition-all duration-200 disabled:opacity-50" disabled={actionLoading} onClick={onSuggest}>✨ Generar plan con IA</button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gym-cyan border border-gym-cyan/30 px-3 py-1.5 rounded-lg bg-gym-cyan/5 hover:bg-gym-cyan/10 transition-all duration-200" onClick={() => setOpenRegister(true)}>Registrar comida</button>
        </div>
      </div>

      {loading && <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-gym-card border border-gym-border animate-pulse" />)}</div>}
      {!loading && error && <div className="flex flex-col items-center gap-3 py-8 text-center"><span className="text-gym-muted text-sm">{error}</span><button onClick={refetch} className="text-xs font-semibold text-gym-cyan border border-gym-cyan/30 px-3 py-1.5 rounded-lg bg-gym-cyan/5 hover:bg-gym-cyan/10 transition-all duration-200">Reintentar</button></div>}
      {!loading && !error && mealsWithStatus.length === 0 && <div className="py-8 text-center"><span className="text-gym-muted text-sm">No hay comidas registradas hoy.</span></div>}

      {!loading && !error && mealsWithStatus.length > 0 && (
        <div className="flex flex-col gap-3">
          {mealsWithStatus.map((meal, i) => (
            <div key={meal.id} className="relative animate-fadeInUp" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <MealCard
                {...meal}
                emoji={MEAL_EMOJIS[meal.name] ?? "🍽️"}
                onToggleStatus={onToggleStatus}
                toggling={togglingId === meal.id}
                onOpenDetail={() => openDetail(meal)}
                onRegenerate={() => setRegenerateOpenFor(regenerateOpenFor === meal.id ? null : meal.id)}
                regenerating={regeneratingId === meal.id}
              />
              {regenerateOpenFor === meal.id && (
                <div className="mt-2 p-3 rounded-lg border border-gym-border bg-gym-sidebar">
                  <p className="text-xs text-gym-muted mb-2">¿Con qué ingredientes cuentas? (opcional)</p>
                  <input
                    value={ingredientes}
                    onChange={(e) => setIngredientes(e.target.value)}
                    placeholder="Ej: pollo, arroz, brócoli..."
                    className="w-full bg-gym-accent border border-gym-border rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gym-cyan"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => onRegenerate(meal.id)}
                      disabled={regeneratingId === meal.id}
                      className="text-xs font-semibold text-gym-cyan border border-gym-cyan/30 px-3 py-1.5 rounded-lg bg-gym-cyan/5 hover:bg-gym-cyan/10 transition-all disabled:opacity-50"
                    >
                      {regeneratingId === meal.id ? "Regenerando..." : "Regenerar con IA"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
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

          <div className="mt-3">
            <button onClick={onAnalyzeDay} className="text-xs font-semibold text-gym-yellow border border-gym-yellow/30 px-3 py-1.5 rounded-lg bg-gym-yellow/5 hover:bg-gym-yellow/10 transition-all">
              ✨ Analizar mi día
            </button>
          </div>

          {summaryOpen && (
            <div className="mt-3 rounded-lg border border-gym-cyan bg-gym-card p-4">
              {summaryLoading && <p className="text-sm text-gym-muted">Analizando...</p>}
              {!summaryLoading && summaryError && <p className="text-sm text-gym-muted">{summaryError}</p>}
              {!summaryLoading && summaryData && (
                <>
                  <h3 className="text-lg font-bold text-gym-yellow mb-2">{summaryData.titulo}</h3>
                  <p className="text-sm text-gym-text leading-relaxed">{summaryData.analisis}</p>
                </>
              )}
            </div>
          )}
        </>
      )}

      {openRegister && (
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
              <button onClick={() => setOpenRegister(false)} className="text-xs font-mono text-gym-muted border border-gym-border bg-gym-accent px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={onRegister} disabled={actionLoading} className="text-xs font-mono text-gym-bg font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: "linear-gradient(135deg,#00e5ff,#00b8d4)" }}>{actionLoading ? "Registrando..." : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      {detailMeal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-gym-sidebar border border-gym-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold text-white text-lg">{detailMeal.name}</h3>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Descripción</label>
              <input value={detailForm.description} onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan" />
            </div>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Hora</label>
              <input value={detailForm.hora} onChange={(e) => setDetailForm({ ...detailForm, hora: e.target.value })} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan" />
            </div>
            <div className="text-xs text-gym-muted border border-gym-border rounded-xl p-3 bg-gym-accent">
              <p>Proteína: {Math.round(detailMeal.macros?.proteina || 0)}g</p>
              <p>Carbos: {Math.round(detailMeal.macros?.carbos || 0)}g</p>
              <p>Grasas: {Math.round(detailMeal.macros?.grasas || 0)}g</p>
              <p>Kcal: {Math.round(detailMeal.kcal || 0)}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={onLoadRecipe} className="text-xs font-mono text-gym-yellow border border-gym-yellow/30 bg-gym-yellow/5 px-3 py-1.5 rounded-lg">📋 Ver receta y preparación</button>
              <button onClick={onDeleteDetail} disabled={deletingDetail} className="text-xs font-mono text-red-300 border border-red-500/30 bg-red-500/10 px-3 py-1.5 rounded-lg disabled:opacity-50">{deletingDetail ? "Eliminando..." : "Eliminar comida"}</button>
              <button onClick={() => setDetailMealId(null)} className="text-xs font-mono text-gym-muted border border-gym-border bg-gym-accent px-3 py-1.5 rounded-lg">Cerrar</button>
              <button onClick={onSaveDetail} disabled={savingDetail} className="text-xs font-mono text-gym-bg font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: "linear-gradient(135deg,#00e5ff,#00b8d4)" }}>{savingDetail ? "Guardando..." : "Guardar cambios"}</button>
            </div>
            {recipeOpen && (
              <div className="border border-gym-border rounded-xl p-4 bg-gym-accent space-y-3">
                {recipeLoading && <p className="text-sm text-gym-muted">Cargando receta...</p>}
                {!recipeLoading && recipeError && <p className="text-sm text-gym-muted">{recipeError}</p>}
                {!recipeLoading && recipeData && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold text-gym-cyan mb-2">Ingredientes</h4>
                      <ul className="text-sm text-gym-text list-disc ml-5 space-y-1">
                        {(recipeData.ingredientes || []).map((it, idx) => <li key={idx}>{it}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gym-cyan mb-2">Preparación</h4>
                      <ol className="text-sm text-gym-text list-decimal ml-5 space-y-1">
                        {(recipeData.pasos || []).map((it, idx) => <li key={idx}>{it}</li>)}
                      </ol>
                    </div>
                    <p className="text-sm text-gym-yellow">Tiempo: {recipeData.tiempo_preparacion}</p>
                    <p className="text-sm text-gym-text">{recipeData.tip_nutricional}</p>
                  </>
                )}
              </div>
            )}
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

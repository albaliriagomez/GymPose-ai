import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { getProfile, updateProfile } from "../services/userService";

const goalOptions = [
  { value: "Perder grasa corporal", color: "text-gym-yellow", desc: "Reducir % de grasa y definir" },
  { value: "Mantener peso", color: "text-gym-green", desc: "Mantener composicion corporal" },
  { value: "Ganar músculo", color: "text-gym-cyan", desc: "Hipertrofia y ganancia de fuerza" },
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setUser(data);
        setForm({
          name: data.name || "",
          weight_kg: data.weight_kg || "",
          height_cm: data.height_cm || "",
          goal: data.goal || "",
          edad: data.edad || "",
          sexo: data.sexo || "",
          nivel_actividad: data.nivel_actividad || "",
          preferencia_alimentaria: data.preferencia_alimentaria || "",
          alergias: data.alergias || "",
        });
      })
      .catch((err) => console.error("ERROR:", err.response?.data || err.message));
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "El nombre es requerido";
    if (form.weight_kg !== "" && (isNaN(form.weight_kg) || Number(form.weight_kg) <= 0)) e.weight_kg = "Debe ser un numero positivo";
    if (form.height_cm !== "" && (isNaN(form.height_cm) || Number(form.height_cm) <= 0)) e.height_cm = "Debe ser un numero positivo";
    if (form.edad !== "" && (isNaN(form.edad) || Number(form.edad) <= 0)) e.edad = "Debe ser un numero positivo";
    if (form.sexo !== "" && !["masculino", "femenino"].includes(form.sexo)) e.sexo = "Selecciona una opcion valida";
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: form.name,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        goal: form.goal || null,
        edad: form.edad ? Number(form.edad) : null,
        sexo: form.sexo || null,
        nivel_actividad: form.nivel_actividad || null,
        preferencia_alimentaria: form.preferencia_alimentaria || null,
        alergias: form.alergias || null,
      });
      setUser(updated);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-gym-muted font-mono text-sm text-center py-20">Cargando perfil...</div>
      </DashboardLayout>
    );
  }

  const currentGoal = goalOptions.find((g) => g.value === user.goal);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fadeInUp">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gym-muted font-mono text-xs mb-1">CUENTA - DATOS PERSONALES</p>
            <h1 className="font-display font-bold text-3xl text-white">Mi Perfil</h1>
          </div>
          {success && <span className="text-gym-green text-xs font-mono bg-gym-green/10 border border-gym-green/20 px-3 py-1.5 rounded-lg">Guardado correctamente</span>}
        </div>

        <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gym-cyan/20 border border-gym-cyan/30 flex items-center justify-center text-gym-cyan font-display font-bold text-3xl flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-white text-xl">{user.name}</h2>
            <p className="text-gym-muted text-sm font-mono">{user.email}</p>
            {currentGoal && <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono bg-gym-accent border border-gym-border text-gym-cyan px-2.5 py-1 rounded-full">{currentGoal.value}</span>}
          </div>
          {user.goal && (
            <Link to="/plan" className="hidden sm:flex flex-col items-center gap-1.5 text-xs font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-2.5 rounded-xl hover:bg-gym-cyan/20 transition-all flex-shrink-0">
              <span className="uppercase tracking-tighter">Mi Plan</span>
            </Link>
          )}
        </div>

        <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-white text-lg">Editar Perfil</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-xs font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-1.5 rounded-lg hover:bg-gym-cyan/20 transition-all">
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); setErrors({}); }} className="text-xs font-mono text-gym-muted border border-gym-border bg-gym-accent px-3 py-1.5 rounded-lg hover:text-white transition-all">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="text-xs font-mono text-gym-bg font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg,#00e5ff,#00b8d4)" }}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Nombre</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!editing} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50" />
              {errors.name && <p className="mt-1 text-red-400 text-xs">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-gym-muted mb-1.5">Peso (kg)</label>
                <input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} disabled={!editing} min="1" className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50" />
                {errors.weight_kg && <p className="mt-1 text-red-400 text-xs">{errors.weight_kg}</p>}
              </div>
              <div>
                <label className="block text-xs font-mono text-gym-muted mb-1.5">Altura (cm)</label>
                <input type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} disabled={!editing} min="1" className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50" />
                {errors.height_cm && <p className="mt-1 text-red-400 text-xs">{errors.height_cm}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-gym-muted mb-1.5">Edad</label>
                <input type="number" value={form.edad} onChange={(e) => setForm({ ...form, edad: e.target.value })} disabled={!editing} min="1" className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50" />
                {errors.edad && <p className="mt-1 text-red-400 text-xs">{errors.edad}</p>}
              </div>
              <div>
                <label className="block text-xs font-mono text-gym-muted mb-1.5">Sexo</label>
                <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} disabled={!editing} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50">
                  <option value="">Seleccionar</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
                {errors.sexo && <p className="mt-1 text-red-400 text-xs">{errors.sexo}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gym-muted mb-2">Meta de Entrenamiento</label>
              <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} disabled={!editing} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50">
                <option value="">Seleccionar</option>
                <option value="Perder grasa corporal">Perder grasa corporal</option>
                <option value="Mantener peso">Mantener peso</option>
                <option value="Ganar músculo">Ganar músculo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Nivel de actividad física</label>
              <select value={form.nivel_actividad} onChange={(e) => setForm({ ...form, nivel_actividad: e.target.value })} disabled={!editing} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50">
                <option value="">Seleccionar</option>
                <option value="sedentario">Sedentario (poco o ningún ejercicio)</option>
                <option value="ligero">Ligero (ejercicio 1-3 días/semana)</option>
                <option value="moderado">Moderado (ejercicio 3-5 días/semana)</option>
                <option value="activo">Activo (ejercicio 6-7 días/semana)</option>
                <option value="muy_activo">Muy activo (entrenamientos intensos diarios)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Preferencia alimentaria</label>
              <select value={form.preferencia_alimentaria} onChange={(e) => setForm({ ...form, preferencia_alimentaria: e.target.value })} disabled={!editing} className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50">
                <option value="">Seleccionar</option>
                <option value="sin_restriccion">Sin restricciones</option>
                <option value="vegetariano">Vegetariano</option>
                <option value="vegano">Vegano</option>
                <option value="sin_gluten">Sin gluten</option>
                <option value="sin_lactosa">Sin lactosa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Alergias o intolerancias</label>
              <input type="text" value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} disabled={!editing} placeholder="Ej: nueces, mariscos, huevo..." className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


import { useState, useEffect } from 'react'
import { getProfile, updateProfile } from '../services/userService'

const goalOptions = [
  'Perder peso', 'Ganar músculo', 'Mejorar resistencia',
  'Mantener peso', 'Mejorar postura',
]

const activityOptions = [
  'Sedentario (poco o ningún ejercicio)',
  'Ligero (ejercicio 1-3 días/semana)',
  'Moderado (ejercicio 3-5 días/semana)',
  'Activo (ejercicio 6-7 días/semana)',
  'Muy activo (atleta profesional)',
]

const dietOptions = [
  'Sin restricciones', 'Vegetariano', 'Vegano',
  'Sin gluten', 'Sin lactosa', 'Keto', 'Paleo',
]

export default function Settings() {
  const [user, setUser]       = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({})
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getProfile().then(data => {
      setUser(data)
      setForm({
        name:                    data.name || '',
        weight_kg:               data.weight_kg || '',
        height_cm:               data.height_cm || '',
        goal:                    data.goal || '',
        edad:                    data.edad || '',
        sexo:                    data.sexo || '',
        nivel_actividad:         data.nivel_actividad || '',
        preferencia_alimentaria: data.preferencia_alimentaria || '',
        alergias:                data.alergias || '',
      })
    }).catch(console.error)
  }, [])

  const validate = () => {
    const e = {}
    if (!form.name?.trim())
      e.name = 'El nombre es requerido'
    if (form.weight_kg !== '' && (isNaN(form.weight_kg) || Number(form.weight_kg) <= 0))
      e.weight_kg = 'Debe ser un número positivo'
    if (form.height_cm !== '' && (isNaN(form.height_cm) || Number(form.height_cm) <= 0))
      e.height_cm = 'Debe ser un número positivo'
    if (form.edad !== '' && (isNaN(form.edad) || Number(form.edad) <= 0 || Number(form.edad) > 120))
      e.edad = 'Edad inválida'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const updated = await updateProfile({
        name:                    form.name,
        weight_kg:               form.weight_kg ? Number(form.weight_kg) : null,
        height_cm:               form.height_cm ? Number(form.height_cm) : null,
        goal:                    form.goal || null,
        edad:                    form.edad ? Number(form.edad) : null,
        sexo:                    form.sexo || null,
        nivel_actividad:         form.nivel_actividad || null,
        preferencia_alimentaria: form.preferencia_alimentaria || null,
        alergias:                form.alergias || null,
      })
      setUser(updated)
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const inputClass = (disabled) =>
    `w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    }`

  const imc = user?.weight_kg && user?.height_cm
    ? (user.weight_kg / Math.pow(user.height_cm / 100, 2)).toFixed(1)
    : null

  if (!user) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-gym-muted font-mono text-sm animate-pulse">Cargando perfil...</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeInUp">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-3xl text-white">Ajustes</h1>
        {success && (
          <span className="text-gym-green text-xs font-mono bg-gym-green/10 border border-gym-green/20 px-3 py-1.5 rounded-lg">
            ✓ Guardado correctamente
          </span>
        )}
      </div>

      {/* Avatar + info */}
      <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gym-cyan/20 border border-gym-cyan/30 flex items-center justify-center text-gym-cyan font-display font-bold text-3xl flex-shrink-0">
          {user.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-white text-xl">{user.name}</h2>
          <p className="text-gym-muted text-sm font-mono">{user.email}</p>
          {user.goal && (
            <span className="mt-2 inline-block text-xs font-mono bg-gym-accent border border-gym-border text-gym-cyan px-2 py-0.5 rounded-full">
              🎯 {user.goal}
            </span>
          )}
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Peso',   value: user.weight_kg ? `${user.weight_kg} kg` : '—', color: 'text-gym-cyan' },
          { label: 'Altura', value: user.height_cm ? `${user.height_cm} cm` : '—', color: 'text-gym-green' },
          { label: 'IMC',    value: imc || '—',                                     color: 'text-gym-yellow' },
          { label: 'Edad',   value: user.edad ? `${user.edad} años` : '—',          color: 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gym-sidebar border border-gym-border rounded-xl p-4 text-center">
            <p className="text-gym-muted text-xs font-mono mb-1">{label}</p>
            <p className={`font-display font-bold text-xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Formulario */}
      <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-white text-lg">Editar Perfil</h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-1.5 rounded-lg hover:bg-gym-cyan/20 transition-all">
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setErrors({}) }}
                className="text-xs font-mono text-gym-muted border border-gym-border bg-gym-accent px-3 py-1.5 rounded-lg hover:text-white transition-all">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-mono text-gym-bg font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-mono text-gym-muted mb-1.5">Nombre</label>
            <input type="text" value={form.name} onChange={set('name')}
              disabled={!editing} placeholder="Tu nombre"
              className={inputClass(!editing)} />
            {errors.name && <p className="mt-1 text-red-400 text-xs">{errors.name}</p>}
          </div>

          {/* Peso y Altura */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Peso (kg)</label>
              <input type="number" value={form.weight_kg} onChange={set('weight_kg')}
                disabled={!editing} placeholder="70" min="1"
                className={inputClass(!editing)} />
              {errors.weight_kg && <p className="mt-1 text-red-400 text-xs">{errors.weight_kg}</p>}
            </div>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Altura (cm)</label>
              <input type="number" value={form.height_cm} onChange={set('height_cm')}
                disabled={!editing} placeholder="175" min="1"
                className={inputClass(!editing)} />
              {errors.height_cm && <p className="mt-1 text-red-400 text-xs">{errors.height_cm}</p>}
            </div>
          </div>

          {/* Edad y Sexo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Edad</label>
              <input type="number" value={form.edad} onChange={set('edad')}
                disabled={!editing} placeholder="25" min="1" max="120"
                className={inputClass(!editing)} />
              {errors.edad && <p className="mt-1 text-red-400 text-xs">{errors.edad}</p>}
            </div>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Sexo</label>
              <select value={form.sexo} onChange={set('sexo')} disabled={!editing}
                className={inputClass(!editing)}>
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
          </div>

          {/* Meta */}
          <div>
            <label className="block text-xs font-mono text-gym-muted mb-1.5">Meta de Entrenamiento</label>
            <select value={form.goal} onChange={set('goal')} disabled={!editing}
              className={inputClass(!editing)}>
              <option value="">Sin meta definida</option>
              {goalOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Nivel de actividad */}
          <div>
            <label className="block text-xs font-mono text-gym-muted mb-1.5">Nivel de actividad física</label>
            <select value={form.nivel_actividad} onChange={set('nivel_actividad')}
              disabled={!editing} className={inputClass(!editing)}>
              <option value="">Seleccionar</option>
              {activityOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Preferencia alimentaria */}
          <div>
            <label className="block text-xs font-mono text-gym-muted mb-1.5">Preferencia alimentaria</label>
            <select value={form.preferencia_alimentaria} onChange={set('preferencia_alimentaria')}
              disabled={!editing} className={inputClass(!editing)}>
              <option value="">Seleccionar</option>
              {dietOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Alergias */}
          <div>
            <label className="block text-xs font-mono text-gym-muted mb-1.5">Alergias o intolerancias</label>
            <input type="text" value={form.alergias} onChange={set('alergias')}
              disabled={!editing} placeholder="Ej: nueces, mariscos, huevo..."
              className={inputClass(!editing)} />
          </div>

        </div>
      </div>

    </div>
  )
}
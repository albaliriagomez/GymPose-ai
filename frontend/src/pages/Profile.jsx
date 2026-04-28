import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { getProfile, updateProfile } from '../services/userService'
import { Link } from 'react-router-dom'


// SVG icons — sin emojis
const GoalIcon = ({ type, className = '' }) => {
  if (type === 'grasa') return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M4 6l4-4 4 4M4 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (type === 'musculo') return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M3 8c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
  // mantenimiento
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

const CheckIcon = () => (
  <svg className="w-3 h-3 text-gym-cyan ml-auto flex-shrink-0" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const goalOptions = [
  { value: 'Perder grasa corporal',  iconType: 'grasa',   color: 'text-gym-yellow', desc: 'Reducir % de grasa y definir' },
  { value: 'Aumentar masa muscular', iconType: 'musculo',  color: 'text-gym-cyan',   desc: 'Hipertrofia y ganancia de fuerza' },
  { value: 'Mantenimiento corporal', iconType: 'mantener', color: 'text-gym-green',  desc: 'Recomposición y equilibrio' },
]

export default function Profile() {
  const [user, setUser]       = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({})
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const token = localStorage.getItem('gympose_token')

  useEffect(() => {
    getProfile(token).then(data => {
      setUser(data)
      setForm({
        name:      data.name      || '',
        weight_kg: data.weight_kg || '',
        height_cm: data.height_cm || '',
        goal:      data.goal      || '',
      })
    }).catch(err => console.error('ERROR:', err.response?.data || err.message))
  }, [])

  const validate = () => {
    const e = {}
    if (!form.name?.trim()) e.name = 'El nombre es requerido'
    if (form.weight_kg !== '' && (isNaN(form.weight_kg) || Number(form.weight_kg) <= 0))
      e.weight_kg = 'Debe ser un número positivo'
    if (form.height_cm !== '' && (isNaN(form.height_cm) || Number(form.height_cm) <= 0))
      e.height_cm = 'Debe ser un número positivo'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const updated = await updateProfile(token, {
        name:      form.name,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        goal:      form.goal || null,
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

  if (!user) return (
    <DashboardLayout>
      <div className="text-gym-muted font-mono text-sm text-center py-20">Cargando perfil...</div>
    </DashboardLayout>
  )

  const imc = user.weight_kg && user.height_cm
    ? (user.weight_kg / Math.pow(user.height_cm / 100, 2)).toFixed(1)
    : null

  const imcCategory = imc
    ? imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad'
    : null

  const imcColor = imcCategory === 'Normal'    ? 'text-gym-green'
    : imcCategory === 'Bajo peso'              ? 'text-blue-400'
    : imcCategory === 'Sobrepeso'              ? 'text-gym-yellow'
    : imcCategory === 'Obesidad'               ? 'text-red-400'
    : 'text-gym-yellow'

  const currentGoal = goalOptions.find(g => g.value === user.goal)

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fadeInUp">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gym-muted font-mono text-xs mb-1">CUENTA · DATOS PERSONALES</p>
            <h1 className="font-display font-bold text-3xl text-white">Mi Perfil</h1>
          </div>
          {success && (
            <span className="text-gym-green text-xs font-mono bg-gym-green/10 border border-gym-green/20 px-3 py-1.5 rounded-lg">
              ✓ Guardado correctamente
            </span>
          )}
        </div>

        {/* ── Avatar + info ── */}
        <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-6 flex items-center gap-5">
          {/* Inicial */}
          <div className="w-16 h-16 rounded-2xl bg-gym-cyan/20 border border-gym-cyan/30 flex items-center justify-center text-gym-cyan font-display font-bold text-3xl flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-white text-xl">{user.name}</h2>
            <p className="text-gym-muted text-sm font-mono">{user.email}</p>
            {currentGoal && (
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono bg-gym-accent border border-gym-border text-gym-cyan px-2.5 py-1 rounded-full">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  currentGoal.iconType === 'grasa'   ? 'bg-gym-yellow' :
                  currentGoal.iconType === 'musculo' ? 'bg-gym-cyan'   : 'bg-gym-green'
                }`} />
                {currentGoal.value}
              </span>
            )}
          </div>

          {/* ✅ CORREGIDO: Link de React Router en vez de <a href> */}
          {user.goal && (
            <Link
              to="/plan"
              className="hidden sm:flex flex-col items-center gap-1.5 text-xs font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-2.5 rounded-xl hover:bg-gym-cyan/20 transition-all flex-shrink-0"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="uppercase tracking-tighter">Mi Plan</span>
            </Link>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Peso',   value: user.weight_kg ? `${user.weight_kg} kg` : '—', color: 'text-gym-cyan'  },
            { label: 'Altura', value: user.height_cm ? `${user.height_cm} cm` : '—', color: 'text-gym-green' },
            { label: 'IMC',    value: imc ?? '—', sub: imcCategory, color: imcColor },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-gym-sidebar border border-gym-border rounded-xl p-4 text-center">
              <p className="text-gym-muted text-xs font-mono mb-1">{label}</p>
              <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
              {sub && <p className={`text-xs font-mono mt-0.5 ${color} opacity-70`}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* ── Formulario ── */}
        <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-white text-lg">Editar Perfil</h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-3 py-1.5 rounded-lg hover:bg-gym-cyan/20 transition-all"
              >
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setErrors({}) }}
                  className="text-xs font-mono text-gym-muted border border-gym-border bg-gym-accent px-3 py-1.5 rounded-lg hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs font-mono text-gym-bg font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                disabled={!editing}
                className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50"
              />
              {errors.name && <p className="mt-1 text-red-400 text-xs">{errors.name}</p>}
            </div>

            {/* Peso + Altura */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-gym-muted mb-1.5">Peso (kg)</label>
                <input
                  type="number"
                  value={form.weight_kg}
                  onChange={e => setForm({ ...form, weight_kg: e.target.value })}
                  disabled={!editing}
                  placeholder="70"
                  min="1"
                  className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50"
                />
                {errors.weight_kg && <p className="mt-1 text-red-400 text-xs">{errors.weight_kg}</p>}
              </div>
              <div>
                <label className="block text-xs font-mono text-gym-muted mb-1.5">Altura (cm)</label>
                <input
                  type="number"
                  value={form.height_cm}
                  onChange={e => setForm({ ...form, height_cm: e.target.value })}
                  disabled={!editing}
                  placeholder="175"
                  min="1"
                  className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gym-cyan transition-colors disabled:opacity-50"
                />
                {errors.height_cm && <p className="mt-1 text-red-400 text-xs">{errors.height_cm}</p>}
              </div>
            </div>

            {/* Meta */}
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-2">Meta de Entrenamiento</label>
              {!editing ? (
                <div className="bg-gym-accent border border-gym-border rounded-xl px-4 py-3 opacity-50 flex items-center gap-2">
                  {currentGoal && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      currentGoal.iconType === 'grasa'   ? 'bg-gym-yellow' :
                      currentGoal.iconType === 'musculo' ? 'bg-gym-cyan'   : 'bg-gym-green'
                    }`} />
                  )}
                  <p className="text-white text-sm">
                    {currentGoal ? currentGoal.value : 'Sin meta definida'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {/* Sin meta */}
                  <button
                    onClick={() => setForm({ ...form, goal: '' })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      form.goal === ''
                        ? 'border-gym-cyan/40 bg-gym-cyan/10 text-white'
                        : 'border-gym-border bg-gym-accent text-gym-muted hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0 text-gym-muted" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
                    </svg>
                    <p className="text-sm font-semibold">Sin meta definida</p>
                    {form.goal === '' && <CheckIcon />}
                  </button>

                  {goalOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, goal: opt.value })}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        form.goal === opt.value
                          ? 'border-gym-cyan/40 bg-gym-cyan/10 text-white'
                          : 'border-gym-border bg-gym-accent text-gym-muted hover:text-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        opt.iconType === 'grasa'   ? 'bg-gym-yellow/10 text-gym-yellow' :
                        opt.iconType === 'musculo' ? 'bg-gym-cyan/10   text-gym-cyan'   :
                                                     'bg-gym-green/10  text-gym-green'
                      }`}>
                        <GoalIcon type={opt.iconType} className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{opt.value}</p>
                        <p className="text-xs opacity-60 font-mono">{opt.desc}</p>
                      </div>
                      {form.goal === opt.value && <CheckIcon />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Link al plan ── ✅ CORREGIDO: Link de React Router en vez de <a href> */}
        {user.goal && (
          <Link
            to="/plan"
            className="flex items-center justify-between bg-gym-sidebar border border-gym-cyan/20 rounded-2xl px-6 py-4 hover:border-gym-cyan/50 transition-all group"
          >
            <div>
              <p className="text-white font-display font-bold text-sm uppercase italic tracking-wide">Ver mi Plan de Entrenamiento</p>
              <p className="text-gym-muted text-xs font-mono mt-0.5 uppercase">Motor IA · Meta: {user.goal}</p>
            </div>
            <span className="text-gym-cyan group-hover:translate-x-1 transition-transform font-mono">→</span>
          </Link>
        )}

      </div>
    </DashboardLayout>
  )
}
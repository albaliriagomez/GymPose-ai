import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/authService'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm]           = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors]       = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]     = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim())                                    e.name     = 'El nombre es requerido'
    if (!form.email)                                          e.email    = 'El email es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email    = 'Formato inválido'
    if (!form.password)                                       e.password = 'La contraseña es requerida'
    else if (form.password.length < 6)                        e.password = 'Mínimo 6 caracteres'
    if (form.confirm !== form.password)                       e.confirm  = 'Las contraseñas no coinciden'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setServerError(''); setLoading(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      navigate('/login')
    } catch (err) {
      setServerError(err.message)
    } finally { setLoading(false) }
  }

  const field = (key, label, type, placeholder) => (
    <div>
      <label className="block text-xs font-mono text-gym-muted mb-1.5">{label}</label>
      <input type={type} value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm placeholder-gym-muted outline-none focus:border-gym-cyan transition-colors" />
      {errors[key] && <p className="mt-1 text-red-400 text-xs">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 80% 50%, #0d1f3c 0%, #0a0f1a 60%)' }}>

      <div className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#00e5ff 1px,transparent 1px),linear-gradient(90deg,#00e5ff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md animate-fadeInUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gym-cyan flex items-center justify-center glow-cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5" className="w-5 h-5">
                <path d="M6 4v16M18 4v16M3 8h18M3 16h18"/>
              </svg>
            </div>
            <span className="font-display text-2xl font-bold text-white tracking-wider">GymPose</span>
          </div>
          <p className="text-gym-muted text-xs font-mono">Rendimiento IA</p>
        </div>

        <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-8"
          style={{ boxShadow: '0 0 60px rgba(0,229,255,0.08)' }}>
          <h1 className="font-display font-bold text-2xl text-white mb-1">Crear Cuenta</h1>
          <p className="text-gym-muted text-sm mb-6">Empieza tu entrenamiento inteligente</p>

          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('name',     'Nombre completo',    'text',     'Alex García')}
            {field('email',    'Email',              'text',     'tu@email.com')}
            {field('password', 'Contraseña',         'password', '••••••••')}
            {field('confirm',  'Confirmar contraseña','password','••••••••')}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-display font-bold text-gym-bg tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#00ff88,#00e5ff)', boxShadow: '0 0 25px rgba(0,255,136,0.3)' }}>
              {loading ? 'Creando cuenta...' : 'REGISTRARSE'}
            </button>
          </form>
          <p className="mt-5 text-center text-gym-muted text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-gym-cyan hover:underline">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
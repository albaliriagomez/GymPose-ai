import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/authService'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [form, setForm]           = useState({ email: '', password: '' })
  const [errors, setErrors]       = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]     = useState(false)

  const validate = () => {
    const e = {}
    if (!form.email)                                       e.email    = 'El email es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Formato inválido'
    if (!form.password) e.password = 'La contraseña es requerida'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setServerError(''); setLoading(true)
    try {
      const data = await login(form.email, form.password)
      signIn(data.user)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 20% 50%, #0d1f3c 0%, #0a0f1a 60%)' }}>

      {/* Grid bg */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#00e5ff 1px,transparent 1px),linear-gradient(90deg,#00e5ff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gym-cyan flex items-center justify-center glow-cyan">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gym-bg" stroke="#0a0f1a" strokeWidth="2.5">
                <path d="M6 4v16M18 4v16M3 8h18M3 16h18"/>
              </svg>
            </div>
            <span className="font-display text-2xl font-bold text-white tracking-wider">GymPose</span>
          </div>
          <p className="text-gym-muted text-xs font-mono">Rendimiento IA</p>
        </div>

        <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-8"
          style={{ boxShadow: '0 0 60px rgba(0,229,255,0.08)' }}>
          <h1 className="font-display font-bold text-2xl text-white mb-1">Iniciar Sesión</h1>
          <p className="text-gym-muted text-sm mb-5">Bienvenido de nuevo a tu rendimiento</p>

          {/* Demo hint */}
          <div className="mb-5 p-3 rounded-lg bg-gym-cyan/10 border border-gym-cyan/20 text-gym-cyan text-xs font-mono">
            🔑 Demo: alex@gympose.com / demo1234
          </div>

          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Email</label>
              <input type="text" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="tu@email.com"
                className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm placeholder-gym-muted outline-none focus:border-gym-cyan transition-colors" />
              {errors.email && <p className="mt-1 text-red-400 text-xs">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-mono text-gym-muted mb-1.5">Contraseña</label>
              <input type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-gym-accent border border-gym-border rounded-xl px-4 py-3 text-white text-sm placeholder-gym-muted outline-none focus:border-gym-cyan transition-colors" />
              {errors.password && <p className="mt-1 text-red-400 text-xs">{errors.password}</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-display font-bold text-gym-bg tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 25px rgba(0,229,255,0.35)' }}>
              {loading ? 'Ingresando...' : 'ENTRAR'}
            </button>
          </form>
          <p className="mt-5 text-center text-gym-muted text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-gym-cyan hover:underline">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
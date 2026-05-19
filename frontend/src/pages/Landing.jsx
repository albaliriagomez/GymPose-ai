import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/authContext.js'

const AuthButtons = ({ centered = false }) => (
  <div className={`flex flex-wrap gap-3 ${centered ? 'justify-center' : 'justify-end'}`}>
    <Link
      to="/login"
      className="rounded-xl border border-gym-cyan/40 px-5 py-2.5 text-sm font-display font-bold text-gym-cyan transition-all hover:bg-gym-cyan/10"
    >
      Iniciar Sesión
    </Link>
    <Link
      to="/register"
      className="rounded-xl px-5 py-2.5 text-sm font-display font-bold text-gym-bg transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 25px rgba(0,229,255,0.28)' }}
    >
      Registrarse
    </Link>
  </div>
)

export default function Landing() {
  const { isAuthenticated, loading, user } = useAuth()

  if (!loading && isAuthenticated) {
    const role = user?.role || 'user'
    return <Navigate to={role === 'trainer' ? '/trainer/dashboard' : '/dashboard'} replace />
  }

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text">
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#00e5ff 1px,transparent 1px),linear-gradient(90deg,#00e5ff 1px,transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <header className="fixed left-0 right-0 top-0 z-10 border-b border-gym-border/80 bg-gym-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gym-cyan flex items-center justify-center glow-cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5" className="w-5 h-5">
                <path d="M6 4v16M18 4v16M3 8h18M3 16h18" />
              </svg>
            </div>
            <span className="font-display text-2xl font-bold tracking-wider text-white">GymPose</span>
          </Link>
          <AuthButtons />
        </div>
      </header>

      <main className="relative flex min-h-screen items-center justify-center px-5 pt-24">
        <section className="mx-auto max-w-4xl text-center animate-fadeInUp">
          <p className="mb-3 font-mono text-sm uppercase tracking-[0.32em] text-gym-cyan">Rendimiento IA</p>
          <h1 className="font-display text-5xl font-extrabold leading-tight text-white sm:text-7xl">
            Bienvenido a GymPose
          </h1>
          <div className="mt-8">
            <AuthButtons centered />
          </div>
        </section>
      </main>
    </div>
  )
}

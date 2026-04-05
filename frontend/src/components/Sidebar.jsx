import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Item = ({ to, label, icon }) => (
  <NavLink to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-mono transition-all ${
        isActive
          ? 'bg-gym-cyan/10 text-gym-cyan border border-gym-cyan/20'
          : 'text-gym-muted hover:text-white hover:bg-gym-accent'}`}>
    <span className="w-4 h-4 flex-shrink-0">{icon}</span>
    {label}
  </NavLink>
)

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  return (
    <aside className="w-52 min-h-screen bg-gym-sidebar border-r border-gym-border flex flex-col py-6 px-3 flex-shrink-0">
      {/* Logo */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gym-cyan flex items-center justify-center glow-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5" className="w-4 h-4">
              <path d="M6 4v16M18 4v16M3 8h18M3 16h18"/>
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-none tracking-wider">GymPose</div>
            <div className="text-gym-muted text-[10px] font-mono">Rendimiento IA</div>
          </div>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex flex-col gap-1 flex-1">
        <Item to="/dashboard" label="Panel" icon={
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>} />
        <Item to="/training" label="Entrenar" icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 4v16M18 4v16M3 8h18M3 16h18"/>
          </svg>} />
        <Item to="/posture" label="Analizador" icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="2"/><path d="M12 7v5l-3 3M12 12l3 3M9 10H6M18 10h-3"/>
          </svg>} />
        <Item to="/nutrition" label="Dieta" icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 8v8M8 12h8"/>
          </svg>} />
      </nav>

      {/* Inferior */}
      <div className="flex flex-col gap-1">
        <Item to="/settings" label="Ajustes" icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>} />
        <button onClick={() => { signOut(); navigate('/login') }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-mono text-gym-muted hover:text-red-400 hover:bg-red-900/10 transition-all">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
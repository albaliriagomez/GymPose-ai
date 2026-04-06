import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/training',  label: 'Entrenamiento' },
  { to: '/posture',   label: 'Postura' },
  { to: '/nutrition', label: 'Nutrición' },
]

export default function Topbar() {
  const { user } = useAuth()
  return (
    <header className="h-14 bg-gym-sidebar border-b border-gym-border flex items-center px-6 gap-8 flex-shrink-0">
      <nav className="flex items-center gap-6 flex-1">
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `text-sm font-mono pb-0.5 transition-colors ${
                isActive ? 'text-gym-cyan border-b-2 border-gym-cyan' : 'text-gym-muted hover:text-white'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg bg-gym-accent border border-gym-border flex items-center justify-center text-gym-muted hover:text-gym-cyan hover:border-gym-cyan/40 transition-all">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <div className="w-8 h-8 rounded-lg bg-gym-cyan/20 border border-gym-cyan/30 flex items-center justify-center text-gym-cyan font-display font-bold text-sm">
          {user?.name?.[0] || 'A'}
        </div>
      </div>
    </header>
  )
}
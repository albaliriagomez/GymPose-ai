import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext.js'
import { getUnreadCount } from '../services/notificationService'

const links = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/training',      label: 'Entrenamiento' },
  { to: '/posture',       label: 'Postura' },
  { to: '/nutrition',     label: 'Nutrición' },
  { to: '/plan',          label: 'Plan' },

]

export default function Topbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const token = localStorage.getItem('gympose_token')

  useEffect(() => {
    if (!token) return
    getUnreadCount(token).then(setUnread).catch(() => {})
    const interval = setInterval(() => {
      getUnreadCount(token).then(setUnread).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [token])

  return (
    <header className="h-14 bg-gym-sidebar border-b border-gym-border flex items-center px-6 gap-8 flex-shrink-0">
      <nav className="flex items-center gap-6 flex-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `text-sm font-mono pb-0.5 transition-colors ${
                isActive ? 'text-gym-cyan border-b-2 border-gym-cyan' : 'text-gym-muted hover:text-white'
              }`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-8 h-8 rounded-lg bg-gym-accent border border-gym-border flex items-center justify-center text-gym-muted hover:text-gym-cyan hover:border-gym-cyan/40 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gym-cyan text-gym-bg text-[9px] font-bold font-mono flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-lg bg-gym-cyan/20 border border-gym-cyan/30 flex items-center justify-center text-gym-cyan font-display font-bold text-sm hover:bg-gym-cyan/30 transition-all"
        >
          {user?.name?.[0] || 'A'}
        </button>
      </div>
    </header>
  )
}

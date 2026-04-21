import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { getNotifications, markAsRead, markAllRead } from '../services/notificationService'

const typeConfig = {
  logro:   { color: 'text-gym-green',  bg: 'bg-gym-green/10',  border: 'border-gym-green/20',  label: 'Logro' },
  consejo: { color: 'text-gym-yellow', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', label: 'Consejo' },
  record:  { color: 'text-gym-cyan',   bg: 'bg-gym-cyan/10',   border: 'border-gym-cyan/20',   label: 'Récord' },
}

const TypeIcon = ({ type }) => {
  if (type === 'logro')   return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>
  if (type === 'consejo') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
  if (type === 'record')  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
  return null
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const token = localStorage.getItem('gympose_token')

  const load = async () => {
    try {
      const data = await getNotifications(token)
      setNotifications(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleMarkRead = async (id) => {
    await markAsRead(token, id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleMarkAll = async () => {
    await markAllRead(token)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5 animate-fadeInUp">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">Notificaciones</h1>
            <p className="text-gym-muted text-sm font-mono mt-1">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-xs font-mono text-gym-cyan hover:underline"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {['all', 'unread'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filter === f
                  ? 'bg-gym-cyan text-gym-bg font-bold'
                  : 'bg-gym-accent border border-gym-border text-gym-muted hover:text-white'
              }`}
            >
              {f === 'all' ? 'Todas' : 'No leídas'}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-gym-muted font-mono text-sm text-center py-12">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-gym-muted font-mono text-sm">No hay notificaciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.consejo
              return (
                <div
                  key={n.id}
                  className={`bg-gym-sidebar border rounded-2xl p-5 flex gap-4 transition-all ${
                    n.read ? 'border-gym-border opacity-60' : 'border-gym-border'
                  }`}
                >
                  {/* Icono */}
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon type={n.type} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-mono font-bold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-gym-cyan flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-white text-sm leading-relaxed">{n.message}</p>
                    <p className="text-gym-muted text-xs font-mono mt-2">
                      {new Date(n.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Acción */}
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs font-mono text-gym-muted hover:text-gym-cyan transition-colors flex-shrink-0"
                    >
                      Leída
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
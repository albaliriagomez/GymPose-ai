import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext.js'

const clients = [
  { nombre: 'Ana García', objetivo: 'Perder peso', kcal_hoy: 1820, objetivo_kcal: 2000, estado: 'en_progreso', ultima_actividad: 'Hace 2h', macros: { p: 98, c: 190, g: 52 } },
  { nombre: 'Carlos Mendoza', objetivo: 'Ganar músculo', kcal_hoy: 2800, objetivo_kcal: 2700, estado: 'objetivo_cumplido', ultima_actividad: 'Hace 1h', macros: { p: 154, c: 330, g: 78 } },
  { nombre: 'María López', objetivo: 'Mantener peso', kcal_hoy: 400, objetivo_kcal: 1900, estado: 'necesita_atencion', ultima_actividad: 'Ayer', macros: { p: 24, c: 44, g: 13 } },
  { nombre: 'Diego Ramos', objetivo: 'Perder peso', kcal_hoy: 1600, objetivo_kcal: 1900, estado: 'en_progreso', ultima_actividad: 'Hace 3h', macros: { p: 112, c: 155, g: 46 } },
  { nombre: 'Sofía Torres', objetivo: 'Ganar músculo', kcal_hoy: 3100, objetivo_kcal: 2900, estado: 'objetivo_cumplido', ultima_actividad: 'Hace 30min', macros: { p: 168, c: 360, g: 86 } },
]

const statusStyles = {
  objetivo_cumplido: {
    label: '✓ En objetivo',
    badge: 'bg-gym-green/10 text-gym-green border-gym-green/25',
    avatar: 'bg-gym-green/15 text-gym-green border-gym-green/30',
    bar: 'bg-gym-green',
  },
  en_progreso: {
    label: '→ En progreso',
    badge: 'bg-gym-cyan/10 text-gym-cyan border-gym-cyan/25',
    avatar: 'bg-gym-cyan/15 text-gym-cyan border-gym-cyan/30',
    bar: 'bg-gym-cyan',
  },
  necesita_atencion: {
    label: '⚠ Atención',
    badge: 'bg-orange-400/10 text-orange-300 border-orange-300/25',
    avatar: 'bg-orange-400/15 text-orange-300 border-orange-300/30',
    bar: 'bg-orange-300',
  },
}

const navItems = [
  { id: 'panel', label: 'Panel', icon: <GridIcon /> },
  { id: 'clientes', label: 'Mis Clientes', icon: <UsersIcon /> },
  { id: 'ia', label: 'Análisis IA', icon: <SparkIcon /> },
]

function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
}

function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}

function SparkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" /></svg>
}

function initials(name) {
  return name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
}

function StatusBadge({ estado }) {
  const style = statusStyles[estado] || statusStyles.en_progreso
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-mono ${style.badge}`}>{style.label}</span>
}

function TrainerSidebar({ activeView, onViewChange }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="w-full border-b border-gym-border bg-gym-sidebar px-3 py-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r md:py-6">
      <div className="mb-5 px-3 md:mb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gym-cyan flex items-center justify-center glow-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5" className="w-5 h-5"><path d="M6 4v16M18 4v16M3 8h18M3 16h18" /></svg>
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-none tracking-wider">GymPose</div>
            <div className="mt-1 inline-flex rounded-full border border-gym-cyan/30 bg-gym-cyan/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-gym-cyan">Entrenador</div>
          </div>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-mono transition-all ${
              activeView === item.id
                ? 'border border-gym-cyan/20 bg-gym-cyan/10 text-gym-cyan'
                : 'text-gym-muted hover:bg-gym-accent hover:text-white'
            }`}
          >
            {item.icon}
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        onClick={() => { logout(); navigate('/login') }}
        className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-mono text-gym-muted transition-all hover:bg-red-900/10 hover:text-red-400 md:mt-8"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
        Cerrar Sesión
      </button>
    </aside>
  )
}

function MetricCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
      <div className={`mb-4 h-1 w-12 rounded-full ${accent}`} />
      <p className="text-xs font-mono text-gym-muted">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold text-white">{value}</p>
    </div>
  )
}

function PanelView() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clientes activos" value="12" accent="bg-gym-cyan" />
        <MetricCard label="Cumplieron objetivo hoy" value="8" accent="bg-gym-green" />
        <MetricCard label="En déficit calórico" value="5" accent="bg-orange-300" />
        <MetricCard label="Necesitan atención" value="3" accent="bg-gym-yellow" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-gym-border bg-gym-sidebar">
        <div className="border-b border-gym-border px-5 py-4">
          <h2 className="font-display text-xl font-bold text-white">Clientes recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gym-card text-xs uppercase tracking-widest text-gym-muted">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Objetivo</th>
                <th className="px-5 py-3">Kcal hoy</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.nombre} className="border-t border-gym-border/70">
                  <td className="px-5 py-4 font-display font-bold text-white">{client.nombre}</td>
                  <td className="px-5 py-4 text-gym-muted">{client.objetivo}</td>
                  <td className="px-5 py-4 text-gym-text">{client.kcal_hoy} / {client.objetivo_kcal}</td>
                  <td className="px-5 py-4"><StatusBadge estado={client.estado} /></td>
                  <td className="px-5 py-4 text-gym-muted">{client.ultima_actividad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ClientsView() {
  const [selectedClient, setSelectedClient] = useState(null)

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map(client => {
          const pct = Math.min(100, Math.round((client.kcal_hoy / client.objetivo_kcal) * 100))
          const style = statusStyles[client.estado] || statusStyles.en_progreso
          return (
            <article key={client.nombre} className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl border font-display font-extrabold ${style.avatar}`}>
                  {initials(client.nombre)}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{client.nombre}</h3>
                  <p className="text-sm text-gym-muted">{client.objetivo}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 flex justify-between text-xs font-mono text-gym-muted">
                  <span>{client.kcal_hoy} kcal</span>
                  <span>{client.objetivo_kcal} kcal</span>
                </div>
                <div className="h-2 rounded-full bg-gym-accent">
                  <div className={`h-2 rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="rounded-lg bg-gym-card py-2 text-gym-muted">P <span className="text-white">{client.macros.p}g</span></div>
                <div className="rounded-lg bg-gym-card py-2 text-gym-muted">C <span className="text-white">{client.macros.c}g</span></div>
                <div className="rounded-lg bg-gym-card py-2 text-gym-muted">G <span className="text-white">{client.macros.g}g</span></div>
              </div>

              <button
                onClick={() => setSelectedClient(client)}
                className="w-full rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2.5 font-display text-sm font-bold text-gym-cyan transition-all hover:bg-gym-cyan/20"
              >
                Ver detalle
              </button>
            </article>
          )
        })}
      </div>

      {selectedClient && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-gym-bg/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gym-border bg-gym-sidebar p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">{selectedClient.nombre}</h2>
                <p className="text-gym-muted">{selectedClient.objetivo}</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="rounded-lg px-3 py-1 text-gym-muted hover:bg-gym-accent hover:text-white">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gym-text">Kcal consumidas: <span className="font-bold text-white">{selectedClient.kcal_hoy}</span></p>
              <p className="text-gym-text">Objetivo diario: <span className="font-bold text-white">{selectedClient.objetivo_kcal}</span></p>
              <p className="text-gym-text">Última actividad: <span className="font-bold text-white">{selectedClient.ultima_actividad}</span></p>
              <StatusBadge estado={selectedClient.estado} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AnalysisView() {
  const [clientName, setClientName] = useState(clients[0].nombre)
  const [showAnalysis, setShowAnalysis] = useState(false)

  return (
    <div className="max-w-3xl space-y-5">
      <section className="rounded-2xl border border-gym-border bg-gym-sidebar p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={clientName}
            onChange={event => { setClientName(event.target.value); setShowAnalysis(false) }}
            className="rounded-xl border border-gym-border bg-gym-accent px-4 py-3 text-white outline-none focus:border-gym-cyan"
          >
            {clients.map(client => <option key={client.nombre} value={client.nombre}>{client.nombre}</option>)}
          </select>
          <button
            onClick={() => setShowAnalysis(true)}
            className="rounded-xl px-5 py-3 font-display font-bold text-gym-bg transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#ffd60a,#00e5ff)' }}
          >
            Generar análisis con IA
          </button>
        </div>
      </section>

      {showAnalysis && (
        <section className="rounded-2xl border border-gym-yellow/25 bg-gym-sidebar p-6">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-gym-yellow">Análisis IA</p>
          <h2 className="font-display text-2xl font-bold text-gym-yellow">Lectura nutricional de {clientName}</h2>
          <p className="mt-4 leading-relaxed text-gym-text">
            Ana García lleva 3 días consecutivos cumpliendo su objetivo calórico. Su consumo de proteínas está por debajo del 35% recomendado para pérdida de peso.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-gym-muted">
            <li className="rounded-xl bg-gym-card px-4 py-3">Aumentar proteína en desayuno y almuerzo.</li>
            <li className="rounded-xl bg-gym-card px-4 py-3">Mantener el déficit calórico actual de ~180 kcal/día.</li>
            <li className="rounded-xl bg-gym-card px-4 py-3">Revisar hidratación y fibra si aparece fatiga en entrenamientos.</li>
          </ul>
        </section>
      )}
    </div>
  )
}

export default function TrainerDashboard() {
  const { user } = useAuth()
  const [activeView, setActiveView] = useState('panel')
  const today = useMemo(() => new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date()), [])

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text md:flex">
      <TrainerSidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-y-auto p-5 md:p-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-gym-muted">Buen día, {user?.name || 'Entrenador'}</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold text-white">
              {activeView === 'panel' && 'Panel'}
              {activeView === 'clientes' && 'Mis Clientes'}
              {activeView === 'ia' && 'Análisis IA'}
            </h1>
          </div>
          <p className="text-sm capitalize text-gym-muted">{today}</p>
        </header>

        {activeView === 'panel' && <PanelView />}
        {activeView === 'clientes' && <ClientsView />}
        {activeView === 'ia' && <AnalysisView />}
      </main>
    </div>
  )
}

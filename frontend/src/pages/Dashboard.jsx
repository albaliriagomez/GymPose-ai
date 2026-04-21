import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import {
  getDashboardStats,
  getWeeklySummary,
  getLastAnalysis,
  getDashboardTips
} from '../services/dashboardService'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-gym-card border border-gym-border rounded-lg px-3 py-2 text-xs">
    <p className="text-gym-cyan font-mono font-bold mb-1">{label}</p>
    {payload.map(p => (
      <p key={p.name} className="text-gym-muted">
        {p.name}: <span className="text-white">{p.value}</span>
      </p>
    ))}
  </div>
) : null

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const token = localStorage.getItem('gympose_token')

  const [stats, setStats]       = useState(null)
  const [weekly, setWeekly]     = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [tips, setTips]         = useState(null)
  const [loading, setLoading]   = useState(true)

  const trendData = weekly.slice(-6).map(d => ({ v: d.intensity }))

  useEffect(() => {
    const load = async () => {
      try {
        const [s, w, a, t] = await Promise.all([
          getDashboardStats(token),
          getWeeklySummary(token),
          getLastAnalysis(token),
          getDashboardTips(token),
        ])
        setStats(s); setWeekly(w); setAnalysis(a); setTips(t)
      } catch (err) {
        console.error('Error cargando dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-96">
        <div className="text-gym-muted font-mono text-sm animate-pulse">Cargando datos...</div>
      </div>
    </DashboardLayout>
  )

  const sessionsChange = stats?.sessions_change ?? 0
  const changeLabel    = `${sessionsChange >= 0 ? '+' : ''}${sessionsChange}% vs ayer`
  const caloriesPct    = stats
    ? Math.min(100, Math.round((stats.calories_today / stats.calories_goal) * 100))
    : 0

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between animate-fadeInUp">
          <div>
            <p className="text-gym-muted text-[11px] font-mono tracking-widest uppercase mb-1">
              Bienvenido de nuevo, {user?.name || 'Usuario'}
            </p>
            <h1 className="font-display font-bold text-4xl text-white leading-none">
              Tu Rendimiento <span className="text-gym-cyan text-glow-cyan">Hoy</span>
            </h1>
          </div>
          <button
            onClick={() => navigate('/training')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-display font-bold text-gym-bg text-sm tracking-wider hover:scale-105 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 25px rgba(0,229,255,0.4)' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><polygon points="5,3 19,12 5,21"/></svg>
            Empezar Entrenamiento Nuevo
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 animate-fadeInUp delay-100">

          {/* Sesiones */}
          <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-[3px] h-full bg-gym-cyan rounded-l-2xl"/>
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl bg-gym-cyan/10 border border-gym-cyan/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" className="w-5 h-5">
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                sessionsChange >= 0
                  ? 'bg-gym-green/10 text-gym-green border-gym-green/20'
                  : 'bg-red-900/20 text-red-400 border-red-500/20'
              }`}>
                {changeLabel}
              </span>
            </div>
            <p className="text-gym-muted text-xs font-mono mb-1">Sesiones hoy</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-5xl text-white">{stats?.sessions_today ?? 0}</span>
              <span className="text-gym-muted">Completadas</span>
            </div>
          </div>

          {/* Calorías */}
          <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-[3px] h-full bg-orange-400 rounded-l-2xl"/>
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="#fb923c" className="w-5 h-5">
                  <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
                </svg>
              </div>
              <span className="text-[11px] font-mono bg-gym-accent border border-gym-border text-gym-muted px-2 py-0.5 rounded-full">
                Meta: {stats?.calories_goal ?? 1200}
              </span>
            </div>
            <p className="text-gym-muted text-xs font-mono mb-1">Calorías quemadas</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display font-bold text-5xl text-white">{stats?.calories_today ?? 0}</span>
              <span className="text-gym-muted">kcal</span>
            </div>
            <div className="h-1 bg-gym-accent rounded-full">
              <div className="h-1 bg-orange-400 rounded-full transition-all" style={{ width: `${caloriesPct}%` }}/>
            </div>
          </div>

          {/* Consistencia */}
          <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-[3px] h-full bg-gym-green rounded-l-2xl"/>
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl bg-gym-green/10 border border-gym-green/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" className="w-4 h-4">
                  <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
                </svg>
              </div>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-full bg-gym-muted/30"/>
                <div className="w-4 h-4 rounded-full bg-gym-cyan"/>
              </div>
            </div>
            <p className="text-gym-muted text-xs font-mono mb-1">Consistencia semanal</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display font-bold text-5xl text-white">{stats?.consistency_pct ?? 0}%</span>
              <span className="text-gym-green text-lg">↗</span>
            </div>
            <ResponsiveContainer width="100%" height={30}>
              <AreaChart data={trendData.length ? trendData : [{ v: 0 }]}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#00ff88" strokeWidth={2} fill="url(#g)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica semanal + Último análisis */}
        <div className="grid grid-cols-5 gap-4 animate-fadeInUp delay-200">

          <div className="col-span-3 bg-gym-sidebar border border-gym-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-white text-xl">Resumen Semanal</h2>
              <div className="flex items-center gap-2 text-xs font-mono text-gym-muted">
                <div className="w-2 h-2 rounded-full bg-gym-cyan"/>
                Intensidad IA
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekly} barGap={3}>
                <XAxis dataKey="day" axisLine={false} tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}/>
                <YAxis hide/>
                <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(0,229,255,0.05)' }}/>
                <Bar dataKey="intensity" name="Intensidad" fill="#00e5ff" opacity={0.85} radius={[4,4,0,0]}/>
                <Bar dataKey="calories"  name="Calorías"   fill="#1e2d45" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Último análisis */}
          <div className="col-span-2 bg-gym-sidebar border border-gym-border rounded-2xl p-5 flex flex-col">
            <div className="relative flex-1 rounded-xl overflow-hidden mb-4 min-h-[140px]"
              style={{ background: 'linear-gradient(135deg,#1e2d45 0%,#111827 100%)' }}>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, #00e5ff 0%, transparent 70%)' }}/>
              <div className="absolute top-2 left-2">
                <span className="text-[10px] font-mono font-bold bg-gym-yellow text-gym-bg px-2 py-0.5 rounded">
                  ÚLTIMO ANÁLISIS
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3"
                style={{ background: 'linear-gradient(to top, rgba(13,20,36,0.95), transparent)' }}>
                {analysis?.found ? (
                  <>
                    <h3 className="font-display font-bold text-white text-lg leading-tight">
                      {analysis.exercise}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" className="w-3.5 h-3.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9 12l2 2 4-4"/>
                      </svg>
                      <span className="text-gym-green text-xs font-mono">
                        {Math.round(analysis.score)}% Precisión Postural
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gym-muted text-xs font-mono">Sin análisis todavía</p>
                    <p className="text-gym-muted text-[10px] font-mono mt-1">Completa tu primera sesión</p>
                  </div>
                )}
              </div>
            </div>
            <button
              disabled={!analysis?.found}
              onClick={() => navigate('/posture')}
              className="w-full py-2.5 rounded-xl text-sm font-display font-bold text-white bg-gym-accent border border-gym-border hover:bg-gym-border transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Ver Repetición
            </button>
          </div>
        </div>

        {/* Tips IA */}
        <div className="grid grid-cols-2 gap-4 animate-fadeInUp delay-300">

          <div className="bg-gym-sidebar rounded-2xl p-5 flex gap-4 border-l-4"
            style={{ borderColor:'#ffd60a', borderTop:'1px solid #1e2d45', borderRight:'1px solid #1e2d45', borderBottom:'1px solid #1e2d45' }}>
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffd60a" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-display font-bold text-white text-sm">Consejo de IA</h4>
                {tips?.consejo?.found && <span className="w-1.5 h-1.5 rounded-full bg-gym-yellow"/>}
              </div>
              <p className="text-gym-muted text-xs leading-relaxed">
                {tips?.consejo?.message ?? 'Mantén una buena hidratación durante el entrenamiento.'}
              </p>
            </div>
          </div>

          <div className="bg-gym-sidebar rounded-2xl p-5 flex gap-4 border-l-4"
            style={{ borderColor:'#00e5ff', borderTop:'1px solid #1e2d45', borderRight:'1px solid #1e2d45', borderBottom:'1px solid #1e2d45' }}>
            <div className="w-10 h-10 rounded-xl bg-gym-cyan/10 border border-gym-cyan/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="8" r="6"/>
                <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-display font-bold text-white text-sm">Récord Personal</h4>
                {tips?.record?.found && <span className="w-1.5 h-1.5 rounded-full bg-gym-cyan"/>}
              </div>
              <p className="text-gym-muted text-xs leading-relaxed">
                {tips?.record?.message ?? '¡Completa tu primera sesión para registrar tu primer récord!'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
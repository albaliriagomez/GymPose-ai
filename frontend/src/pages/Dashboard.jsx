import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext.js'
import { useNutrition } from '../hooks/useNutrition'
import DashboardLayout from '../components/DashboardLayout'
import { getDashboardFull, getWeeklySummary, getDashboardTips } from '../services/dashboardService'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'

// ── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-gym-sidebar border border-gym-border rounded-xl px-3 py-2 text-xs shadow-xl">
    <p className="text-gym-cyan font-mono font-bold mb-1">{label}</p>
    {payload.map(p => (
      <p key={p.name} className="text-gym-muted">
        {p.name}: <span className="text-white font-bold">{p.value}</span>
      </p>
    ))}
  </div>
) : null

// ── Anillo SVG ────────────────────────────────────────────────────────────────
const Ring = ({ value, max, color, size = 88, label, sublabel }) => {
  const pct  = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const r    = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2d45" strokeWidth="7"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)',
              filter: pct > 0 ? `drop-shadow(0 0 8px ${color}80)` : 'none'
            }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="font-display font-bold text-white" style={{ fontSize: 15 }}>{value}</span>
          <span className="text-gym-muted font-mono" style={{ fontSize: 9 }}>g</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-gym-muted text-[10px] font-mono">{label}</p>
        <p className="font-mono font-bold text-[11px]" style={{ color }}>{pct}%</p>
        {sublabel && <p className="text-gym-muted text-[9px] font-mono opacity-70">{sublabel}</p>}
      </div>
    </div>
  )
}

// ── Número que aparece animado ────────────────────────────────────────────────
const Count = ({ to, suffix = '' }) => {
  const [n, setN] = useState(to || 0)
  useEffect(() => {
    if (!to) return
    let cur = 0
    const step = to / 40
    const t = setInterval(() => {
      cur += step
      if (cur >= to) { setN(to); clearInterval(t) }
      else setN(Math.round(cur))
    }, 16)
    return () => clearInterval(t)
  }, [to])
  return <>{to ? n : 0}{suffix}</>
}

const getMealMacro = (meal, key) => {
  const legacyKey = `${key}_g`
  return Number(meal.macros?.[key] ?? meal.macros?.[legacyKey] ?? meal[legacyKey] ?? 0)
}

// ── Tarjeta de comida ─────────────────────────────────────────────────────────
const MealRow = ({ meal, onToggle }) => {
  const done  = meal.status === 'completed'
  const prot  = Math.round(getMealMacro(meal, 'proteina'))
  const carbs = Math.round(getMealMacro(meal, 'carbos'))
  const kcal  = Math.round(meal.kcal || 0)
  const hora  = meal.time || meal.hora || ''

  return (
    <div onClick={() => onToggle(meal.id, done ? 'pending' : 'completed')}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 group select-none ${
        done
          ? 'border-gym-green/25 bg-gym-green/5'
          : 'border-gym-border bg-gym-accent hover:border-gym-cyan/30 hover:bg-gym-accent/70'
      }`}>

      {/* Check */}
      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
        done ? 'bg-gym-green border-gym-green' : 'border-gym-muted/50 group-hover:border-gym-cyan'
      }`}>
        {done && (
          <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
            <path d="M1 4l3 3 5-6" stroke="#0a0f1a" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Nombre + hora */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate transition-all ${
          done ? 'line-through text-gym-muted' : 'text-white'
        }`}>
          {meal.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {hora && <span className="text-gym-muted text-[10px] font-mono">{hora}</span>}
          <span className="text-gym-yellow text-[10px] font-mono font-bold">{kcal} kcal</span>
          {meal.aiSuggested && (
            <span className="text-[9px] font-mono text-gym-cyan border border-gym-cyan/20 bg-gym-cyan/10 px-1 rounded">IA</span>
          )}
        </div>
      </div>

      {/* Macros */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {prot > 0 && (
          <div className="text-center hidden sm:block">
            <p className="text-gym-green text-xs font-mono font-bold">{prot}g</p>
            <p className="text-gym-muted text-[9px] font-mono">prot</p>
          </div>
        )}
        {carbs > 0 && (
          <div className="text-center hidden sm:block">
            <p className="text-gym-yellow text-xs font-mono font-bold">{carbs}g</p>
            <p className="text-gym-muted text-[9px] font-mono">carbs</p>
          </div>
        )}
        {/* Toggle visual */}
        <div className={`text-[10px] font-mono px-2 py-1 rounded-lg transition-all ${
          done
            ? 'text-gym-green bg-gym-green/10'
            : 'text-gym-muted bg-gym-border/30 group-hover:text-gym-cyan'
        }`}>
          {done ? '✓ Hecha' : 'Marcar'}
        </div>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const Stat = ({ label, value, suffix = '', unit, color, badge, badgeColor, progress, icon, children }) => (
  <div className="bg-gym-sidebar border border-gym-border rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 hover:shadow-lg"
    style={{ '--c': color }}>
    <div className="absolute left-0 top-0 w-[3px] h-full rounded-l-2xl" style={{ background: color }}/>
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
      style={{ background: `radial-gradient(ellipse at 10% 50%, ${color}07 0%, transparent 65%)` }}/>

    <div className="flex items-start justify-between mb-4 relative">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
        {icon}
      </div>
      {badge && (
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-medium"
          style={{ background: `${badgeColor || color}12`, color: badgeColor || color, borderColor: `${badgeColor || color}25` }}>
          {badge}
        </span>
      )}
    </div>

    <p className="text-gym-muted text-xs font-mono mb-1 relative">{label}</p>
    <div className="flex items-baseline gap-1.5 relative">
      <span className="font-display font-bold leading-none text-white" style={{ fontSize: 44 }}>
        <Count to={typeof value === 'number' ? value : 0}/>
        {suffix}
      </span>
      {unit && <span className="text-gym-muted text-sm">{unit}</span>}
    </div>

    {children}

    {progress !== undefined && (
      <div className="mt-3 h-1.5 bg-gym-accent rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, progress)}%`,
            background: `linear-gradient(90deg, ${color}70, ${color})`,
            boxShadow: progress > 10 ? `0 0 8px ${color}40` : 'none'
          }}/>
      </div>
    )}
  </div>
)

// ════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const nutrition = useNutrition()
  const [lastCompletedRoutine, setLastCompletedRoutine] = useState(null)

  const [full,       setFull]       = useState(null)
  const [weekly,     setWeekly]     = useState([])
  const [tips,       setTips]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [spinning,   setSpinning]   = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('gympose_last_completed_routine')
    if (!raw) return

    try {
      setLastCompletedRoutine(JSON.parse(raw))
    } catch {
      localStorage.removeItem('gympose_last_completed_routine')
    }
  }, [])

  useEffect(() => {
    const handleRoutineCompleted = () => {
      const raw = localStorage.getItem('gympose_last_completed_routine')
      if (!raw) return

      try {
        setLastCompletedRoutine(JSON.parse(raw))
      } catch {
        localStorage.removeItem('gympose_last_completed_routine')
      }
    }

    window.addEventListener('gympose-routine-completed', handleRoutineCompleted)
    window.addEventListener('storage', handleRoutineCompleted)

    return () => {
      window.removeEventListener('gympose-routine-completed', handleRoutineCompleted)
      window.removeEventListener('storage', handleRoutineCompleted)
    }
  }, [])

  const reload = useCallback(() => {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 700)
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [f, w, t] = await Promise.all([
          getDashboardFull(),
          getWeeklySummary(),
          getDashboardTips(),
        ])
        setFull(f); setWeekly(w); setTips(t)
      } catch (e) {
        console.error(e); setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey])

  useEffect(() => {
    const iv = setInterval(reload, 60000)
    return () => clearInterval(iv)
  }, [reload])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-gym-cyan/15"/>
            <div className="absolute inset-0 rounded-full border-2 border-t-gym-cyan animate-spin"/>
            <div className="absolute inset-3 rounded-full border border-gym-cyan/10"/>
          </div>
          <p className="text-gym-muted font-mono text-sm tracking-wider">Cargando tu rendimiento...</p>
        </div>
      </div>
    </DashboardLayout>
  )

  if (error) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4 bg-gym-sidebar border border-red-900/30 rounded-2xl p-10">
          <div className="w-12 h-12 rounded-xl bg-red-900/20 border border-red-700/30 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-6 h-6">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <p className="text-red-400 font-mono text-sm">No se pudo cargar el dashboard</p>
          <button onClick={() => { setError(false); setLoading(true); reload() }}
            className="text-xs font-mono text-gym-cyan border border-gym-cyan/30 bg-gym-cyan/10 px-5 py-2 rounded-xl hover:bg-gym-cyan/20 transition-all">
            Reintentar
          </button>
        </div>
      </div>
    </DashboardLayout>
  )

  // ── Datos ─────────────────────────────────────────────────────────────────
  const ent  = full?.entrenamiento || {}
  const stats = ent
  const analysis = ent.ultimo_analisis || ent.ultimoAnalisis || null
  const sessionsChange = Number(
    ent.sessions_change ??
    full?.sessions_change ??
    0,
  )
  const changeLabel = sessionsChange > 0
    ? `+${sessionsChange}%`
    : sessionsChange < 0
      ? `${sessionsChange}%`
      : 'Sin cambios'
  const calPct = ent.calories_burned && ent.calories_goal
    ? Math.min(100, Math.round((ent.calories_burned / ent.calories_goal) * 100)) : 0

  const meals     = nutrition.meals || []
  const profile   = nutrition.profile || {}
  const obj_kcal  = profile.objetivo_kcal || 2200
  const kcal_con  = Math.round(meals.filter(m => m.status === 'completed').reduce((a, m) => a + (m.kcal || 0), 0))
  const kcalPct   = Math.min(100, Math.round((kcal_con / obj_kcal) * 100))
  const done_c    = meals.filter(m => m.status === 'completed').length
  const prot_c    = Math.round(meals.filter(m => m.status === 'completed').reduce((a, m) => a + getMealMacro(m, 'proteina'), 0))
  const carbs_c   = Math.round(meals.filter(m => m.status === 'completed').reduce((a, m) => a + getMealMacro(m, 'carbos'), 0))
  const grasas_c  = Math.round(meals.filter(m => m.status === 'completed').reduce((a, m) => a + getMealMacro(m, 'grasas'), 0))
  const prot_obj  = Math.round(obj_kcal * 0.30 / 4)
  const carbs_obj = Math.round(obj_kcal * 0.40 / 4)
  const gras_obj  = Math.round(obj_kcal * 0.30 / 9)

  const kcalColor = kcalPct >= 100 ? '#00ff88' : kcalPct >= 70 ? '#00e5ff' : '#ffd60a'
  const trendData = Array.isArray(weekly)
    ? weekly.map((day, index) => ({
        name: day.day || day.date || `D${index + 1}`,
        v: Number(day.intensity || day.sessions || 0),
      }))
    : []

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5 pb-8">

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between animate-fadeInUp">
          <div>
            <p className="text-gym-muted text-[11px] font-mono tracking-[0.2em] uppercase mb-1">
              Bienvenido de nuevo, {user?.name || 'Usuario'}
            </p>
            <h1 className="font-display font-bold leading-none" style={{ fontSize: 38 }}>
              <span className="text-white">Tu Rendimiento </span>
              <span className="text-gym-cyan" style={{ textShadow: '0 0 30px rgba(0,229,255,0.4)' }}>Hoy</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reload} title="Actualizar datos"
              className="w-9 h-9 rounded-xl bg-gym-accent border border-gym-border flex items-center justify-center text-gym-muted hover:text-gym-cyan hover:border-gym-cyan/30 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}>
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
            <button onClick={() => navigate('/training')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-gym-bg text-sm tracking-wider transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 20px rgba(0,229,255,0.3)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><polygon points="5,3 19,12 5,21"/></svg>
              Empezar Entrenamiento
            </button>
          </div>
        </div>

        {/* ═══ BANNER META ═══ */}
        <div className="rounded-2xl border border-gym-border bg-gym-sidebar px-5 py-4 flex items-center justify-between gap-4 relative overflow-hidden animate-fadeInUp">
          <div className="absolute right-0 top-0 bottom-0 w-48 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 100% 50%, rgba(0,229,255,0.06) 0%, transparent 70%)' }}/>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gym-muted">Plan activo</p>
            <h2 className="font-display font-bold text-white text-lg mt-0.5">Rutina, objetivo y avance</h2>
            <p className="text-gym-muted text-sm mt-0.5">
              Meta:{' '}
              <span className="text-gym-cyan font-mono font-semibold">
                {full?.usuario?.goal || 'Sin meta definida'}
              </span>
            </p>
          </div>
          <button onClick={() => navigate('/plan')}
            className="flex-shrink-0 rounded-xl border border-gym-cyan/30 bg-gym-cyan/10 px-4 py-2.5 text-sm font-mono text-gym-cyan hover:bg-gym-cyan/20 hover:border-gym-cyan/50 transition-all">
            Ver Plan IA →
          </button>
        </div>

        {/* ═══ STATS ENTRENAMIENTO ═══ */}
        <div className="grid grid-cols-3 gap-4 animate-fadeInUp delay-100">
          <Stat label="Sesiones completadas hoy" value={ent.sessions_today ?? 0}
            color="#00e5ff" badge={`${ent.total_reps_hoy ?? 0} reps`} badgeColor="#00ff88"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" className="w-5 h-5">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
            </svg>}>
            <button onClick={() => navigate('/training')}
              className="mt-3 text-[10px] font-mono text-gym-cyan hover:underline">
              Ir a entrenar →
            </button>
          </Stat>

          <Stat label="Calorías quemadas hoy" value={ent.calories_burned ?? 0} unit="kcal"
            color="#fb923c" badge={`Meta: ${ent.calories_goal ?? 400} kcal`} progress={calPct}
            icon={<svg viewBox="0 0 24 24" fill="#fb923c" className="w-5 h-5">
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
            </svg>}/>

          <Stat label="Consistencia semanal" value={ent.consistency_pct ?? 0} suffix="%"
            color="#00ff88"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" className="w-4 h-4">
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
            </svg>}>
            <p className="text-gym-muted text-[10px] font-mono mt-2">
              {ent.consistency_pct >= 80
                ? '🔥 Excelente racha, sigue así'
                : ent.consistency_pct >= 40
                ? '💪 Buen progreso, no pares'
                : '🎯 Empieza hoy tu primera sesión'}
            </p>
          </Stat>
        </div>

        {/* ═══ NUTRICIÓN ═══ */}
        <div className="bg-gym-sidebar border border-gym-border rounded-2xl overflow-hidden animate-fadeInUp delay-100">

          {/* Header nutrición */}
          <div className="px-5 pt-5 pb-4 border-b border-gym-border/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-white text-xl">🥗 Nutrición Hoy</h2>
                <p className="text-gym-muted text-xs font-mono mt-0.5">
                  {done_c} de {meals.length} comidas completadas
                </p>
              </div>
              <div className="flex items-center gap-2">
                {meals.length === 0 && (
                  <button onClick={() => nutrition.suggestMeals()} disabled={nutrition.actionLoading}
                    className="flex items-center gap-1.5 text-xs font-mono text-gym-bg font-bold px-3 py-2 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}>
                    {nutrition.actionLoading
                      ? <><div className="w-3 h-3 border border-gym-bg/50 border-t-transparent rounded-full animate-spin"/>Generando...</>
                      : <>✨ Generar plan con IA</>}
                  </button>
                )}
                <button onClick={() => navigate('/nutrition')}
                  className="text-xs font-mono text-gym-cyan border border-gym-cyan/25 bg-gym-cyan/8 px-3 py-2 rounded-xl hover:bg-gym-cyan/15 transition-all">
                  Ver todo →
                </button>
              </div>
            </div>

            {/* Barra kcal */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-mono text-gym-muted">
                  <span className="font-bold" style={{ color: kcalColor }}>{kcal_con}</span> / {obj_kcal} kcal
                </span>
                <span className="text-[11px] font-mono font-bold" style={{ color: kcalColor }}>{kcalPct}%</span>
              </div>
              <div className="h-2 bg-gym-accent rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${kcalPct}%`,
                    background: `linear-gradient(90deg, ${kcalColor}60, ${kcalColor})`,
                    boxShadow: kcalPct > 5 ? `0 0 12px ${kcalColor}40` : 'none'
                  }}/>
              </div>
            </div>
          </div>

          {/* Macros con anillos */}
          <div className="px-5 py-4 border-b border-gym-border/50">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted mb-4">
              Macronutrientes consumidos
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-2 bg-gym-accent/40 rounded-xl py-4 border border-gym-border/40">
                <Ring value={prot_c}  max={prot_obj}  color="#00ff88" size={80} label="Proteína" sublabel={`obj. ${prot_obj}g`}/>
              </div>
              <div className="flex flex-col items-center gap-2 bg-gym-accent/40 rounded-xl py-4 border border-gym-border/40">
                <Ring value={carbs_c} max={carbs_obj} color="#ffd60a" size={80} label="Carbos"   sublabel={`obj. ${carbs_obj}g`}/>
              </div>
              <div className="flex flex-col items-center gap-2 bg-gym-accent/40 rounded-xl py-4 border border-gym-border/40">
                <Ring value={grasas_c} max={gras_obj}  color="#fb923c" size={80} label="Grasas"   sublabel={`obj. ${gras_obj}g`}/>
              </div>
            </div>
          </div>

          {/* Lista de comidas */}
          <div className="px-5 py-4">
            {nutrition.loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-gym-accent rounded-xl animate-pulse"/>)}
              </div>
            ) : meals.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted mb-3">
                  Toca una comida para marcarla como completada
                </p>
                {meals.slice(0, 4).map(m => (
                  <MealRow key={m.id} meal={m} onToggle={nutrition.updateMealStatus}/>
                ))}
                {meals.length > 4 && (
                  <button onClick={() => navigate('/nutrition')}
                    className="w-full py-2.5 text-center text-xs font-mono text-gym-muted hover:text-gym-cyan border border-dashed border-gym-border hover:border-gym-cyan/30 rounded-xl transition-all">
                    + {meals.length - 4} comidas más → Ver plan completo
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-gym-accent border border-gym-border flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-6 h-6">
                    <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 8v8M8 12h8"/>
                  </svg>
                </div>
                <p className="text-gym-muted text-sm font-mono mb-1">Sin comidas registradas hoy</p>
                <p className="text-gym-muted text-xs font-mono opacity-60 mb-4">
                  La IA genera un plan personalizado según tu meta
                </p>
                <button onClick={() => nutrition.suggestMeals()} disabled={nutrition.actionLoading}
                  className="text-sm font-mono font-bold text-gym-bg px-6 py-2.5 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 20px rgba(0,229,255,0.25)' }}>
                  {nutrition.actionLoading ? 'Generando plan...' : '✨ Generar plan nutricional con IA'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ GRÁFICA + ANÁLISIS ═══ */}
        <div className="grid grid-cols-5 gap-4 animate-fadeInUp delay-200">

          {/* Resumen semanal */}
          <div className="col-span-3 bg-gym-sidebar border border-gym-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-white text-xl">Resumen Semanal</h2>
                <p className="text-gym-muted text-xs font-mono mt-0.5">Intensidad y calorías por día</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-gym-muted">
                <div className="w-2 h-2 rounded-full bg-gym-cyan animate-pulse"/>
                Intensidad IA
              </div>
            </div>

            {weekly.every(d => d.intensity === 0) ? (
              <div className="h-[180px] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gym-accent border border-gym-border flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-6 h-6">
                    <path d="M6 4v16M18 4v16M3 8h18M3 16h18"/>
                  </svg>
                </div>
                <p className="text-gym-muted text-sm font-mono">Sin actividad esta semana</p>
                <button onClick={() => navigate('/training')}
                  className="text-xs font-mono text-gym-cyan border border-gym-cyan/25 bg-gym-cyan/8 px-4 py-2 rounded-xl hover:bg-gym-cyan/15 transition-all">
                  💪 Empezar primer entrenamiento
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekly} barGap={3} barCategoryGap="30%">
                  <XAxis dataKey="day" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}/>
                  <YAxis hide/>
                  <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(0,229,255,0.04)', radius: 4 }}/>
                  <Bar dataKey="intensity" name="Intensidad" fill="#00e5ff" opacity={0.85} radius={[5,5,0,0]}/>
                  <Bar dataKey="calories"  name="Calorías"   fill="#1e2d45" radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Último análisis */}
          <div className="col-span-2 bg-gym-sidebar border border-gym-border rounded-2xl p-5 flex flex-col">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gym-muted mb-3">
              Último análisis postural
            </p>
            <div className="relative flex-1 rounded-xl overflow-hidden mb-4 min-h-[150px]"
              style={{ background: 'linear-gradient(145deg,#1a2744 0%,#0d1424 100%)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(ellipse at 40% -10%, rgba(0,229,255,0.18) 0%, transparent 55%)' }}/>
              <div className="absolute top-3 left-3">
                <span className="text-[10px] font-mono font-bold bg-gym-yellow text-gym-bg px-2 py-0.5 rounded-md">
                  ÚLTIMO ANÁLISIS
                </span>
              </div>

              {/* Reps de hoy */}
              {ent.ultimas_reps?.length > 0 && (
                <div className="absolute top-10 right-2 flex flex-col gap-1">
                  {ent.ultimas_reps.slice(0, 3).map((r, i) => (
                    <span key={i} className="text-[9px] font-mono bg-black/50 backdrop-blur text-gym-cyan px-1.5 py-0.5 rounded border border-gym-cyan/15">
                      {r.exercise} · {r.score}% · {r.timestamp}
                    </span>
                  ))}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-3"
                style={{ background: 'linear-gradient(to top, rgba(10,15,26,1) 0%, transparent 100%)' }}>
                {ent.ultimo_analisis?.found ? (
                  <>
                    <h3 className="font-display font-bold text-white text-lg leading-tight">
                      {ent.ultimo_analisis.exercise}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full bg-gym-green"/>
                      <span className="text-gym-green text-xs font-mono font-bold">
                        {ent.ultimo_analisis.score}% Precisión
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-1">
                    <p className="text-gym-muted text-xs font-mono">Sin análisis todavía</p>
                    <p className="text-gym-muted text-[10px] font-mono opacity-60 mt-0.5">
                      Usa el Analizador o entrena
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => navigate('/posture')}
                className="py-2.5 rounded-xl text-xs font-mono font-bold text-gym-bg transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}>
                📸 Analizar postura
              </button>
              <button onClick={() => navigate('/training')}
                className="py-2.5 rounded-xl text-xs font-mono font-bold text-white bg-gym-accent border border-gym-border hover:border-gym-cyan/30 transition-all">
                🎥 Entrenar en vivo
              </button>
            </div>
          </div>
        </div>

        {/* ═══ TIPS IA ═══ */}
        <div className="grid grid-cols-2 gap-4 animate-fadeInUp delay-300">

          <div className="bg-gym-sidebar rounded-2xl border border-gym-border overflow-hidden relative"
            style={{ borderLeft: '3px solid #ffd60a' }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, #ffd60a30, transparent)' }}/>
            <div className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ffd60a" strokeWidth="2" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-gym-yellow mb-1">Consejo de IA</p>
                <h4 className="font-display font-bold text-white text-sm mb-1 truncate">
                  {nutrition.tip?.title || tips?.consejo?.message?.split('.')[0] || 'Hidratación inteligente'}
                </h4>
                <p className="text-gym-muted text-xs leading-relaxed line-clamp-2">
                  {nutrition.tip?.tip || tips?.consejo?.message || 'Mantén una buena hidratación durante el entrenamiento.'}
                </p>
                <button onClick={() => navigate('/nutrition')}
                  className="mt-2 text-[10px] font-mono text-gym-yellow hover:underline">
                  Ver plan nutricional →
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gym-sidebar rounded-2xl border border-gym-border overflow-hidden relative"
            style={{ borderLeft: '3px solid #00e5ff' }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, #00e5ff30, transparent)' }}/>
            <div className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gym-cyan/10 border border-gym-cyan/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" className="w-5 h-5">
                  <circle cx="12" cy="8" r="6"/>
                  <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-gym-cyan mb-1">Récord Personal</p>
                <h4 className="font-display font-bold text-white text-sm mb-1">
                  {tips?.record?.found ? '🏆 Nuevo récord' : 'Sin récords aún'}
                </h4>
                <p className="text-gym-muted text-xs leading-relaxed line-clamp-2">
                  {tips?.record?.message ?? '¡Completa tu primera sesión para registrar tu primer récord!'}
                </p>
                <button onClick={() => navigate('/training')}
                  className="mt-2 text-[10px] font-mono text-gym-cyan hover:underline">
                  Ir al entrenamiento →
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/authContext.js'

const GradientText = ({ children }) => (
  <span className="bg-gradient-to-r from-gym-cyan via-gym-cyan to-blue-400 bg-clip-text text-transparent">
    {children}
  </span>
)

const AuthButtons = ({ centered = false }) => (
  <div className={`flex flex-wrap gap-3 ${centered ? 'justify-center' : 'justify-end'}`}>
    <Link
      to="/login"
      className="rounded-xl border border-gym-cyan/40 px-6 py-3 text-sm font-display font-bold text-gym-cyan transition-all hover:bg-gym-cyan/10 hover:border-gym-cyan/60"
    >
      Iniciar Sesión
    </Link>
    <Link
      to="/register"
      className="rounded-xl px-6 py-3 text-sm font-display font-bold text-gym-bg transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 25px rgba(0,229,255,0.28)' }}
    >
      Registrarse Gratis
    </Link>
  </div>
)

const FeatureCard = ({ icon, title, description, color = 'cyan' }) => (
  <div className="group rounded-2xl border border-gym-border/60 bg-gym-bg/40 p-6 backdrop-blur-sm transition-all hover:border-gym-cyan/40 hover:bg-gym-bg/60">
    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gym-${color}/10`}>
      <svg
        className={`h-6 w-6 text-gym-${color}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {icon}
      </svg>
    </div>
    <h3 className="mb-2 font-display text-lg font-bold text-white">{title}</h3>
    <p className="text-sm text-gym-muted leading-relaxed">{description}</p>
  </div>
)

const StatCard = ({ number, label, unit = '' }) => (
  <div className="text-center">
    <div className="font-display text-4xl font-bold text-gym-cyan">
      {number}
      {unit && <span className="text-lg text-gym-muted">{unit}</span>}
    </div>
    <p className="mt-2 text-sm text-gym-muted">{label}</p>
  </div>
)

const PricingCard = ({ plan, price, description, features, recommended = false }) => (
  <div
    className={`rounded-2xl border transition-all ${
      recommended
        ? 'border-gym-cyan/50 bg-gradient-to-b from-gym-cyan/10 to-gym-bg/80 ring-1 ring-gym-cyan/20'
        : 'border-gym-border/60 bg-gym-bg/40'
    } p-8 backdrop-blur-sm hover:border-gym-cyan/40`}
  >
    {recommended && (
      <div className="mb-4 inline-block rounded-full bg-gym-cyan/20 px-3 py-1 text-xs font-bold text-gym-cyan">
        MÁS POPULAR
      </div>
    )}
    <h3 className="font-display text-2xl font-bold text-white">{plan}</h3>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-4xl font-bold text-gym-cyan">${price}</span>
      <span className="text-gym-muted">/mes</span>
    </div>
    <p className="mt-2 text-sm text-gym-muted">{description}</p>
    <div className="my-6 border-t border-gym-border/40" />
    <ul className="space-y-3">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-gym-cyan mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-gym-muted">{feature}</span>
        </li>
      ))}
    </ul>
    <button
      className={`mt-6 w-full rounded-xl px-4 py-3 font-display font-bold transition-all ${
        recommended
          ? 'bg-gym-cyan text-gym-bg hover:bg-gym-cyan/90'
          : 'border border-gym-cyan/40 text-gym-cyan hover:bg-gym-cyan/10'
      }`}
    >
      Comenzar Ahora
    </button>
  </div>
)

const VideoShowcase = () => (
  <div className="relative rounded-2xl border border-gym-border/60 bg-black overflow-hidden">
    <div className="aspect-video w-full bg-gradient-to-br from-gym-cyan/20 to-blue-900/20 flex items-center justify-center">
      <button className="relative group">
        <div className="absolute inset-0 rounded-full bg-gym-cyan/30 blur-xl group-hover:blur-2xl transition-all" />
        <div className="relative h-20 w-20 rounded-full bg-gym-cyan flex items-center justify-center group-hover:bg-gym-cyan/90 transition-all">
          <svg className="h-8 w-8 text-gym-bg ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </button>
    </div>
    <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  </div>
)

const Testimonial = ({ name, role, text, initials }) => (
  <div className="rounded-xl border border-gym-border/60 bg-gym-bg/40 p-6 backdrop-blur-sm">
    <div className="mb-4 flex items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-gym-cyan/20 flex items-center justify-center text-gym-cyan font-display font-bold">
        {initials}
      </div>
      <div>
        <p className="font-display font-bold text-white">{name}</p>
        <p className="text-xs text-gym-muted">{role}</p>
      </div>
    </div>
    <p className="text-sm text-gym-muted italic">"{text}"</p>
  </div>
)

export default function LandingPage() {
  const { isAuthenticated, loading, user } = useAuth()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!loading && isAuthenticated) {
    const role = user?.role || 'user'
    return <Navigate to={role === 'trainer' ? '/trainer/dashboard' : '/dashboard'} replace />
  }

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text overflow-hidden">
      {/* Grid Background */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#00e5ff 1px,transparent 1px),linear-gradient(90deg,#00e5ff 1px,transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gym-cyan/5 rounded-full blur-3xl opacity-30" style={{ transform: `translateY(${scrollY * 0.5}px)` }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl opacity-30" style={{ transform: `translateY(${-scrollY * 0.3}px)` }} />
      </div>

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gym-border/40 bg-gym-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gym-cyan flex items-center justify-center group-hover:shadow-lg group-hover:shadow-gym-cyan/30 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5" className="w-6 h-6">
                <path d="M6 4v16M18 4v16M3 8h18M3 16h18" />
              </svg>
            </div>
            <div>
              <span className="font-display text-2xl font-bold tracking-wider text-white">GymPose</span>
              <span className="block text-[10px] text-gym-cyan font-mono tracking-widest">IA</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gym-muted hover:text-white transition-colors">Características</a>
            <a href="#results" className="text-sm text-gym-muted hover:text-white transition-colors">Resultados</a>
            <a href="#pricing" className="text-sm text-gym-muted hover:text-white transition-colors">Precios</a>
            <a href="#testimonials" className="text-sm text-gym-muted hover:text-white transition-colors">Testimonios</a>
          </nav>
          <AuthButtons />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeInUp">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.32em] text-gym-cyan">Revolución del Fitness</p>
              <h1 className="font-display text-5xl md:text-6xl font-extrabold leading-tight text-white mb-6">
                Tu Entrenador <GradientText>IA Personal</GradientText>
              </h1>
              <p className="text-lg text-gym-muted mb-8 leading-relaxed">
                Análisis de postura en tiempo real, planes personalizados y seguimiento de nutrición. Todo respaldado por inteligencia artificial de última generación.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  to="/register"
                  className="rounded-xl px-8 py-4 text-base font-display font-bold text-gym-bg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 30px rgba(0,229,255,0.4)' }}
                >
                  Comenzar Prueba Gratuita
                </Link>
                <button className="rounded-xl border-2 border-gym-cyan/40 px-8 py-4 text-base font-display font-bold text-gym-cyan hover:bg-gym-cyan/10 transition-all">
                  Ver Demo
                </button>
              </div>
              <p className="text-sm text-gym-muted">
                ✓ Sin tarjeta de crédito requerida · ✓ 7 días gratis · ✓ Cancela en cualquier momento
              </p>
            </div>
            <div className="hidden md:block relative">
              <VideoShowcase />
              <div className="absolute -bottom-4 -right-4 rounded-xl border border-gym-border/60 bg-gym-sidebar/80 backdrop-blur p-4 max-w-xs">
                <p className="text-xs text-gym-cyan font-mono mb-2">ANÁLISIS EN VIVO</p>
                <p className="text-sm text-white font-semibold">Postura: Correcta</p>
                <div className="mt-3 h-1 bg-gym-border rounded-full overflow-hidden">
                  <div className="h-full bg-gym-cyan" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 px-6 border-y border-gym-border/40">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StatCard number="150K+" label="Usuarios activos" />
            <StatCard number="2.5M+" label="Entrenamientos completados" />
            <StatCard number="94%" label="Mejora de forma" unit="%" />
            <StatCard number="47" label="Idiomas soportados" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-gym-cyan mb-3">Características Principales</p>
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Todo lo que necesitas para <GradientText>transformar tu cuerpo</GradientText>
            </h2>
            <p className="text-gym-muted max-w-2xl mx-auto">
              Herramientas inteligentes diseñadas para maximizar resultados y mantener la motivación
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Análisis de Postura IA"
              description="Detección en tiempo real con cámara web. Corrige tu forma automáticamente y evita lesiones."
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
              color="cyan"
            />
            <FeatureCard
              title="Planes Personalizados"
              description="IA adapta tu rutina según nivel, objetivos y equipamiento disponible. Progresión inteligente."
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
              color="cyan"
            />
            <FeatureCard
              title="Nutrición Inteligente"
              description="Seguimiento calórico automático, macros adaptados y recomendaciones de comidas personalizadas."
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />}
              color="cyan"
            />
            <FeatureCard
              title="Seguimiento de Progreso"
              description="Métricas detalladas: peso, volumen muscular, fuerza. Gráficos y análisis predictivos."
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
              color="cyan"
            />
            <FeatureCard
              title="Comunidad y Retos"
              description="Compite con otros usuarios, participa en desafíos mensuales y mantén la motivación."
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              color="cyan"
            />
            <FeatureCard
              title="Sincronización de Dispositivos"
              description="Conecta smartwatch, básculas inteligentes y aplicaciones de fitness para sincronización automática."
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />}
              color="cyan"
            />
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="relative py-20 px-6 bg-gym-bg/50 border-y border-gym-border/40">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl font-bold text-white mb-4">
                Análisis de Postura <GradientText>en Tiempo Real</GradientText>
              </h2>
              <p className="text-gym-muted mb-6 leading-relaxed">
                Nuestra IA monitorea cada movimiento. Detecta problemas de forma instantáneamente y te proporciona correcciones en tiempo real.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-gym-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gym-muted">Detección de ángulos articulares precisos</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-gym-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gym-muted">Prevención de lesiones automática</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-gym-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gym-muted">Feedback verbal y visual durante entrenamientos</span>
                </li>
              </ul>
              <Link
                to="/register"
                className="inline-block rounded-xl px-6 py-3 text-sm font-display font-bold text-gym-bg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)' }}
              >
                Probar Ahora
              </Link>
            </div>
            <div className="rounded-2xl border border-gym-border/60 bg-black overflow-hidden">
              <div className="aspect-square w-full bg-gradient-to-br from-gym-cyan/20 to-blue-900/20 flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-2 border-gym-cyan/30 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-2 border-gym-cyan/50 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gym-cyan/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section id="results" className="relative py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-gym-cyan mb-3">Resultados Comprobados</p>
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Transformaciones <GradientText>Reales de Usuarios</GradientText>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-gym-border/60 bg-gym-bg/40 p-8 backdrop-blur-sm">
              <div className="mb-6">
                <p className="text-4xl font-bold text-gym-cyan">-18kg</p>
                <p className="text-sm text-gym-muted">en 3 meses</p>
              </div>
              <p className="text-gym-muted mb-4">"GymPose cambió completamente mi forma de entrenar. La corrección de postura me ayudó a evitar lesiones y los planes personalizados realmente funcionan."</p>
              <p className="font-semibold text-white">Carlos M.</p>
              <p className="text-xs text-gym-muted">Pérdida de grasa</p>
            </div>

            <div className="rounded-2xl border border-gym-border/60 bg-gym-bg/40 p-8 backdrop-blur-sm">
              <div className="mb-6">
                <p className="text-4xl font-bold text-gym-cyan">+12kg</p>
                <p className="text-sm text-gym-muted">de músculo</p>
              </div>
              <p className="text-gym-muted mb-4">"Como atleta competidor, necesitaba precisión. El análisis de postura IA me permitió optimizar cada serie y ver resultados exponenciales."</p>
              <p className="font-semibold text-white">Alex V.</p>
              <p className="text-xs text-gym-muted">Ganancia muscular</p>
            </div>

            <div className="rounded-2xl border border-gym-border/60 bg-gym-bg/40 p-8 backdrop-blur-sm">
              <div className="mb-6">
                <p className="text-4xl font-bold text-gym-cyan">+35%</p>
                <p className="text-sm text-gym-muted">fuerza</p>
              </div>
              <p className="text-gym-muted mb-4">"Como principiante, estaba perdida. GymPose me guió en cada paso. Ahora levanto el doble de peso y con form perfecta."</p>
              <p className="font-semibold text-white">María L.</p>
              <p className="text-xs text-gym-muted">Incremento de fuerza</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-20 px-6 bg-gym-bg/50 border-y border-gym-border/40">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-gym-cyan mb-3">Planes Flexibles</p>
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Precios Simples y <GradientText>Transparentes</GradientText>
            </h2>
            <p className="text-gym-muted max-w-2xl mx-auto">
              Elige el plan perfecto para tus objetivos. Todos incluyen análisis de postura IA.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              plan="Básico"
              price="9"
              description="Perfecto para comenzar"
              features={[
                'Análisis de postura IA',
                'Planes de entrenamiento básicos',
                'Seguimiento de progreso',
                'Hasta 3 entrenamientos/mes',
                'Comunidad',
              ]}
            />
            <PricingCard
              plan="Pro"
              price="29"
              description="Más popular entre usuarios"
              features={[
                'Todo en Básico',
                'Planes personalizados avanzados',
                'Nutrición inteligente',
                'Entrenamientos ilimitados',
                'Acceso a todos los retos',
                'Soporte prioritario',
              ]}
              recommended={true}
            />
            <PricingCard
              plan="Elite"
              price="59"
              description="Para máximos resultados"
              features={[
                'Todo en Pro',
                'Entrenador IA 1:1 24/7',
                'Planes ultra personalizados',
                'Análisis biomecánico avanzado',
                'Video llamadas mensuales',
                'Acceso a investigaciones exclusivas',
              ]}
            />
          </div>

          <div className="mt-12 text-center">
            <p className="text-gym-muted mb-4">
              Todos los planes incluyen 7 días de prueba gratuita. No se requiere tarjeta de crédito.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-gym-cyan mb-3">Lo que dicen</p>
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Historias de <GradientText>Transformación</GradientText>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Testimonial
              name="Juan Pérez"
              role="Fitness Enthusiast"
              text="Mi espalda solía doler después de cada sesión. Gracias a los correctivos IA, ahora entreno sin dolor y veo mejor progreso."
              initials="JP"
            />
            <Testimonial
              name="Sofia García"
              role="Atleta"
              text="El análisis biomecánico me permitió optimizar mi técnica. Pasé de ser intermedio a competidor a nivel profesional."
              initials="SG"
            />
            <Testimonial
              name="Miguel López"
              role="Entrenador Personal"
              text="Recomiendo GymPose a todos mis clientes. Es como tener un segundo par de ojos expertos durante cada entrenamiento."
              initials="ML"
            />
            <Testimonial
              name="Andrea Martínez"
              role="Madre Ocupada"
              text="Con poco tiempo, GymPose me permite entrenar eficientemente. Los planes se adaptan a mi agenda perfectamente."
              initials="AM"
            />
            <Testimonial
              name="Roberto Díaz"
              role="Recuperación Post-Lesión"
              text="Después de lesionarme, GymPose me ayudó a recuperarme de forma segura. Realmente evita futuros problemas."
              initials="RD"
            />
            <Testimonial
              name="Diana Sánchez"
              role="Competidor de Fitness"
              text="Para preparar mi competición, necesitaba precisión total. GymPose fue mi arma secreta para ganar."
              initials="DS"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 bg-gradient-to-r from-gym-cyan/10 via-blue-500/10 to-gym-bg border-y border-gym-border/40">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-5xl font-bold text-white mb-6">
            ¿Listo para <GradientText>transformarte?</GradientText>
          </h2>
          <p className="text-xl text-gym-muted mb-10 leading-relaxed">
            Únete a 150,000+ usuarios que ya están alcanzando sus objetivos de fitness con inteligencia artificial.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <Link
              to="/register"
              className="rounded-xl px-8 py-4 text-base font-display font-bold text-gym-bg transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#00e5ff,#00b8d4)', boxShadow: '0 0 30px rgba(0,229,255,0.4)' }}
            >
              Comenzar Prueba Gratuita
            </Link>
            <button className="rounded-xl border-2 border-gym-cyan/40 px-8 py-4 text-base font-display font-bold text-gym-cyan hover:bg-gym-cyan/10 transition-all">
              Preguntas Frecuentes
            </button>
          </div>
          <p className="text-sm text-gym-muted">
            ✓ Sin tarjeta de crédito · ✓ 7 días gratis · ✓ Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gym-border/40 bg-gym-bg/50 py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gym-cyan flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M6 4v16M18 4v16M3 8h18M3 16h18" />
                  </svg>
                </div>
                <span className="font-display text-lg font-bold text-white">GymPose</span>
              </div>
              <p className="text-sm text-gym-muted">Rendimiento con IA</p>
            </div>
            <div>
              <p className="font-display font-bold text-white mb-4">Producto</p>
              <ul className="space-y-2 text-sm text-gym-muted">
                <li><a href="#features" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Aplicación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="font-display font-bold text-white mb-4">Compañía</p>
              <ul className="space-y-2 text-sm text-gym-muted">
                <li><a href="#" className="hover:text-white transition-colors">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Soporte</a></li>
              </ul>
            </div>
            <div>
              <p className="font-display font-bold text-white mb-4">Legal</p>
              <ul className="space-y-2 text-sm text-gym-muted">
                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gym-border/40 pt-8 text-center text-sm text-gym-muted">
            <p>&copy; 2026 GymPose. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
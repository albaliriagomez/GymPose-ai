import React, { useState, useRef, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────

function StatCard({ label, value, color, svg }) {
  return (
    <div className="bg-gym-sidebar border border-gym-border p-5 rounded-2xl relative overflow-hidden group">
      <div className={`absolute left-0 top-0 w-[2px] h-full ${color.replace('border', 'bg')} opacity-50`} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-lg bg-gym-bg border border-gym-border flex items-center justify-center text-gym-muted group-hover:text-gym-cyan transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            {svg}
          </svg>
        </div>
      </div>
      <p className="text-gym-muted text-[9px] font-mono tracking-widest">{label}</p>
      <p className="text-white font-bold text-xl">{value}</p>
    </div>
  );
}

function ProgressBar({ label, value, target, color, percent }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-mono">
        <span className="text-gym-muted uppercase tracking-tighter">{label}</span>
        <span className="text-white font-bold">
          {value}° <span className="text-gym-muted">/</span> <span className="text-gym-cyan">{target}°</span>
        </span>
      </div>
      <div className="h-1 bg-gym-accent rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-[1500ms] ease-out`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Overlay de error (imagen inválida / no es ejercicio)
// ─────────────────────────────────────────────

function ErrorOverlay({ message, onRetry }) {
  return (
    <div className="absolute inset-0 bg-gym-bg/90 flex flex-col items-center justify-center backdrop-blur-sm rounded-[22px] p-6 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <p className="text-white font-bold text-sm mb-2">No es una postura de ejercicio</p>
        <p className="text-gym-muted text-[11px] leading-relaxed max-w-xs">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-gym-cyan/10 border border-gym-cyan/30 text-gym-cyan text-[11px] font-mono rounded-xl hover:bg-gym-cyan/20 transition-all"
      >
        INTENTAR DE NUEVO
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Visualizador SVG con landmarks reales
// ─────────────────────────────────────────────

function PoseVisualizer({ preview, analysisData }) {
  if (!analysisData?.success) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gym-muted/30">
        <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="font-mono text-[9px] tracking-[0.2em]">WAITING_FOR_DATA</span>
      </div>
    );
  }

  const { lines, landmarks, angles } = analysisData;
  const kneeAngle = angles?.[0]?.value ?? '—';

  return (
    <>
      <img src={preview} className="w-full h-full object-cover opacity-40 blur-[1px]" alt="Pose" />
      <div className="absolute top-4 right-4 bg-gym-cyan/20 border border-gym-cyan/40 text-gym-cyan text-[10px] font-black px-2 py-1 rounded backdrop-blur-md">
        SCAN_ACTIVE
      </div>

      {/* SVG overlay con landmarks reales */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1 1" preserveAspectRatio="none">
        {/* Líneas del esqueleto */}
        {lines?.map((line, i) => (
          <line
            key={i}
            x1={line.start.x} y1={line.start.y}
            x2={line.end.x}   y2={line.end.y}
            stroke="#00e5ff" strokeWidth="0.005"
            strokeDasharray="0.02,0.01"
            opacity="0.8"
          />
        ))}

        {/* Puntos de articulación */}
        {landmarks?.map((lm, i) => (
          <circle key={i} cx={lm.x} cy={lm.y} r="0.012" fill="white" opacity="0.9" />
        ))}

        {/* Ángulo de rodilla en el punto de la rodilla izquierda */}
        {landmarks?.[2] && (
          <>
            <circle cx={landmarks[2].x} cy={landmarks[2].y} r="0.018"
              stroke="#00e5ff" strokeWidth="0.004" fill="none" opacity="0.7" />
            <text
              x={landmarks[2].x + 0.03}
              y={landmarks[2].y - 0.02}
              fill="#00e5ff" fontSize="0.035"
              fontWeight="bold" fontFamily="monospace"
            >
              θ: {kneeAngle}°
            </text>
          </>
        )}
      </svg>
    </>
  );
}

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────

export default function Posture() {
  const [preview, setPreview]           = useState(null);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [errorMsg, setErrorMsg]         = useState(null);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem('gympose_token')

  const resetState = useCallback(() => {
    setPreview(null);
    setAnalysisData(null);
    setErrorMsg(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrorMsg('Formato no soportado. Usa JPG o PNG.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsAnalyzing(true);
    setAnalysisData(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

     const response = await fetch(`${API_URL}/posture/analyze?token=${token}`, {
  method: 'POST',
  body: formData,
});

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${response.status}`);
      }

      const data = await response.json();
      setAnalysisData(data);

      if (!data.success) {
        setErrorMsg(data.validation_message || data.recommendations?.[0] || 'No se pudo analizar la postura.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo conectar con el servidor de análisis.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const showResults = analysisData?.success === true;
  const angles      = analysisData?.angles ?? [];
  const angle0      = angles[0] ?? { value: 0, target: 90,  percent: 0 };
  const angle1      = angles[1] ?? { value: 0, target: 45,  percent: 0 };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fadeInUp">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-gym-cyan text-[10px] font-mono tracking-[0.3em] uppercase mb-1">
              AI Computer Vision · MediaPipe
            </p>
            <h1 className="text-4xl font-display font-bold text-white">
              Analizador de <span className="text-gym-cyan text-glow-cyan">Biomecánica</span>
            </h1>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-gym-muted text-[10px] font-mono uppercase italic">Engine v4.2.0 — Active</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── IZQUIERDA: zona de carga ── */}
          <div className="lg:col-span-3 space-y-6">

            <div
              onClick={() => !isAnalyzing && fileInputRef.current.click()}
              className="aspect-[4/3] rounded-3xl border-2 border-dashed border-gym-cyan/20 bg-gym-sidebar/40 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-gym-cyan/40 transition-all group overflow-hidden relative"
            >
              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept=".jpg,.jpeg,.png"
                onChange={handleFileSelect}
              />

              {/* Sin imagen */}
              {!preview && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-gym-cyan/10 border border-gym-cyan/20 flex items-center justify-center text-gym-cyan group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">Subir captura de ejecución</p>
                    <p className="text-gym-muted text-xs mt-1">JPG, PNG · Máx 10 MB · Cuerpo completo visible</p>
                  </div>
                </>
              )}

              {/* Con imagen */}
              {preview && (
                <div className="relative w-full h-full">
                  <img src={preview} className="w-full h-full object-cover rounded-[22px]" alt="Preview" />

                  {/* Analizando */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-gym-bg/80 flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="w-12 h-12 border-4 border-gym-cyan/20 border-t-gym-cyan rounded-full animate-spin mb-4" />
                      <p className="text-gym-cyan font-mono text-[10px] tracking-widest animate-pulse font-bold">
                        ANALIZANDO VECTORES...
                      </p>
                    </div>
                  )}

                  {/* Error: no es ejercicio */}
                  {!isAnalyzing && errorMsg && (
                    <ErrorOverlay message={errorMsg} onRetry={resetState} />
                  )}
                </div>
              )}
            </div>

            {/* Tarjetas de métricas */}
            <div className={`grid grid-cols-3 gap-4 transition-all duration-700 ${showResults ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
              <StatCard
                label="PRECISIÓN"
                value={showResults ? `${analysisData.precision}%` : '—'}
                color="border-gym-cyan"
                svg={<path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />}
              />
              <StatCard
                label="LATENCIA"
                value={showResults ? `${analysisData.latency_ms}ms` : '—'}
                color="border-orange-400"
                svg={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
              />
              <StatCard
                label="EJERCICIO"
                value={showResults ? (analysisData.exercise_type ?? 'Detectado') : '—'}
                color="border-gym-green"
                svg={<path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
              />
            </div>
          </div>

          {/* ── DERECHA: resultados ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Visualizador con landmarks reales */}
            <div className="relative aspect-video rounded-3xl bg-gym-sidebar border border-gym-border overflow-hidden">
              <PoseVisualizer preview={preview} analysisData={analysisData} />
            </div>

            {/* Métricas de ángulo */}
            <div className="bg-gym-sidebar/60 border border-gym-border rounded-3xl p-6">
              <h3 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
                <div className="w-1 h-4 bg-gym-cyan rounded-full" />
                Métricas de Ángulo
              </h3>
              <div className="space-y-6">
                <ProgressBar
                  label="Flexión de Rodilla"
                  value={angle0.value}
                  target={angle0.target}
                  color="bg-gym-cyan"
                  percent={angle0.percent}
                />
                <ProgressBar
                  label="Inclinación Torso"
                  value={angle1.value}
                  target={angle1.target}
                  color="bg-yellow-500"
                  percent={angle1.percent}
                />
              </div>
            </div>

            {/* Sugerencias reales */}
            {showResults && analysisData.recommendations?.map((rec, i) => (
              <div
                key={i}
                className={`bg-gym-sidebar border border-gym-border p-5 rounded-2xl flex gap-4 transition-all duration-500 border-l-4 border-l-gym-cyan`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-gym-cyan/10 border border-gym-cyan/20 flex items-center justify-center flex-shrink-0 text-gym-cyan">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-1 uppercase tracking-tighter">
                    Sugerencia Postural {analysisData.recommendations.length > 1 ? `#${i + 1}` : ''}
                  </h4>
                  <p className="text-gym-muted text-[11px] leading-relaxed">{rec}</p>
                </div>
              </div>
            ))}

            {/* Logro */}
            {showResults && (
              <div className="bg-yellow-500 p-4 rounded-2xl flex items-center gap-3 animate-fadeInUp">
                <div className="bg-black/10 p-2 rounded-lg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" className="w-5 h-5">
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-black/60 text-[9px] font-black uppercase">Ejercicio Detectado</p>
                  <p className="text-black font-bold text-xs italic tracking-tight">
                    {analysisData.exercise_type ?? 'Postura analizada'} · Precisión {analysisData.precision}%
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
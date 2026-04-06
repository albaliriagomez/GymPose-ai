import React, { useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function Posture() {
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      setPreview(URL.createObjectURL(file));
      setIsUploading(true);
      setShowResults(false);
      
      setTimeout(() => {
        setIsUploading(false);
        setShowResults(true);
      }, 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fadeInUp">
        
        {/* Encabezado Profesional */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-gym-cyan text-[10px] font-mono tracking-[0.3em] uppercase mb-1">AI Computer Vision</p>
            <h1 className="text-4xl font-display font-bold text-white">
              Analizador de <span className="text-gym-cyan text-glow-cyan">Biomecánica</span>
            </h1>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-gym-muted text-[10px] font-mono uppercase italic">Engine v4.2.0 - Active</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* BLOQUE IZQUIERDO: CARGA */}
          <div className="lg:col-span-3 space-y-6">
            <div 
              onClick={() => fileInputRef.current.click()}
              className="aspect-[4/3] rounded-3xl border-2 border-dashed border-gym-cyan/20 bg-gym-sidebar/40 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-gym-cyan/40 transition-all group overflow-hidden relative"
            >
              <input type="file" ref={fileInputRef} hidden accept=".jpg,.png" onChange={handleFileSelect} />
              
              {!preview ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-gym-cyan/10 border border-gym-cyan/20 flex items-center justify-center text-gym-cyan group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">Subir captura de ejecución</p>
                    <p className="text-gym-muted text-xs mt-1">Formatos soportados: JPG, PNG • Max 10MB</p>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full">
                  <img src={preview} className="w-full h-full object-cover rounded-[22px]" alt="Preview" />
                  {isUploading && (
                    <div className="absolute inset-0 bg-gym-bg/80 flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="w-12 h-12 border-4 border-gym-cyan/20 border-t-gym-cyan rounded-full animate-spin mb-4"></div>
                      <p className="text-gym-cyan font-mono text-[10px] tracking-widest animate-pulse font-bold">ANALIZANDO VECTORES...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TARJETAS DE ESTADO CON ICONOS PRO */}
            <div className={`grid grid-cols-3 gap-4 transition-all duration-700 ${showResults ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
              <StatCard 
                label="PRECISIÓN" 
                value="98.2%" 
                color="border-gym-cyan"
                svg={<path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>} 
              />
              <StatCard 
                label="LATENCIA" 
                value="140ms" 
                color="border-orange-400"
                svg={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />} 
              />
              <StatCard 
                label="MÉTODO" 
                value="MediaPipe" 
                color="border-gym-green"
                svg={<path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />} 
              />
            </div>
          </div>

          {/* BLOQUE DERECHO: RESULTADOS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visualizador IA */}
            <div className="relative aspect-video rounded-3xl bg-gym-sidebar border border-gym-border overflow-hidden">
              {showResults ? (
                <>
                  <img src={preview} className="w-full h-full object-cover opacity-40 blur-[1px]" />
                  <div className="absolute top-4 right-4 bg-gym-cyan/20 border border-gym-cyan/40 text-gym-cyan text-[10px] font-black px-2 py-1 rounded backdrop-blur-md">SCAN_ACTIVE</div>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60">
                    <line x1="30" y1="20" x2="50" y2="45" stroke="#00e5ff" strokeWidth="0.5" strokeDasharray="2,1" />
                    <line x1="50" y1="45" x2="80" y2="48" stroke="#00e5ff" strokeWidth="0.5" strokeDasharray="2,1" />
                    <circle cx="50" cy="45" r="1" fill="white" className="animate-pulse" />
                    <text x="53" y="42" fill="#00e5ff" fontSize="3" fontClassName="font-mono" fontWeight="bold">θ: 92.4°</text>
                  </svg>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gym-muted/30">
                  <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                  <span className="font-mono text-[9px] tracking-[0.2em]">WAITING_FOR_DATA</span>
                </div>
              )}
            </div>

            {/* Métricas de Ángulo */}
            <div className="bg-gym-sidebar/60 border border-gym-border rounded-3xl p-6">
              <h3 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
                <div className="w-1 h-4 bg-gym-cyan rounded-full" /> Métricas de Ángulo
              </h3>
              <div className="space-y-6">
                <ProgressBar label="Flexión de Rodilla" value="92°" target="90°" color="bg-gym-cyan" percent="92%" />
                <ProgressBar label="Inclinación Torso" value="44°" target="45°" color="bg-yellow-500" percent="44%" />
              </div>
            </div>

            {/* Recomendación IA con Estilo Pro */}
            <div className={`bg-gym-sidebar border border-gym-border p-5 rounded-2xl flex gap-4 transition-all duration-500 border-l-4 border-l-gym-cyan ${showResults ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
               <div className="w-10 h-10 rounded-xl bg-gym-cyan/10 border border-gym-cyan/20 flex items-center justify-center flex-shrink-0 text-gym-cyan">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-bold text-xs mb-1 uppercase tracking-tighter">Sugerencia Postural</h4>
                <p className="text-gym-muted text-[11px] leading-relaxed">
                  "Detectamos un leve adelantamiento de rodillas. <span className="text-gym-cyan font-bold">Distribuye el peso hacia los talones</span> para proteger la articulación."
                </p>
              </div>
            </div>

            {/* Banner Hito */}
            <div className={`bg-yellow-500 p-4 rounded-2xl flex items-center gap-3 transition-all delay-500 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="bg-black/10 p-2 rounded-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 8.25v-1.5m0 1.5c-1.355 0-2.497.867-2.925 2.073L7.5 13.5h9l-1.575-3.177c-.428-1.206-1.57-2.073-2.925-2.073zM12 17.25h.01m0 0a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                </svg>
              </div>
              <div>
                <p className="text-black/60 text-[9px] font-black uppercase">Logro Detectado</p>
                <p className="text-black font-bold text-xs italic tracking-tight">Estabilidad del core aumentada +15%</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, svg, color }) {
  return (
    <div className={`bg-gym-sidebar border border-gym-border p-5 rounded-2xl relative overflow-hidden group`}>
      <div className={`absolute left-0 top-0 w-[2px] h-full ${color.replace('border', 'bg')} opacity-50`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-8 h-8 rounded-lg bg-gym-bg border border-gym-border flex items-center justify-center text-gym-muted group-hover:text-gym-cyan transition-colors`}>
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
        <span className="text-white font-bold">{value} <span className="text-gym-muted">/</span> <span className="text-gym-cyan">{target}</span></span>
      </div>
      <div className="h-1 bg-gym-accent rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-[1500ms] ease-out`} style={{ width: percent }}></div>
      </div>
    </div>
  );
}
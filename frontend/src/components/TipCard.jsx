import React from "react";

const TipCard = ({
  title = "Hidratacion Inteligente",
  content = "Mantente hidratado durante el dia.",
}) => {
  return (
    <div className="relative rounded-lg border border-gym-cyan bg-gym-card p-6 backdrop-blur-sm animate-glow-pulse transition-all duration-300">
      <div className="flex items-center gap-2 mb-4 animate-slide-in-right animation-delay-100">
        <div className="w-5 h-5 text-gym-cyan animate-bounce" style={{ animationDuration: "2s" }}>
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-gym-cyan tracking-wider uppercase">TIP DEL DIA</span>
      </div>

      <h3 className="text-xl font-bold text-gym-yellow mb-3 leading-tight animate-slide-in-right animation-delay-150">{title}</h3>
      <p className="text-sm text-gym-text leading-relaxed mb-1 text-justify">{content}</p>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gym-cyan opacity-5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
    </div>
  );
};

export default TipCard;

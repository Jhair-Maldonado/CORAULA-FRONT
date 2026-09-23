'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export const GlobalLoader = () => {
  const [progress, setProgress] = useState(0);

  // Simula progreso que avanza hasta 90% y se queda ahí (esperando la red real)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAF9F6] flex flex-col items-center justify-center">

      {/* Círculos decorativos sutiles (opcional — misma línea visual del login) */}
      <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full border-[22px] border-accent/10 z-0 pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-accent/5 z-0 pointer-events-none" />

      <style>{`
        .pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(0.96); }
        }
        .bar-fill {
          transition: width 0.3s ease-out;
        }
      `}</style>

      {/* Contenedor principal */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Logo pulsando */}
        <div className="relative w-20 h-20 pulse-slow mb-7 flex items-center justify-center">
          <Image
            src="/logo.ico"
            alt="CORAULA Logo"
            fill
            className="object-contain"
          />
        </div>

        {/* Texto */}
        <h2 className="text-ink font-bold tracking-[0.2em] uppercase text-sm mb-1">
          Iniciando sesión
        </h2>
        <p className="text-muted text-[11px] font-medium mb-6">
          Preparando tu espacio de trabajo...
        </p>

        {/* Barra de progreso */}
        <div className="w-64 sm:w-72 h-1.5 bg-line/40 rounded-full overflow-hidden">
          <div
            className="bar-fill h-full bg-accent rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Porcentaje */}
        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-muted">
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>

      </div>
    </div>
  );
};
// src/components/alumno/TendenciaProgresoChart.tsx
import React from 'react';
import { TendenciaProgresoItem } from '@/types/alumno';

interface TendenciaProgresoChartProps {
  promedioGeneral: number;
  comparativaPeriodo?: string;
  tendencia: TendenciaProgresoItem[];
  notaMaxima?: number;
  className?: string;
}

export const TendenciaProgresoChart: React.FC<TendenciaProgresoChartProps> = ({
  promedioGeneral,
  comparativaPeriodo = '+0.8 vs. Semestre 0',
  tendencia,
  notaMaxima = 20,
  className = ''
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-3.5 ${className}`}
    >
      <div>
        <span className="text-[13px] font-semibold text-[#6B7280] block">
          Promedio General Actual
        </span>
        <div className="text-[34px] font-black text-[#BE123C] tracking-tight leading-tight my-1">
          {promedioGeneral.toFixed(1)} / {notaMaxima}
        </div>
        <span className="text-[12px] font-bold text-[#15803D] inline-block">
          {comparativaPeriodo}
        </span>
      </div>

      <div className="h-px bg-[#E5E7EB] w-full my-1" />

      <div>
        <h4 className="text-[13px] font-bold text-[#111827] mb-3">
          Tendencia de progreso
        </h4>

        {/* 6 Bars Chart */}
        <div className="flex items-end justify-between h-[120px] px-2 pt-2 pb-1">
          {tendencia.map((item) => {
            // Calculate height percent based on nota out of 20
            const heightPercent = Math.max(30, Math.min(100, Math.round((item.nota / 20) * 100)));
            const isHighlight = item.esActual || item.periodo === 'S6';

            return (
              <div
                key={item.periodo}
                className="flex flex-col items-center gap-1.5 group cursor-default"
                title={`${item.periodo}: ${item.nota.toFixed(1)}`}
              >
                <div
                  className={`w-3.5 rounded-t-md transition-all duration-300 ${
                    isHighlight
                      ? 'bg-[#BE123C] group-hover:bg-[#9F1239]'
                      : 'bg-[#FFE4E6] group-hover:bg-[#FECDD3]'
                  }`}
                  style={{ height: `${heightPercent}px` }}
                />
                <span
                  className={`text-[10px] font-semibold ${
                    isHighlight ? 'text-[#BE123C] font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  {item.periodo}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-[#6B7280] font-medium leading-relaxed mt-3">
          Tus resultados muestran una evolución constante.
        </p>
      </div>
    </div>
  );
};

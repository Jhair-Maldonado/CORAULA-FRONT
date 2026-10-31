'use client';

import React from 'react';
import { Calendar01Icon, FilterIcon, AlertCircleIcon } from 'hugeicons-react';
import { calcularDiferenciaDias } from '../useApodAsistencia';

interface FiltroRangoFechasProps {
  from: string;
  to: string;
  onCambiarRango: (from: string, to: string) => void;
  disabled?: boolean;
}

export const FiltroRangoFechas: React.FC<FiltroRangoFechasProps> = ({
  from,
  to,
  onCambiarRango,
  disabled = false,
}) => {
  const diasSeleccionados = calcularDiferenciaDias(from, to);
  const esExcesivo = diasSeleccionados > 92;

  const aplicarPreset = (diasAtras: number) => {
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(hoy.getDate() - diasAtras);

    onCambiarRango(
      inicio.toISOString().split('T')[0],
      hoy.toISOString().split('T')[0]
    );
  };

  const aplicarMesActual = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    onCambiarRango(
      primerDia.toISOString().split('T')[0],
      hoy.toISOString().split('T')[0]
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-line p-4 shadow-2xs mb-6 flex flex-col gap-3">
      {/* Barra superior de Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-line/60">
        <div className="flex items-center gap-1.5 text-muted text-xs font-bold uppercase tracking-wider">
          <FilterIcon size={14} />
          <span>Rango de Consulta (Máx. 92 días)</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => aplicarPreset(7)}
            disabled={disabled}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral hover:bg-slate-200 text-ink transition-colors cursor-pointer disabled:opacity-50"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset(30)}
            disabled={disabled}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral hover:bg-slate-200 text-ink transition-colors cursor-pointer disabled:opacity-50"
          >
            Últimos 30 días
          </button>
          <button
            type="button"
            onClick={aplicarMesActual}
            disabled={disabled}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral hover:bg-slate-200 text-ink transition-colors cursor-pointer disabled:opacity-50"
          >
            Este Mes
          </button>
        </div>
      </div>

      {/* Inputs de Fechas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Fecha Desde */}
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-line px-3 py-1.5 rounded-xl">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0">Desde:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => onCambiarRango(e.target.value, to)}
            disabled={disabled}
            max={to}
            className="w-full bg-transparent text-xs font-bold text-ink outline-none cursor-pointer"
          />
        </div>

        {/* Fecha Hasta */}
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-line px-3 py-1.5 rounded-xl">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0">Hasta:</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onCambiarRango(from, e.target.value)}
            disabled={disabled}
            min={from}
            max={new Date().toISOString().split('T')[0]}
            className="w-full bg-transparent text-xs font-bold text-ink outline-none cursor-pointer"
          />
        </div>

        {/* Badge contador de días */}
        <div className="shrink-0 flex items-center justify-end">
          <span
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border ${
              esExcesivo
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-neutral text-ink/80 border-slate-200'
            }`}
          >
            <Calendar01Icon size={14} />
            <span>{diasSeleccionados > 0 ? `${diasSeleccionados} días` : 'Rango inválido'}</span>
          </span>
        </div>
      </div>

      {esExcesivo && (
        <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 mt-0.5">
          <AlertCircleIcon size={12} />
          El rango seleccionado excede el límite máximo de 92 días estipulado por el backend (BACK #55).
        </p>
      )}
    </div>
  );
};

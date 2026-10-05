'use client';

import React, { useMemo, useEffect, useState } from 'react';
import {
  Clock01Icon,
  ChartHistogramIcon,
  CheckmarkBadge01Icon,
  Task01Icon,
  RefreshIcon,
  ArrowRight01Icon,
  Alert01Icon,
} from 'hugeicons-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { ResumenDashboardPadre } from '@/types/padre';

const MOCK_HISTORIAL = [
  { name: '1 Bim', promedio: 14.5 },
  { name: '2 Bim', promedio: 15.2 },
  { name: '3 Bim', promedio: 13.8 },
  { name: '4 Bim', promedio: 16.1 },
];

// Ruta de hoy (mock — reemplaza por resumen.rutaHoy cuando venga del backend)
const RUTA_HOY = [
  { horaInicio: '08:00', horaFin: '09:30', curso: 'Comunicación',       aula: 'Aula 104',       docente: 'Prof. Ana Soto' },
  { horaInicio: '09:30', horaFin: '11:00', curso: 'Matemáticas',        aula: 'Aula 104',       docente: 'Prof. Luis Vega' },
  { horaInicio: '11:00', horaFin: '11:30', curso: 'Recreo',             aula: 'Patio Principal' },
  { horaInicio: '11:30', horaFin: '13:00', curso: 'Ciencias Naturales', aula: 'Laboratorio 2' },
];

interface TabResumenProps {
  resumen: ResumenDashboardPadre;
}

// Tooltip custom minimalista
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  const ref = v >= 14 ? 'Buen rendimiento' : v >= 11 ? 'En proceso' : 'En riesgo';
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-md border border-line">
      <p className="text-[9px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className="text-[11px] font-black text-ink">{v.toFixed(1)} / 20</p>
      <p className="text-[9px] text-muted mt-0.5">{ref}</p>
    </div>
  );
};

export function TabResumen({ resumen }: TabResumenProps) {
  const hijo = resumen.hijo?.[0];

  // Reloj vivo cada 30s
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

  const { cursoActual, proximoCurso, minutosParaProximo } = useMemo(() => {
    const conMin = RUTA_HOY.map((r) => {
      const [hI, mI] = r.horaInicio.split(':').map(Number);
      const [hF, mF] = r.horaFin.split(':').map(Number);
      return { ...r, inicio: hI * 60 + mI, fin: hF * 60 + mF };
    });
    const actual = conMin.find((r) => minutosActuales >= r.inicio && minutosActuales <= r.fin) || null;
    const proximo = actual ? null : conMin.find((r) => r.inicio > minutosActuales) || null;
    const minutos = proximo ? proximo.inicio - minutosActuales : null;
    return { cursoActual: actual, proximoCurso: proximo, minutosParaProximo: minutos };
  }, [minutosActuales]);

  // Estado vacío
  if (!hijo) {
    return (
      <div className="bg-white rounded-2xl border border-line p-10 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-neutral flex items-center justify-center text-muted mb-3">
          <Alert01Icon size={20} />
        </div>
        <h3 className="text-[11px] font-black text-ink uppercase tracking-wider mb-1">
          Sin datos disponibles
        </h3>
        <p className="text-[10px] text-muted">Aún no hay información de este estudiante.</p>
      </div>
    );
  }

  const asistenciaHoy = hijo.asistenciaHoy; // true | false | undefined
  const horaEntrada = hijo.horaEntrada;      // "08:03" opcional

  // Tendencia del último bimestre
  const ultimo = MOCK_HISTORIAL[MOCK_HISTORIAL.length - 1];
  const penultimo = MOCK_HISTORIAL[MOCK_HISTORIAL.length - 2];
  const delta = ultimo.promedio - penultimo.promedio;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* ============ Izquierda: Timeline ============ */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center">
            <Clock01Icon size={18} />
          </div>
          <h3 className="text-[11px] font-black text-ink uppercase tracking-wider">Ruta de Hoy</h3>
          {cursoActual && (
            <span className="ml-auto text-[9px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-full">
              ● Ahora
            </span>
          )}
        </div>

        <div className="relative pl-6 border-l-2 border-line space-y-6 flex-1">
          {RUTA_HOY.map((item, i) => {
            const [hI, mI] = item.horaInicio.split(':').map(Number);
            const [hF, mF] = item.horaFin.split(':').map(Number);
            const inicio = hI * 60 + mI;
            const fin = hF * 60 + mF;
            const esActual = minutosActuales >= inicio && minutosActuales <= fin;
            const esPasado = fin < minutosActuales;

            return (
              <div key={i} className={`relative ${esPasado ? 'opacity-50' : ''}`}>
                <span
                  className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full ring-4 ring-white ${
                    esActual
                      ? 'bg-success animate-pulse'
                      : esPasado
                      ? 'bg-line'
                      : item.curso === 'Recreo'
                      ? 'bg-[#FEF3C7]'
                      : 'bg-accent-soft'
                  }`}
                />
                <div>
                  <span
                    className={`text-[9px] font-bold mb-1 block uppercase ${
                      esActual ? 'text-success-ink' : esPasado ? 'text-muted' : item.curso === 'Recreo' ? 'text-warning-ink' : 'text-accent'
                    }`}
                  >
                    {item.horaInicio} - {item.horaFin}
                  </span>
                  <h4 className={`text-[10px] font-bold ${esPasado ? 'text-muted' : 'text-ink'}`}>
                    {item.curso}
                  </h4>
                  <p className="text-[9px] font-medium text-muted mt-1">
                    {item.aula}
                    {item.docente ? ` • ${item.docente}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Próximo curso / aviso */}
        {proximoCurso && minutosParaProximo !== null && (
          <div className="mt-4 flex items-center gap-2 text-[9px]">
            <ArrowRight01Icon size={12} className="text-accent shrink-0" />
            <span className="font-bold text-muted uppercase tracking-wider">Próximo:</span>
            <span className="font-bold text-ink truncate">{proximoCurso.curso}</span>
            <span className="text-muted">· en {minutosParaProximo} min</span>
          </div>
        )}

        {/* Asistencia de hoy — sutil */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              asistenciaHoy === true
                ? 'bg-success'
                : asistenciaHoy === false
                ? 'bg-red-500'
                : 'bg-line'
            }`}
          />
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
            Asistencia hoy:{' '}
            <span className="text-ink">
              {asistenciaHoy === true
                ? `Presente${horaEntrada ? ` · entró ${horaEntrada}` : ''}`
                : asistenciaHoy === false
                ? 'Ausente'
                : 'Pendiente'}
            </span>
          </p>
        </div>
      </div>

      {/* ============ Derecha: KPIs + Gráfico ============ */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {/* Promedio */}
          <div className="bg-neutral rounded-2xl p-3 sm:p-4 border border-line flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center text-ink shadow-sm shrink-0">
              <ChartHistogramIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">Promedio</p>
              <p className="text-xs font-black text-ink truncate">
                {hijo.promedio.toFixed(1)}{' '}
                <span className="text-[9px] font-semibold text-muted">/ 20</span>
              </p>
              <p
                className={`text-[8px] font-bold mt-0.5 ${
                  delta >= 0 ? 'text-success-ink' : 'text-warning-ink'
                }`}
              >
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} vs anterior
              </p>
            </div>
          </div>

          {/* Asistencia */}
          <div className="bg-neutral rounded-2xl p-3 sm:p-4 border border-line flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center text-ink shadow-sm shrink-0">
              <CheckmarkBadge01Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">Asistencia</p>
              <p className="text-xs font-black text-ink">{hijo.asistencia}%</p>
              <p className="text-[8px] font-bold text-muted mt-0.5">Este bimestre</p>
            </div>
          </div>

          {/* Cursos Bajos — alerta si > 0 */}
          <div
            className={`rounded-2xl p-3 sm:p-4 border flex items-center gap-3 relative ${
              (hijo.cursosBajos || 0) > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-accent-soft/50 border-accent-soft'
            }`}
          >
            {(hijo.cursosBajos || 0) > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
            <div
              className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border ${
                (hijo.cursosBajos || 0) > 0 ? 'border-red-200 text-red-500' : 'border-accent-soft text-accent'
              }`}
            >
              <Task01Icon size={16} />
            </div>
            <div className="min-w-0">
              <p
                className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${
                  (hijo.cursosBajos || 0) > 0 ? 'text-red-500' : 'text-accent'
                }`}
              >
                Cursos Bajos
              </p>
              <p
                className={`text-xs font-black ${
                  (hijo.cursosBajos || 0) > 0 ? 'text-red-600' : 'text-accent'
                }`}
              >
                {hijo.cursosBajos || 0}
              </p>
              {(hijo.cursosBajos || 0) > 0 && (
                <p className="text-[8px] font-bold text-red-500 mt-0.5">Requiere atención</p>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico lineal */}
        <div className="bg-white rounded-2xl border border-line p-4 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold text-ink uppercase tracking-wider">Evolución Anual</h3>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-muted flex items-center gap-1">
                <RefreshIcon size={9} /> hace 5 min
              </span>
              <span className="text-[9px] font-bold bg-neutral text-muted px-2 py-1 rounded-md">2026</span>
            </div>
          </div>

          <div className="h-40 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_HISTORIAL} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 600 }}
                  domain={[0, 20]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
                {/* Zona de riesgo (Desaprobado) */}
                <ReferenceArea
                  y1={0}
                  y2={11}
                  fill="#FEF2F2" // red-50
                  fillOpacity={1}
                />
                {/* Línea de referencia: aprobado */}
                <ReferenceLine
                  y={11}
                  stroke="#E11D48" // rose-600
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Desaprobado', position: 'insideTopLeft', fontSize: 9, fill: '#E11D48', fontWeight: 800 }}
                />
                <Area
                  type="monotone"
                  dataKey="promedio"
                  stroke="#6366F1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPromedio)"
                  dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
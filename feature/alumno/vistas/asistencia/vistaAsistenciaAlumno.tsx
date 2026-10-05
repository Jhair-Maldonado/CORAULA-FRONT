'use client';

import React, { useEffect, useState } from 'react';
import { getAsistenciaAlumno } from '@/lib/api';
import { ResumenAsistenciaAlumno } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheck } from 'lucide-react';
import { CalendarioAsistenciaAlumno } from './calendarioAsistenciaAlumno';

const MESES = ['Junio 2026', 'Julio 2026', 'Agosto 2026', 'Septiembre 2026'];

export default function VistaAsistenciaAlumno() {
  const [data, setData] = useState<ResumenAsistenciaAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMes, setSelectedMes] = useState('Septiembre 2026');
  const [selectedTipo, setSelectedTipo] = useState('Todas las marcaciones');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAsistenciaAlumno(selectedMes);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el registro de asistencia');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => {
    fetchData();
  }, [selectedMes]);

  const mesIndex = MESES.indexOf(selectedMes);
  const canPrev = mesIndex > 0;
  const canNext = mesIndex < MESES.length - 1;

  const handlePrevMes = () => {
    if (canPrev) setSelectedMes(MESES[mesIndex - 1]);
  };

  const handleNextMes = () => {
    if (canNext) setSelectedMes(MESES[mesIndex + 1]);
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <TableSkeleton rows={5} />
          </div>
          <div className="lg:col-span-4">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No pudimos cargar tu registro de asistencia"
        message={error}
        onRetry={fetchData}
      />
    );
  }

  const filteredMarcaciones = data
    ? data.marcaciones.filter((m) => {
        if (selectedTipo === 'Todas las marcaciones') return true;
        if (selectedTipo === 'Puntuales') return m.estado === 'Puntual';
        if (selectedTipo === 'Tardanzas') return m.estado === 'Tardanza';
        if (selectedTipo === 'Justificadas') return m.estado === 'Justificada';
        return true;
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <AlumnoHeader
        eyebrow="Control Biométrico"
        title="Registro de Asistencia del Alumno"
        subtitle="Monitoreo diario de ingresos escolares y justificaciones"
        actionRight={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider hidden sm:block">Tipo de Evento</span>
            <select 
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="text-[11px] font-black text-[#111827] bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#111827] transition-all shadow-sm cursor-pointer"
            >
              {['Todas las marcaciones', 'Puntuales', 'Tardanzas', 'Justificadas'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Columns: Table Left + Summary Right */}
      {data && filteredMarcaciones.length === 0 ? (
        <EmptyState
          title="No hay marcaciones para este filtro"
          description="Selecciona otro tipo de evento para consultar tus registros de ingreso."
          actionText="Ver todas las marcaciones"
          onAction={() => setSelectedTipo('Todas las marcaciones')}
        />
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Content Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Historial de Marcaciones Diarias
                </h3>
                <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                  Control biométrico de ingreso y salida escolar
                </p>
              </div>
            </div>

            <div className="mt-2 flex-1">
              <CalendarioAsistenciaAlumno 
                marcaciones={filteredMarcaciones} 
                mesActual={selectedMes} 
                onPrevMes={handlePrevMes}
                onNextMes={handleNextMes}
                canPrev={canPrev}
                canNext={canNext}
              />
            </div>
          </div>

          {/* Right Card: Summary (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col overflow-hidden h-fit">
            <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-[11px] font-black text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#6B7280]" />
                Resumen de {selectedMes}
              </h3>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6B7280] font-bold uppercase tracking-wider">Asistencias Puntuales</span>
                  <span className="font-black text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">{data.asistenciasPuntuales} días</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6B7280] font-bold uppercase tracking-wider">Tardanzas Registradas</span>
                  <span className="font-black text-[#BE123C] bg-[#FFE4E6] px-2 py-0.5 rounded-full">{data.tardanzasRegistradas} día(s)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6B7280] font-bold uppercase tracking-wider">Faltas Justificadas</span>
                  <span className="font-black text-[#4B5563] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{data.faltasJustificadas} día(s)</span>
                </div>
              </div>

              <div className="h-px bg-[#E5E7EB] w-full" />

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-wider block mb-1">
                  Porcentaje de Asistencia
                </span>
                <div className="flex items-end gap-2 mb-2">
                  <div className="text-[28px] font-black text-[#15803D] leading-none tracking-tight">
                    {data.porcentajeAsistencia}%
                  </div>
                </div>
                <p className="text-[9px] text-[#4B5563] font-medium leading-relaxed">
                  Cumples con el 85% mínimo reglamentario para aprobación académica del periodo.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

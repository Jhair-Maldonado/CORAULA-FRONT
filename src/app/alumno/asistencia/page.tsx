// src/app/alumno/asistencia/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getAsistenciaAlumno } from '@/lib/api';
import { ResumenAsistenciaAlumno } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Fingerprint, ShieldCheck } from 'lucide-react';

export default function AlumnoAsistenciaPage() {
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

  useEffect(() => {
    fetchData();
  }, [selectedMes]);

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
      />

      {/* Filter Bar */}
      <AlumnoFilterBar
        filters={[
          {
            label: 'Mes Calendario',
            value: selectedMes,
            options: ['Septiembre 2026', 'Agosto 2026', 'Julio 2026', 'Junio 2026'],
            onChange: setSelectedMes
          },
          {
            label: 'Tipo de Evento',
            value: selectedTipo,
            options: ['Todas las marcaciones', 'Puntuales', 'Tardanzas', 'Justificadas'],
            onChange: setSelectedTipo
          }
        ]}
        badgeText={`${data?.porcentajeAsistencia || 96.4}% Asistencia`}
        badgeVariant="success"
      />

      {/* Columns: Table Left + Summary Right */}
      {data && filteredMarcaciones.length === 0 ? (
        <EmptyState
          title="No hay marcaciones para este filtro"
          description="Selecciona otro tipo de evento o mes para consultar tus registros de ingreso."
          actionText="Ver todas las marcaciones"
          onAction={() => setSelectedTipo('Todas las marcaciones')}
        />
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Table Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Historial de Marcaciones Diarias
              </h3>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Control biométrico de ingreso y salida escolar
              </p>
            </div>

            <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Fecha
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Hora
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Método
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                      Estado
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Observación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMarcaciones.map((m) => {
                    const isPuntual = m.estado === 'Puntual';
                    const isTardanza = m.estado === 'Tardanza';

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 text-[13px] font-bold text-[#111827]">
                          {m.fecha}
                        </td>
                        <td className="py-3 px-3 text-[12px] text-[#6B7280]">
                          {m.hora}
                        </td>
                        <td className="py-3 px-3 text-[12px] text-[#111827] flex items-center gap-1.5">
                          <Fingerprint className="w-3.5 h-3.5 text-[#6B7280]" />
                          {m.metodo}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isPuntual
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : isTardanza
                                ? 'bg-[#FFE4E6] text-[#BE123C]'
                                : 'bg-[#F3F4F6] text-[#4B5563]'
                            }`}
                          >
                            {m.estado}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[12px] text-[#6B7280]">
                          {m.observacion}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Card: Summary (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-3.5">
            <h4 className="text-sm font-bold text-[#111827]">
              Resumen Mensual ({data.mesActual})
            </h4>

            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-[#6B7280]">Asistencias Puntuales</span>
              <span className="font-bold text-[#15803D]">{data.asistenciasPuntuales} días</span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-[#6B7280]">Tardanzas Registradas</span>
              <span className="font-bold text-[#A16207]">{data.tardanzasRegistradas} día</span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-[#6B7280]">Faltas Justificadas</span>
              <span className="font-bold text-[#111827]">{data.faltasJustificadas} día</span>
            </div>

            <div className="h-px bg-[#E5E7EB] w-full my-1" />

            <div>
              <span className="text-[12px] font-semibold text-[#6B7280] block">
                Porcentaje de Asistencia
              </span>
              <div className="text-[32px] font-extrabold text-[#15803D] leading-tight my-1">
                {data.porcentajeAsistencia}%
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#6B7280] mt-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                <span>
                  Cumples con holgura el 85% mínimo reglamentario para aprobación académica.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// src/app/alumno/horario/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getHorarioAlumno } from '@/lib/api';
import { HorarioAlumnoData } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Clock, MapPin, CheckSquare, Sparkles } from 'lucide-react';

export default function AlumnoHorarioPage() {
  const [data, setData] = useState<HorarioAlumnoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSemana, setSelectedSemana] = useState('08 - 12 de Septiembre');
  const [selectedPeriodo, setSelectedPeriodo] = useState('Segundo Semestre');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getHorarioAlumno();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el horario escolar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        title="No pudimos cargar tu horario"
        message={error}
        onRetry={fetchData}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <AlumnoHeader
        eyebrow="Programación Académica"
        title="Horario Semanal de Clases"
        subtitle={`Distribución horaria para ${data?.aula || '5to de Secundaria · Aula B-204'}`}
      />

      {/* Filter Bar */}
      <AlumnoFilterBar
        filters={[
          {
            label: 'Semana Lectiva',
            value: selectedSemana,
            options: ['08 - 12 de Septiembre', '15 - 19 de Septiembre', '22 - 26 de Septiembre'],
            onChange: setSelectedSemana
          },
          {
            label: 'Periodo',
            value: selectedPeriodo,
            options: ['Segundo Semestre', 'Primer Semestre'],
            onChange: setSelectedPeriodo
          }
        ]}
        badgeText={data?.turno || 'Turno Mañana (08:00 - 14:00)'}
        badgeVariant="accent"
      />

      {/* Content Columns: Schedule Grid + Next Class Card */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Table Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Distribución de Bloques de Clase
              </h3>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Horario oficial · {data.aula}
              </p>
            </div>

            <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[580px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Horario
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Lunes
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Martes
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Miércoles
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Jueves
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Viernes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bloques.map((b) => {
                    if (b.esReceso) {
                      return (
                        <tr key={b.id} className="bg-slate-50/80">
                          <td
                            colSpan={6}
                            className="py-2 px-3 text-center text-[11px] font-bold text-[#6B7280] tracking-wide"
                          >
                            {b.rangoHora} · RECESO INSTITUCIONAL (30 MIN)
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 text-[11px] font-bold text-[#6B7280] whitespace-nowrap">
                          {b.rangoHora}
                        </td>
                        <td className="py-3 px-3 text-[12px] font-semibold text-[#111827]">
                          {b.lunes}
                        </td>
                        <td className="py-3 px-3 text-[12px] font-semibold text-[#111827]">
                          {b.martes}
                        </td>
                        <td className="py-3 px-3 text-[12px] font-semibold text-[#111827]">
                          {b.miercoles}
                        </td>
                        <td className="py-3 px-3 text-[12px] font-semibold text-[#111827]">
                          {b.jueves}
                        </td>
                        <td className="py-3 px-3 text-[12px] font-semibold text-[#111827]">
                          {b.viernes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Card: Next Class (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#111827]">Próxima Clase</h4>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#BE123C] bg-[#FFE4E6] px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> En curso
              </span>
            </div>

            <div className="bg-[#FFE4E6]/60 border border-[#FECDD3] rounded-xl p-4 flex flex-col gap-2">
              <span className="text-lg font-black text-[#BE123C] leading-none">
                {data.proximaClase.curso}
              </span>
              <span className="text-xs text-[#111827] font-medium">
                {data.proximaClase.docente}
              </span>
              <div className="flex flex-col gap-1 mt-1 text-[11px] text-[#6B7280]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#BE123C]" />
                  {data.proximaClase.horario}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#BE123C]" />
                  {data.proximaClase.aula}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-[#111827] mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[#6B7280]" />
                Materiales Requeridos:
              </h5>
              <ul className="flex flex-col gap-1.5 text-xs text-[#6B7280]">
                {data.proximaClase.materialesRequeridos.map((mat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#BE123C] mt-1.5 shrink-0" />
                    <span>{mat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

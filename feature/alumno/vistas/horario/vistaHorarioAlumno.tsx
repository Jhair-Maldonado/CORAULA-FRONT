'use client';

import React, { useEffect, useState } from 'react';
import { getHorarioAlumno } from '@/lib/api';
import { HorarioAlumnoData } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Clock, MapPin, CheckSquare, Sparkles } from 'lucide-react';

export default function VistaHorarioAlumno() {
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
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Distribución de Bloques de Clase
                </h3>
                <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                  Horario oficial · {data.aula}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto p-4 flex-1">
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden h-full flex flex-col">
                <table className="w-full text-left min-w-[500px] h-full flex-1">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E5E7EB]">
                      <th className="p-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider w-20 text-center border-r border-[#E5E7EB]">Hora</th>
                      <th className="p-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center border-r border-[#E5E7EB]">Lun</th>
                      <th className="p-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center border-r border-[#E5E7EB]">Mar</th>
                      <th className="p-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center border-r border-[#E5E7EB]">Mié</th>
                      <th className="p-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center border-r border-[#E5E7EB]">Jue</th>
                      <th className="p-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center">Vie</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-medium text-[#111827]">
                    {data.bloques.map((b, rIdx) => {
                      if (b.esReceso) {
                        return (
                          <tr key={b.id} className="border-b border-[#E5E7EB] bg-[#FEF3C7]">
                            <td className="p-3 text-[10px] font-bold text-[#6B7280] text-center border-r border-[#E5E7EB] bg-white">
                              {b.horaInicio}
                            </td>
                            <td colSpan={5} className="p-3 text-center font-bold text-amber-700 tracking-widest border-y border-[#FDE68A]">
                              RECESO ({parseInt(b.horaFin.split(':')[1]) - parseInt(b.horaInicio.split(':')[1]) || 30} MIN)
                            </td>
                          </tr>
                        );
                      }

                      // Alternar colores pastel por bloque
                      const bgClass = rIdx % 2 === 0 ? 'bg-[#F0FDF4]/50' : 'bg-[#EFF6FF]/50';

                      return (
                        <tr key={b.id} className={`border-b border-[#E5E7EB] h-20 ${bgClass}`}>
                          <td className="p-2 text-[10px] font-bold text-[#6B7280] text-center border-r border-[#E5E7EB] bg-white">
                            {b.horaInicio}
                          </td>
                          {[b.lunes, b.martes, b.miercoles, b.jueves, b.viernes].map((curso, cIdx) => (
                            <td key={cIdx} className="p-2 text-center border-r border-[#E5E7EB] hover:bg-white hover:shadow-sm cursor-pointer transition-all">
                              <span className="font-bold text-[#111827]">{curso}</span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Card: Next Class (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] bg-slate-50 flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#111827]">Próxima Clase</h4>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#BE123C] bg-[#FFE4E6] px-2 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3" /> En curso
              </span>
            </div>

            <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
              {/* Bloque en curso */}
              <div className="bg-[#FFE4E6]/40 border border-[#FECDD3] rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#BE123C]" />
                <span className="text-xl font-black text-[#BE123C] leading-none mb-1">
                  {data.proximaClase.curso}
                </span>
                <span className="text-xs text-[#111827] font-bold">
                  {data.proximaClase.docente}
                </span>
                <div className="flex flex-col gap-1.5 mt-1 text-[11px] font-medium text-[#6B7280]">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#BE123C]" />
                    {data.proximaClase.horario}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#BE123C]" />
                    {data.proximaClase.aula}
                  </span>
                </div>
              </div>

              <div>
                <h5 className="text-[11px] font-bold text-[#111827] mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckSquare className="w-4 h-4 text-[#6B7280]" />
                  Materiales Requeridos:
                </h5>
                <ul className="flex flex-col gap-2 text-xs text-[#6B7280] font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {data.proximaClase.materialesRequeridos.map((mat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BE123C] mt-1.5 shrink-0" />
                      <span>{mat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="h-px w-full bg-[#E5E7EB]" />

              {/* Siguientes Clases */}
              <div>
                <h5 className="text-[11px] font-bold text-[#111827] mb-3 uppercase tracking-wider text-center">
                  Siguientes Clases
                </h5>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E7EB] hover:border-gray-300 transition-colors bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#111827]">Comunicación</span>
                      <span className="text-[10px] text-[#6B7280]">Prof. Elena Valdivia</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#111827] bg-slate-100 px-2 py-1 rounded">10:00 AM</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E7EB] hover:border-gray-300 transition-colors bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#111827]">Ciencia y Tec.</span>
                      <span className="text-[10px] text-[#6B7280]">Prof. Carlos Rivas</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#111827] bg-slate-100 px-2 py-1 rounded">11:30 AM</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// src/components/alumno/CalificacionesTable.tsx
import React from 'react';
import { CursoCalificacionAlumno } from '@/types/alumno';

interface CalificacionesTableProps {
  cursos: CursoCalificacionAlumno[];
  fechaCorte?: string;
  className?: string;
}

export const CalificacionesTable: React.FC<CalificacionesTableProps> = ({
  cursos,
  fechaCorte = '08 de septiembre',
  className = ''
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4 ${className}`}
    >
      {/* Card Header */}
      <div>
        <h3 className="text-base font-bold text-[#111827]">
          Calificaciones por curso
        </h3>
        <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
          Escala vigesimal - corte al {fechaCorte}
        </p>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
        <table className="w-full text-left border-collapse min-w-[540px]">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                Curso
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                Exámenes
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                Tareas
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                Participación
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                Promedio
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                Final
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cursos.map((c) => (
              <tr
                key={c.id || c.curso}
                className="hover:bg-slate-50/60 transition-colors"
              >
                <td className="py-3 px-3">
                  <span className="text-[13px] font-bold text-[#111827] block">
                    {c.curso}
                  </span>
                  {c.docenteTitular && (
                    <span className="text-[10px] text-[#6B7280] block sm:hidden">
                      {c.docenteTitular}
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-center text-[13px] text-[#111827]">
                  {c.examenes.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-center text-[13px] text-[#111827]">
                  {c.tareas.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-center text-[13px] text-[#111827]">
                  {c.participacion.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-center text-[13px] font-bold text-[#111827]">
                  {c.promedio.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      c.notaFinal >= 11
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-[#FEE2E2] text-[#B91C1C]'
                    }`}
                  >
                    {c.notaFinal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

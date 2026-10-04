// src/app/alumno/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResumenDashboardAlumno } from '@/lib/api';
import { ResumenDashboardAlumno } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Award, CalendarCheck, CheckCircle2, BookOpen, Clock, ArrowRight } from 'lucide-react';

export default function AlumnoResumenPage() {
  const [data, setData] = useState<ResumenDashboardAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getResumenDashboardAlumno();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el resumen del alumno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="No pudimos cargar tu resumen académico"
        message={error || 'Hubo un inconveniente al conectar con el servidor.'}
        onRetry={fetchData}
      />
    );
  }

  const { perfil, kpis, cursos, proximasActividades } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <AlumnoHeader
        eyebrow="Portal del Estudiante"
        title="Resumen Académico del Alumno"
        subtitle={`Bienvenido a tu ciclo escolar ${perfil.anioLectivo} · ${perfil.grado} Sección ${perfil.seccion}`}
      />

      {/* Filter / Context Bar */}
      <AlumnoFilterBar
        filters={[
          { label: 'Estudiante', value: `${perfil.nombreCompleto} ▾` },
          { label: 'Año Académico', value: `${perfil.anioLectivo} · Regular ▾` }
        ]}
        badgeText={perfil.estadoMatricula}
        badgeVariant="success"
      />

      {/* 4 KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6B7280]">
              Promedio Ponderado
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FFE4E6] flex items-center justify-center text-[#BE123C]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-[26px] font-extrabold text-[#BE123C] block leading-none">
              {kpis.promedioPonderado.toFixed(1)} / 20
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#15803D]">
            +0.5 vs. ciclo previo
          </span>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6B7280]">
              Asistencia General
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[#15803D]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-[26px] font-extrabold text-[#111827] block leading-none">
              {kpis.asistenciaGeneral}%
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#6B7280]">
            0 inasistencias injustificadas
          </span>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6B7280]">
              Tareas Completadas
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[#A16207]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-[26px] font-extrabold text-[#111827] block leading-none">
              {kpis.tareasCompletadas} de {kpis.tareasTotales}
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#A16207]">
            2 pendientes esta semana
          </span>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6B7280]">
              Cursos Inscritos
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-[26px] font-extrabold text-[#111827] block leading-none">
              {kpis.cursosInscritos} Cursos
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#15803D]">
            Todos en estado regular
          </span>
        </div>
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Courses Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Estado General de Asignaturas
              </h3>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Cursos matriculados en {perfil.grado} · Sección {perfil.seccion}
              </p>
            </div>
            <Link
              href="/alumno/calificaciones"
              className="text-xs font-bold text-[#BE123C] hover:underline flex items-center gap-1"
            >
              Ver detalle <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                    Curso
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                    Docente Titular
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                    Carga
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                    Promedio
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cursos.map((c) => (
                  <tr key={c.curso} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 text-[13px] font-bold text-[#111827]">
                      {c.curso}
                    </td>
                    <td className="py-3 px-3 text-[12px] text-[#6B7280]">
                      {c.docente}
                    </td>
                    <td className="py-3 px-3 text-[12px] text-[#111827] text-center">
                      {c.horasSemanales}
                    </td>
                    <td className="py-3 px-3 text-[13px] font-bold text-[#BE123C] text-center">
                      {c.promedio.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Next Activities (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827]">
              Próximas Evaluaciones
            </h3>
            <span className="text-[11px] text-[#6B7280]">Esta semana</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {proximasActividades.map((act) => (
              <div
                key={act.id}
                className={`p-3 rounded-lg border transition-all ${
                  act.urgente
                    ? 'bg-[#FFE4E6] border-[#FECDD3]'
                    : 'bg-slate-50/70 border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                      act.urgente ? 'text-[#BE123C]' : 'text-[#111827]'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {act.fechaLimite}
                  </span>
                  {act.urgente && (
                    <Badge variant="accent" size="sm">
                      Prioritario
                    </Badge>
                  )}
                </div>
                <h4 className="text-[12px] font-bold text-[#111827] leading-snug">
                  {act.titulo}
                </h4>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  {act.curso} · {act.docente}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/alumno/horario"
            className="w-full mt-2 py-2 px-3 text-center text-xs font-bold text-[#BE123C] bg-[#FFE4E6]/50 hover:bg-[#FFE4E6] rounded-lg transition-colors"
          >
            Ver horario y calendario completo
          </Link>
        </div>
      </div>
    </div>
  );
}

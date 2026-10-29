'use client';

import React, { useEffect, useState } from 'react';
import { getMaterialesAlumno } from '@/lib/api';
import { getAlumnoCursosAsignados, CursoAsignadoAlumno } from '@/services/materialesService';
import { MaterialesAlumnoData } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';
import { HardDrive, ExternalLink } from 'lucide-react';
import { CardCurso } from './component/cardCurso';

export default function VistaMaterialesAlumno() {
  const [data, setData] = useState<MaterialesAlumnoData | null>(null);
  const [coursesInfo, setCoursesInfo] = useState<CursoAsignadoAlumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resMats, assignedCourses] = await Promise.all([
        getMaterialesAlumno('Todos los cursos', 'Todos los archivos'),
        getAlumnoCursosAsignados()
      ]);
      setData(resMats);
      setCoursesInfo(assignedCourses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los materiales de estudio';
      setError(msg);
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
        title="No pudimos cargar tus materiales"
        message={error}
        onRetry={fetchData}
      />
    );
  }

  const usagePercent = data
    ? Math.round((data.espacioUsadoMb / data.espacioTotalMb) * 100)
    : 42;

  return (
    <div className="flex flex-col gap-6">
      <AlumnoHeader
        eyebrow="Recursos Académicos"
        title="Materiales y Guías de Estudio"
        subtitle="Descarga de separatas, lecturas y presentaciones oficiales"
      />

      <AvisoModuloSimulado activo={true} className="mb-0" detalle="los materiales de estudio son de demostración y no pueden descargarse." />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Asignaturas Asignadas
                </h3>
                <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                  Selecciona un curso para ver sus materiales organizados por semana
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-[#111827] rounded-full border border-[#E5E7EB]">
                {coursesInfo.length} {coursesInfo.length === 1 ? 'curso' : 'cursos'}
              </span>
            </div>

            {coursesInfo.length === 0 ? (
              <EmptyState
                title="No tienes cursos asignados"
                description="Aún no se han asignado cursos para tu matrícula en el periodo actual."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coursesInfo.map(info => (
                  <CardCurso key={String(info.id || info.slug)} info={info} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#111827]">
                Biblioteca y Almacenamiento
              </h4>
              <HardDrive className="w-4 h-4 text-[#6B7280]" />
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#6B7280] block">
                Espacio Institucional Nube
              </span>
              <div className="text-2xl font-black text-[#111827] leading-none my-1">
                {data?.espacioUsadoMb || 0} MB <span className="text-xs font-normal text-[#6B7280]">de {((data?.espacioTotalMb || 0) / 1024).toFixed(0)} GB</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-[#BE123C] rounded-full transition-all duration-500"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            <div className="h-px bg-[#E5E7EB] w-full" />

            <div>
              <h5 className="text-xs font-bold text-[#111827] mb-2.5">
                Enlaces Institucionales
              </h5>
              <div className="flex flex-col gap-2 text-xs">
                <a
                  href="#"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#BE123C] font-semibold transition-colors"
                >
                  <span>Repositorio Biblioteca San Marcos</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="#"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#BE123C] font-semibold transition-colors"
                >
                  <span>Normas de Entrega de Tareas (PDF)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="#"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#6B7280] transition-colors"
                >
                  <span>Mesa de Ayuda Tecnológica</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

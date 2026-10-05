'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMaterialesAlumno } from '@/lib/api';
import { MaterialesAlumnoData } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { HardDrive, ExternalLink, BookOpen } from 'lucide-react';

const slugify = (text: string) => text.toString().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '');

export default function VistaMaterialesAlumno() {
  const [data, setData] = useState<MaterialesAlumnoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMaterialesAlumno('Todos los cursos', 'Todos los archivos');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los materiales de estudio');
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

  const uniqueCourses = Array.from(new Set(data?.materiales.map(m => m.curso) || []));
  const coursesInfo = uniqueCourses.map(curso => {
    const materials = data?.materiales.filter(m => m.curso === curso) || [];
    return {
      curso,
      slug: slugify(curso),
      docente: materials[0]?.docente || '',
      count: materials.length
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <AlumnoHeader
        eyebrow="Recursos Académicos"
        title="Materiales y Guías de Estudio"
        subtitle="Descarga de separatas, lecturas y presentaciones oficiales"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Asignaturas
              </h3>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Selecciona un curso para ver sus materiales organizados por semana
              </p>
            </div>

            {coursesInfo.length === 0 ? (
              <EmptyState
                title="No hay materiales disponibles"
                description="Aún no se han subido materiales para tus cursos."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coursesInfo.map(info => (
                  <Link
                    href={`/alumno/materiales/${info.slug}`}
                    key={info.curso}
                    className="flex flex-col text-left p-4 rounded-xl border border-[#E5E7EB] hover:border-[#111827] hover:shadow-md transition-all bg-white group cursor-pointer"
                  >
                    <div className="flex items-start justify-between w-full mb-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#111827] group-hover:bg-[#111827] group-hover:text-white transition-colors">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-[#111827] px-2 py-1 rounded-full">
                        {info.count} {info.count === 1 ? 'archivo' : 'archivos'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-[#111827] mb-1">{info.curso}</h4>
                    <span className="text-[11px] text-[#6B7280] font-medium">{info.docente}</span>
                  </Link>
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

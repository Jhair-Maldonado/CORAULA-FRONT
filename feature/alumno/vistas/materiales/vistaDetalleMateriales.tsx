'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMaterialesAlumno } from '@/lib/api';
import { MaterialesAlumnoData, MaterialEstudioAlumno } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Download, FileText, ArrowLeft } from 'lucide-react';

const slugify = (text: string) => text.toString().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '');

interface VistaDetalleMaterialesProps {
  slug: string;
}

export default function VistaDetalleMateriales({ slug }: VistaDetalleMaterialesProps) {
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
  }, [slug]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={5} />
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

  // Find the exact course name that matches the slug
  const uniqueCourses = Array.from(new Set(data?.materiales.map(m => m.curso) || []));
  const selectedCurso = uniqueCourses.find(c => slugify(c) === slug) || null;

  // Materials for selected course grouped by week
  let materialsByWeek: Record<string, MaterialEstudioAlumno[]> = {};
  if (selectedCurso && data) {
    const filtered = data.materiales.filter(m => m.curso === selectedCurso);
    filtered.forEach(m => {
      const week = m.semana || 'Material General';
      if (!materialsByWeek[week]) materialsByWeek[week] = [];
      materialsByWeek[week].push(m);
    });
  }

  const sortedWeeks = Object.keys(materialsByWeek).sort();

  return (
    <div className="flex flex-col gap-6">
      <AlumnoHeader
        eyebrow="Materiales y Guías de Estudio"
        title={
          <div className="flex items-center gap-2">
            <Link
              href="/alumno/materiales"
              className="p-1 -ml-1 text-[#6B7280] hover:text-[#111827] hover:bg-slate-100 rounded-md transition-colors"
              title="Volver a los cursos"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span>{selectedCurso || 'Curso no encontrado'}</span>
          </div>
        }
        subtitle="Materiales organizados cronológicamente por semanas"
      />

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-6">
        {!selectedCurso ? (
          <EmptyState
            title="Curso no encontrado"
            description="No se encontró ningún curso con ese identificador."
            actionText="Volver a materiales"
            onAction={() => window.location.href = '/alumno/materiales'}
          />
        ) : sortedWeeks.length === 0 ? (
          <EmptyState
            title="No hay materiales"
            description="Este curso aún no tiene materiales subidos."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {sortedWeeks.map(week => (
              <div key={week} className="flex flex-col gap-3">
                <h4 className="text-[12px] font-bold text-[#111827] bg-slate-50 px-3 py-1.5 rounded-lg border border-[#E5E7EB] uppercase tracking-wider inline-flex w-max">
                  {week}
                </h4>
                <div className="flex flex-col gap-3">
                  {materialsByWeek[week].map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E7EB] hover:border-gray-300 hover:shadow-sm transition-all bg-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FFE4E6] flex items-center justify-center text-[#BE123C] shrink-0">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[#111827]">
                            {m.titulo}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#6B7280] font-medium">
                            <span>{m.fecha}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="uppercase">{m.formato} · {m.tamanio}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => alert(`Iniciando descarga: ${m.titulo}`)}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-[#111827] hover:bg-[#111827] hover:text-white transition-colors border border-[#E5E7EB]"
                        title="Descargar archivo"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

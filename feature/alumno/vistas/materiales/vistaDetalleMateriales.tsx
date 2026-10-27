'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMaterialesAlumno } from '@/lib/api';
import { MaterialesAlumnoData, MaterialEstudioAlumno } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';
import { Download, FileText, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  descargarArchivoMaterial,
  getAlumnoCursosAsignados,
  resolverCursoAlumno,
  CursoAsignadoAlumno
} from '@/services/materialesService';

interface VistaDetalleMaterialesProps {
  slug: string;
}

export default function VistaDetalleMateriales({ slug }: VistaDetalleMaterialesProps) {
  const router = useRouter();
  const [data, setData] = useState<MaterialesAlumnoData | null>(null);
  const [courses, setCourses] = useState<CursoAsignadoAlumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resMats, resCourses] = await Promise.all([
        getMaterialesAlumno('Todos los cursos', 'Todos los archivos'),
        getAlumnoCursosAsignados()
      ]);
      setData(resMats);
      setCourses(resCourses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los materiales de estudio';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const handleDownload = async (material: MaterialEstudioAlumno) => {
    try {
      setDownloadingId(material.id);
      setDownloadNotice(null);
      await descargarArchivoMaterial(material);
      setDownloadNotice({
        id: material.id,
        success: true,
        message: `Descarga completada: ${material.titulo} (${material.formato})`
      });
      setTimeout(() => setDownloadNotice(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la descarga';
      setDownloadNotice({
        id: material.id,
        success: false,
        message: msg
      });
    } finally {
      setDownloadingId(null);
    }
  };

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

  // Resolver el curso asignado al alumno a partir del parámetro de ruta
  const resolved = resolverCursoAlumno(courses, data?.materiales || [], slug);
  const selectedCurso = resolved?.cursoNombre || null;
  const docenteAsignado = resolved?.docente || '';
  const courseMaterials = resolved?.materiales || [];

  // Agrupar los materiales por semana cronológica
  const materialsByWeek: Record<string, MaterialEstudioAlumno[]> = {};
  courseMaterials.forEach(m => {
    const week = m.semana || 'Material General';
    if (!materialsByWeek[week]) materialsByWeek[week] = [];
    materialsByWeek[week].push(m);
  });

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
        subtitle={
          selectedCurso
            ? `${docenteAsignado ? `${docenteAsignado} · ` : ''}Materiales pedagógicos organizados por semana lectiva`
            : 'Materiales organizados cronológicamente por semanas'
        }
      />

      <AvisoModuloSimulado className="mb-0" detalle="los materiales de estudio son de demostración y no pueden descargarse." />

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-6">
        {downloadNotice && (
          <div
            role="status"
            className={`flex items-center gap-2.5 p-3 rounded-lg text-xs font-semibold border ${
              downloadNotice.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {downloadNotice.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{downloadNotice.message}</span>
          </div>
        )}

        {!selectedCurso ? (
          <EmptyState
            title="Curso no encontrado"
            description="No se encontró ningún curso asignado con ese identificador en tu matrícula."
            actionText="Volver a mis cursos"
            onAction={() => { router.push('/alumno/materiales'); }}
          />
        ) : courseMaterials.length === 0 ? (
          <EmptyState
            title="No hay materiales disponibles"
            description={`El docente aún no ha publicado materiales ni archivos para ${selectedCurso}.`}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {sortedWeeks.map(week => (
              <div key={week} className="flex flex-col gap-3">
                <h4 className="text-[12px] font-bold text-[#111827] bg-slate-50 px-3 py-1.5 rounded-lg border border-[#E5E7EB] uppercase tracking-wider inline-flex w-max">
                  {week}
                </h4>
                <div className="flex flex-col gap-3">
                  {materialsByWeek[week].map(m => {
                    const isDownloading = downloadingId === m.id;
                    return (
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
                          type="button"
                          onClick={() => { void handleDownload(m); }}
                          disabled={isDownloading}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-[#111827] hover:bg-[#111827] hover:text-white transition-colors border border-[#E5E7EB] disabled:opacity-60 cursor-pointer"
                          title={`Descargar archivo: ${m.titulo}`}
                          aria-label={`Descargar archivo ${m.titulo}`}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#BE123C]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

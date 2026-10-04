// src/app/alumno/materiales/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getMaterialesAlumno } from '@/lib/api';
import { MaterialesAlumnoData } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Download, FileText, HardDrive, ExternalLink } from 'lucide-react';

export default function AlumnoMaterialesPage() {
  const [data, setData] = useState<MaterialesAlumnoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCurso, setSelectedCurso] = useState('Todos los cursos');
  const [selectedFormato, setSelectedFormato] = useState('Todos los archivos');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMaterialesAlumno(selectedCurso, selectedFormato);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los materiales de estudio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCurso, selectedFormato]);

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
      {/* Header */}
      <AlumnoHeader
        eyebrow="Recursos Académicos"
        title="Materiales y Guías de Estudio"
        subtitle="Descarga de separatas, lecturas y presentaciones oficiales"
      />

      {/* Filter Bar */}
      <AlumnoFilterBar
        filters={[
          {
            label: 'Asignatura',
            value: selectedCurso,
            options: [
              'Todos los cursos',
              'Matemática',
              'Comunicación',
              'Ciencia y Tecnología',
              'Historia',
              'Inglés'
            ],
            onChange: setSelectedCurso
          },
          {
            label: 'Formato',
            value: selectedFormato,
            options: ['Todos los archivos', 'PDF', 'PPTX', 'ZIP'],
            onChange: setSelectedFormato
          }
        ]}
        badgeText={`${data?.totalMateriales || 24} materiales listos`}
        badgeVariant="accent"
      />

      {/* Content Columns: Materials List + Storage Card */}
      {data && data.materiales.length === 0 ? (
        <EmptyState
          title="No hay materiales con estos filtros"
          description="Prueba seleccionando otra asignatura o formato de archivo."
          actionText="Ver todos los materiales"
          onAction={() => {
            setSelectedCurso('Todos los cursos');
            setSelectedFormato('Todos los archivos');
          }}
        />
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Table Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Documentos y Recursos de Estudio
              </h3>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Archivos compartidos por la plana docente para tus asignaturas
              </p>
            </div>

            <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Título del Material
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Curso
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Fecha
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280]">
                      Formato
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#6B7280] text-center">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.materiales.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#FFE4E6] flex items-center justify-center text-[#BE123C] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[13px] font-bold text-[#111827] block leading-tight">
                              {m.titulo}
                            </span>
                            <span className="text-[10px] text-[#6B7280]">
                              {m.docente}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[12px] text-[#6B7280]">
                        {m.curso}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#6B7280]">
                        {m.fecha}
                      </td>
                      <td className="py-3 px-3 text-[11px] font-bold text-[#111827]">
                        {m.tamanio}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => alert(`Iniciando descarga: ${m.titulo}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#FFE4E6] text-[#BE123C] hover:bg-[#FECDD3] transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          Bajar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Card: Storage and Links (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
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
                {data.espacioUsadoMb} MB <span className="text-xs font-normal text-[#6B7280]">de {(data.espacioTotalMb / 1024).toFixed(0)} GB</span>
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
      ) : null}
    </div>
  );
}

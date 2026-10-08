// feature/docente/vistas/cursos/vistaCursosDocente.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Clock,
  ArrowRight,
  BookOpen,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { getDocenteDashboard } from '@/lib/api';
import { DocenteDashboardData, CursoDocente } from '@/types/docentes';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export default function VistaCursosDocente() {
  const router = useRouter();
  const { setCursoActivo } = useDocenteSession();
  const [data, setData] = useState<DocenteDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDocenteDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los cursos del docente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIngresarCurso = (curso: CursoDocente) => {
    setCursoActivo(curso);
    router.push(`/docente/cursos/${curso.id}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="No pudimos cargar tus cursos asignados"
        message={error || 'Hubo un inconveniente al conectar con el servidor.'}
        onRetry={fetchData}
      />
    );
  }

  const { cursos, horarioHoy, claseEnCurso } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Columna Izquierda: Mis Cursos Asignados */}
      <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div>
            <h2 className="text-xl font-bold text-[#111827]">
              Mis Cursos Asignados
            </h2>
            <p className="text-xs text-[#64748B]">
              Tienes {cursos.length} asignaturas a tu cargo este periodo lectivo.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {cursos.map((curso) => (
            <div
              key={curso.id}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center justify-between hover:border-[#BE123C]/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Color Block lateral (como en cary.pen) */}
                <div
                  className="w-1.5 h-14 rounded-full shrink-0"
                  style={{ backgroundColor: curso.color }}
                />

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#111827] group-hover:text-[#BE123C] transition-colors truncate">
                      {curso.nombre}
                    </span>
                    <span className="text-[11px] font-semibold text-[#64748B] bg-[#F3F4F6] px-2 py-0.5 rounded-md">
                      {curso.seccion ? `Sec. ${curso.seccion}` : ''}
                    </span>
                  </div>

                  <span className="text-xs text-[#64748B] font-medium truncate mt-0.5">
                    {curso.grado}
                  </span>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {curso.alumnosCount} alumnos
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {curso.horarioResumen}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón Ingresar */}
              <button
                type="button"
                onClick={() => handleIngresarCurso(curso)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#F3F4F6] hover:bg-[#BE123C] text-[#111827] hover:text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-2xs group-hover:bg-[#BE123C] group-hover:text-white"
              >
                <span>Ingresar</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Columna Derecha: Mi Horario de Hoy */}
      <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
        <div className="border-b border-[#E5E7EB] pb-3">
          <h2 className="text-xl font-bold text-[#111827]">
            Mi Horario de Hoy
          </h2>
          <p className="text-xs text-[#64748B]">
            Sesiones de clase y descansos programados.
          </p>
        </div>

        {/* Current Class Widget (como en cary.pen en fondo $accent #BE123C) */}
        {claseEnCurso && (
          <div className="bg-[#BE123C] text-white rounded-xl p-5 shadow-sm flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/90 tracking-wide uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Clase en curso ahora
              </span>
              {claseEnCurso.tiempoRestante && (
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  {claseEnCurso.tiempoRestante}
                </span>
              )}
            </div>

            <h3 className="text-2xl font-black tracking-tight text-white mt-1">
              {claseEnCurso.curso}
            </h3>

            <p className="text-xs text-white/95 font-medium">
              {claseEnCurso.grado}
            </p>

            <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/20 text-xs">
              <span className="text-white/80 font-medium">Horario: {claseEnCurso.hora}</span>
              <Link
                href={`/docente/asistencia`}
                className="font-bold underline hover:text-white/80 transition-opacity"
              >
                Tomar lista →
              </Link>
            </div>
          </div>
        )}

        {/* Timeline List */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
            Cronograma del día
          </h4>

          <div className="flex flex-col relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
            {horarioHoy.map((bloque) => (
              <div
                key={bloque.id}
                className={`relative flex flex-col gap-0.5 ${
                  bloque.esActual ? 'font-semibold' : ''
                }`}
              >
                {/* Dot */}
                <div
                  className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white ${
                    bloque.esActual
                      ? 'bg-[#BE123C] ring-2 ring-[#BE123C]/30'
                      : bloque.esDescanso
                      ? 'bg-amber-400'
                      : 'bg-[#94A3B8]'
                  }`}
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    {bloque.hora}
                  </span>
                  {bloque.esActual && (
                    <span className="text-[10px] font-bold text-[#BE123C] bg-[#FFE4E6] px-1.5 py-0.2 rounded">
                      En vivo
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      bloque.esDescanso
                        ? 'text-[#64748B] italic'
                        : bloque.esActual
                        ? 'text-[#BE123C] font-bold'
                        : 'text-[#111827] font-semibold'
                    }`}
                  >
                    {bloque.curso}
                  </span>

                  {bloque.grado && (
                    <span className="text-xs text-[#64748B]">
                      {bloque.grado}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import type { TeacherCourseDetailResponse } from '@/types/teacherCoursesApi';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import ActividadesDocente from './ActividadesDocente';
import ModalAsistenciaCurso from './ModalAsistenciaCurso';
import ResultadosCursoDocente from './ResultadosCursoDocente';

type LoadResult<T> = { key: string; data?: T; error?: string };

export default function VistaDetalleCursoDocente() {
  const { id } = useParams<{ id: string }>();
  return <CourseDetail key={id} routeId={id} />;
}

function CourseDetail({ routeId }: { routeId: string }) {
  const sectionCourseId = Number(routeId);
  const validId = /^\d+$/.test(routeId) && Number.isSafeInteger(sectionCourseId) && sectionCourseId > 0;
  const { setCursoActivo } = useDocenteSession();
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<LoadResult<TeacherCourseDetailResponse> | null>(null);
  const detailKey = String(revision);
  const loading = validId && detail?.key !== detailKey;
  const course = loading ? undefined : detail?.data;
  const error = !validId ? 'Curso no encontrado o no asignado a tu cuenta.' : loading ? undefined : detail?.error;

  // Estado del modal de asistencia
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);

  useEffect(() => {
    if (!validId) return;
    let current = true;
    teacherCoursesService
      .getCourse(sectionCourseId)
      .then(data => {
        if (!current) return;
        setDetail({ key: detailKey, data });
        setCursoActivo({ id: String(data.sectionCourseId), nombre: data.name, grado: `${data.grade}° grado` });
      })
      .catch(error => {
        if (current) setDetail({ key: detailKey, error: teacherCoursesErrorMessage(error) });
      });
    return () => {
      current = false;
    };
  }, [sectionCourseId, validId, detailKey, setCursoActivo]);

  const gradeSectionSubtitle = course
    ? `${course.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · ${course.grade}° grado · Sección ${course.sectionName}`
    : '';

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/docente"
        className="flex items-center gap-2 min-h-10 w-fit px-3 py-2 bg-white border border-line rounded-lg shadow-xs text-xs font-bold text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a mis cursos
      </Link>

      {loading ? (
        <p role="status" className="p-5 bg-white border border-line rounded-xl text-muted">
          Cargando curso...
        </p>
      ) : error ? (
        <div role="alert" className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
          <p>{error}</p>
          {validId && (
            <button
              type="button"
              onClick={() => setRevision(n => n + 1)}
              className="mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent"
            >
              Reintentar
            </button>
          )}
        </div>
      ) : course && (
        <>
          {/* Header simplificado: Nombre del curso con subtítulo y botón de Registrar Asistencia */}
          <header className="bg-white p-5 sm:p-6 rounded-xl border border-line shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink break-words capitalize">
                {course.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1 break-words">
                {gradeSectionSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAttendanceOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-xs font-bold shadow-xs hover:bg-accent/90 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <CalendarCheck size={16} aria-hidden="true" />
              <span>Registrar asistencia</span>
            </button>
          </header>

          {/* Sección principal de Actividades (por defecto abre en el bimestre actual) */}
          <ActividadesDocente sectionCourseId={course.sectionCourseId} autoSelectCurrent />

          {/* Resultados calculados del bimestre (#45), solo lectura */}
          <ResultadosCursoDocente sectionCourseId={course.sectionCourseId} />

          {/* Componente Modal de Registro de Asistencia */}
          <ModalAsistenciaCurso
            isOpen={isAttendanceOpen}
            onClose={() => setIsAttendanceOpen(false)}
            sectionCourseId={course.sectionCourseId}
            courseName={course.name}
            gradeSectionSubtitle={gradeSectionSubtitle}
          />
        </>
      )}
    </div>
  );
}

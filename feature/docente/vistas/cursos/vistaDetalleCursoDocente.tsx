'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Users } from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import type { TeacherCourseDetailResponse, TeacherCourseStudentResponse } from '@/types/teacherCoursesApi';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

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
  const [studentRevision, setStudentRevision] = useState(0);
  const [detail, setDetail] = useState<LoadResult<TeacherCourseDetailResponse> | null>(null);
  const [studentResult, setStudentResult] = useState<LoadResult<TeacherCourseStudentResponse[]> | null>(null);
  const detailKey = String(revision);
  const studentsKey = String(studentRevision);
  const loading = validId && detail?.key !== detailKey;
  const course = loading ? undefined : detail?.data;
  const error = !validId ? 'Curso no encontrado o no asignado a tu cuenta.' : loading ? undefined : detail?.error;
  const studentsLoading = studentResult?.key !== studentsKey;
  const students = studentsLoading ? undefined : studentResult?.data;
  const studentsError = studentsLoading ? undefined : studentResult?.error;

  useEffect(() => {
    if (!validId) return;
    let current = true;
    teacherCoursesService.getCourse(sectionCourseId).then(data => {
      if (!current) return;
      setDetail({ key: detailKey, data });
      setCursoActivo({ id: String(data.sectionCourseId), nombre: data.name, grado: `${data.grade}° grado` });
    }).catch(error => {
      if (current) setDetail({ key: detailKey, error: teacherCoursesErrorMessage(error) });
    });
    return () => { current = false; };
  }, [sectionCourseId, validId, detailKey, setCursoActivo]);

  useEffect(() => {
    if (!validId) return;
    let current = true;
    teacherCoursesService.getStudents(sectionCourseId).then(data => {
      if (current) setStudentResult({ key: studentsKey, data });
    }).catch(error => {
      if (current) setStudentResult({ key: studentsKey, error: teacherCoursesErrorMessage(error) });
    });
    return () => { current = false; };
  }, [sectionCourseId, validId, studentsKey]);

  return <div className="flex flex-col gap-6">
    <Link href="/docente" className="flex items-center gap-2 min-h-10 w-fit px-3 py-2 bg-white border border-line rounded-lg shadow-xs text-xs font-bold text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"><ArrowLeft size={18} aria-hidden="true" />Volver a mis cursos</Link>
    {loading ? <p role="status" className="p-5 bg-white border border-line rounded-xl text-muted">Cargando curso...</p>
      : error ? <div role="alert" className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700"><p>{error}</p>
        {validId && <button type="button" onClick={() => setRevision(n => n + 1)} className="mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent">Reintentar</button>}
      </div> : course && <>
        <header className="bg-white p-5 sm:p-6 rounded-xl border border-line shadow-sm flex items-center gap-4">
          <span className="p-3 rounded-xl border border-accent/10 bg-accent-soft text-accent shrink-0"><BookOpen size={22} aria-hidden="true" /></span>
          <div className="min-w-0"><span className="text-[10px] text-accent bg-accent-soft border border-accent/10 rounded-md px-2 py-1 inline-block mb-1.5 font-bold uppercase tracking-wider">{course.code}</span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-ink break-words">{course.name}</h1>
            <p className="text-xs text-muted mt-1 break-words">{course.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · {course.grade}° grado · Sección {course.sectionName}</p>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"><section className="lg:col-span-5 bg-white p-5 rounded-xl border border-line shadow-sm min-w-0">
          <h2 className="text-sm font-bold text-ink pb-3 border-b border-line">Información académica</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 mt-4 text-xs">
            <div className="p-3 bg-neutral/40 border border-line/60 rounded-lg"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Área</dt><dd className="font-bold text-ink break-words mt-1">{course.area}</dd></div>
            <div className="p-3 bg-neutral/40 border border-line/60 rounded-lg"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Horas semanales</dt><dd className="font-bold text-ink mt-1">{course.weeklyHours}</dd></div>
            <div className="p-3 bg-neutral/40 border border-line/60 rounded-lg"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Alumnos</dt><dd className="font-bold text-ink mt-1">{course.studentCount}</dd></div>
          </dl>
          <h3 className="text-xs font-bold text-ink mt-5 pt-4 border-t border-line">Descripción</h3><p className="text-sm text-muted mt-1 whitespace-pre-wrap break-words">{course.description ?? 'Sin descripción registrada.'}</p>
        </section>
        <section className="lg:col-span-7 bg-white p-5 rounded-xl border border-line shadow-sm min-w-0">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2 pb-3 border-b border-line"><Users size={18} aria-hidden="true" className="text-accent" />Estudiantes con matrícula activa</h2>
          {studentsLoading ? <p role="status" className="py-5 text-sm text-muted">Cargando estudiantes...</p>
            : studentsError ? <div role="alert" className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl"><p>{studentsError}</p><button type="button" onClick={() => setStudentRevision(n => n + 1)} className="mt-3 min-h-10 px-3 py-2 bg-white rounded-lg border border-line font-bold text-xs focus-visible:outline-2 focus-visible:outline-accent">Reintentar estudiantes</button></div>
            : students?.length === 0 ? <p className="mt-4 p-6 text-center text-sm text-muted border border-dashed border-line rounded-xl">No hay estudiantes con matrícula activa en esta sección.</p>
            : <ul className="flex flex-col gap-2.5 mt-4">{students?.map(student => <li key={student.enrollmentId} className="p-3.5 bg-neutral/30 border border-line rounded-lg hover:border-accent/30 hover:bg-white transition-colors flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-ink break-words flex items-start gap-2"><Users size={16} aria-hidden="true" className="text-accent shrink-0 mt-0.5" />{student.fullName}</span><span className="text-[11px] font-medium text-muted px-2 py-1 bg-white border border-line rounded-md break-words">{student.studentCode ?? 'Sin código registrado'}</span>
            </li>)}</ul>}
        </section></div>
      </>}
  </div>;
}

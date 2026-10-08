'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, BookOpen01Icon, Calendar01Icon } from 'hugeicons-react';
import { coursesService, courseErrorMessage, courseErrorStatus } from '@/services/admin/coursesService';
import { toCurso, toUpdateCourse } from '@/adapters/courseAdapter';
import type { Curso } from '@/types/cursos';
import CourseForm from './courseForm';

type DetailState = { key: string; course?: Curso; error?: string; notFound?: boolean };

export default function DetalleDelCurso() {
  const { id } = useParams<{ id: string }>();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<DetailState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const mutationRef = useRef(false);
  const routeRef = useRef(id);
  const key = JSON.stringify([id, revision]);
  const loading = result?.key !== key;
  const course = loading ? undefined : result?.course;

  useEffect(() => {
    routeRef.current = id;
    let current = true;
    coursesService.getById(id)
      .then(response => { if (current) setResult({ key, course: toCurso(response) }); })
      .catch(error => { if (current) setResult({ key, error: courseErrorMessage(error), notFound: courseErrorStatus(error) === 404 }); });
    return () => { current = false; };
  }, [id, revision, key]);

  async function toggleActive() {
    if (!course || mutationRef.current) return;
    if (course.active && !window.confirm('¿Desactivar este curso? Podrás reactivarlo posteriormente.')) return;
    mutationRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await coursesService.update(course.id, { active: !course.active });
      if (routeRef.current === id) setResult({ key, course: toCurso(updated) });
    } catch (error) {
      if (routeRef.current === id) setActionError({ id, message: courseErrorMessage(error) });
    } finally { mutationRef.current = false; setBusy(false); }
  }

  return <div className="w-full h-full flex flex-col bg-canvas overflow-y-auto font-sans">
    <div className="h-28 bg-accent relative shrink-0"><Link href="/administrador/cursos" className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/20 text-white rounded-xl text-xs font-bold"><ArrowLeft01Icon size={16} />Volver a cursos</Link></div>
    <div className="max-w-5xl w-full mx-auto px-6 pb-12 -mt-12 relative flex flex-col gap-6">
      {loading && <div role="status" className="bg-white rounded-2xl border border-line p-6">Cargando curso...</div>}
      {!loading && result?.error && <div role="alert" className="bg-white rounded-2xl border border-line p-6">
        <h1 className="text-xl font-bold">{result.notFound ? 'Curso no encontrado' : 'No se pudo cargar el curso'}</h1>
        <p className="text-sm text-rose-700 mt-2">{result.error}</p>
        <button onClick={() => setRevision(n => n + 1)} className="mt-4 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold">Reintentar</button>
      </div>}
      {course && <>
        <div className="bg-white rounded-2xl shadow-sm border border-line p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center"><BookOpen01Icon size={28} /></div>
            <div><span className="text-[10px] font-bold bg-neutral px-2 py-1 rounded">{course.codigo}</span><p className="text-xs text-accent mt-2">{course.nivel} • {course.area}</p><h1 className="text-xl md:text-2xl font-bold text-ink mt-1">{course.nombre}</h1></div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${course.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral text-muted'}`}>{course.active ? 'Activo' : 'Inactivo'}</span>
        </div>
        <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase flex items-center gap-2"><Calendar01Icon size={18} className="text-accent" />Información del curso</h2>
          <div className="p-4 rounded-xl bg-neutral/40 border border-line/60 my-4"><span className="text-xs text-muted">Horas semanales</span><p className="text-lg font-bold">{course.horasTotalesSemana} hrs/sem</p></div>
          <h3 className="text-xs font-bold mb-2">Descripción</h3><p className="text-sm text-muted whitespace-pre-wrap">{course.descripcion || 'Sin descripción.'}</p>
        </div>
        {actionError?.id === id && <p role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{actionError.message} Puedes volver a intentar la acción.</p>}
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => { setActionError(null); setEditingId(id); }} className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold disabled:opacity-50">Editar curso</button>
          <button disabled={busy} onClick={toggleActive} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold disabled:opacity-50">{busy ? 'Guardando...' : course.active ? 'Desactivar curso' : 'Reactivar curso'}</button>
        </div>
        {editingId === id && <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-course-title" className="bg-white rounded-2xl border border-line p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 id="edit-course-title" className="text-base font-bold mb-4">Editar curso</h2>
            <CourseForm initialValues={course} onCancel={() => setEditingId(null)} onSave={async values => {
              if (mutationRef.current) throw new Error('Operación en curso');
              const patch = toUpdateCourse(values, course);
              if (Object.keys(patch).length === 0) { setEditingId(null); return; }
              mutationRef.current = true;
              setBusy(true);
              try {
                const updated = await coursesService.update(course.id, patch);
                if (routeRef.current === id) {
                  setResult({ key, course: toCurso(updated) });
                  setEditingId(null);
                }
              } finally { mutationRef.current = false; setBusy(false); }
            }} />
          </div>
        </div>}
      </>}
    </div>
  </div>;
}

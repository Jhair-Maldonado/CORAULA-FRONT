'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, PencilEdit01Icon, BookOpen01Icon, UserCircleIcon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { teachersService, teacherErrorMessage, teacherErrorStatus } from '@/services/admin/teachersService';
import { toAdminTeacher, toAdminTeacherDetail } from '@/adapters/teacherAdapter';
import type { AdminTeacherDetail } from '@/types/adminTeacher';
import TeacherForm from './TeacherForm';

type DetailResult = {
  revision: number;
  teacher?: AdminTeacherDetail;
  error?: string;
  notFound?: boolean;
  assignmentsLoading?: boolean;
  assignmentsError?: string;
};

function Info({ label, value }: { label: string; value: string | null }) {
  return <div className="p-3 bg-neutral/40 border border-line/60 rounded-xl min-w-0">
    <dt className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</dt>
    <dd className="text-xs font-bold text-ink mt-1 break-words">{value ?? 'No registrado'}</dd>
  </div>;
}

export default function PerfilDelDocente() {
  const { id } = useParams<{ id: string }>();
  return <TeacherProfile key={id} teacherId={id} />;
}

function TeacherProfile({ teacherId }: { teacherId: string }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const mutationRef = useRef(false);
  const loading = result?.revision !== revision;
  const teacher = loading ? undefined : result?.teacher;

  useEffect(() => {
    let current = true;
    teachersService.getById(teacherId)
      .then(response => { if (current) setResult({ revision, teacher: toAdminTeacherDetail(response) }); })
      .catch(error => { if (current) setResult({ revision, error: teacherErrorMessage(error), notFound: teacherErrorStatus(error) === 404 }); });
    return () => { current = false; };
  }, [teacherId, revision]);

  async function toggleActive() {
    if (!teacher || mutationRef.current) return;
    if (teacher.active && !window.confirm('Al desactivar al docente también se desactivarán sus asignaciones activas. ¿Deseas continuar?')) return;
    mutationRef.current = true;
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      const updated = await teachersService.update(teacher.id, { active: !teacher.active });
      setResult({
        revision, teacher: { ...toAdminTeacher(updated), assignments: teacher.assignments }, assignmentsLoading: true,
      });
      setNotice(updated.active
        ? 'Docente reactivado. Las asignaciones anteriores no se reactivan.'
        : 'Docente desactivado. Sus asignaciones activas también se han desactivado.');
      try {
        const detail = await teachersService.getById(teacher.id);
        setResult({ revision, teacher: toAdminTeacherDetail(detail) });
      } catch (error) {
        setResult(previous => previous ? { ...previous, assignmentsLoading: false, assignmentsError: teacherErrorMessage(error) } : previous);
      }
    } catch (error) {
      setActionError(teacherErrorMessage(error));
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="w-full h-full p-6 md:p-10 overflow-y-auto bg-canvas font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <Link href="/administrador/docentes" className="text-muted text-xs font-bold hover:text-accent flex items-center gap-2 w-fit min-h-10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ArrowLeft01Icon size={14} aria-hidden="true" />Regresar a lista de docentes</Link>
        {loading && <p role="status" className="bg-white border border-line rounded-xl p-6 shadow-sm text-sm text-muted flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="text-accent" />Cargando docente...</p>}
        {!loading && result?.error && <div role="alert" className="bg-rose-50 rounded-xl border border-rose-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold">{result.notFound ? 'Docente no encontrado' : 'No se pudo cargar el docente'}</h1>
          <p className="text-sm text-rose-700 mt-2 flex items-start gap-2 break-words"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{result.error}</p>
          <button onClick={() => setRevision(n => n + 1)} className="mt-4 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
        </div>}
        {teacher && <>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div><span className="text-accent text-[11px] font-bold tracking-widest uppercase">Equipo académico</span><h1 className="text-ink text-2xl font-bold tracking-tight mt-1">Perfil de docente</h1></div>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => { setNotice(''); setActionError(''); setEditing(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"><PencilEdit01Icon size={16} aria-hidden="true" />Editar docente</button>
              <button disabled={busy} onClick={toggleActive} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{busy ? 'Guardando...' : teacher.active ? 'Desactivar docente' : 'Reactivar docente'}</button>
            </div>
          </header>
          {notice && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">{notice}</p>}
          {actionError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm break-words">{actionError} Puedes volver a intentar la acción.</p>}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-5 min-w-0 bg-white border border-line rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-line">
                <span className="w-14 h-14 rounded-full border border-accent/20 bg-accent-soft text-accent flex items-center justify-center font-bold shrink-0">{teacher.iniciales}</span>
                <div className="min-w-0"><h2 className="text-lg font-bold tracking-tight text-ink break-words">{teacher.nombreCompleto}</h2><p className="text-[10px] font-bold inline-block mt-2 rounded-full px-2 py-1 border border-line bg-neutral text-ink">{teacher.estadoLabel}</p></div>
              </div>
              <dl className="flex flex-col gap-3">
                <Info label="DNI" value={teacher.dni} />
                <Info label="Nombres" value={teacher.firstNames} />
                <Info label="Apellido paterno" value={teacher.paternalLastName} />
                <Info label="Apellido materno" value={teacher.maternalLastName} />
                <Info label="Teléfono" value={teacher.phone} />
                <Info label="Especialidad" value={teacher.specialty} />
                <Info label="Estado" value={teacher.estadoLabel} />
              </dl>
            </section>
            <section className="lg:col-span-7 min-w-0 bg-white border border-line rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4 pb-3 border-b border-line"><BookOpen01Icon size={18} aria-hidden="true" className="text-accent shrink-0" />Asignaciones actuales / históricas</h2>
              {result?.assignmentsLoading ? <p role="status" className="text-sm text-muted p-4 border border-line bg-neutral/30 rounded-xl flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="shrink-0" />Actualizando asignaciones...</p> :
                result?.assignmentsError ? <div role="alert" className="text-sm text-rose-700 p-4 rounded-xl border border-rose-200 bg-rose-50 break-words">
                  <p>No se pudieron actualizar las asignaciones. {result.assignmentsError}</p>
                  <button onClick={() => setRevision(n => n + 1)} className="font-bold mt-3 min-h-10 px-3 py-2 rounded-lg bg-white border border-line hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
                </div> :
                  teacher.assignments.length === 0 ? <div className="p-6 border border-dashed border-line rounded-xl bg-neutral/30 text-center flex flex-col items-center gap-2"><BookOpen01Icon size={24} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold text-ink">Sin asignaciones registradas.</p><p className="text-xs text-muted">No hay asignaciones actuales ni históricas para mostrar.</p></div> :
                    <div className="flex flex-col gap-3">
                      {teacher.assignments.map(assignment => <article key={assignment.id} className="border border-line bg-white rounded-xl p-4 shadow-sm min-w-0">
                        <h3 className="font-bold text-sm text-ink break-words pb-3 border-b border-line">{assignment.courseCode} • {assignment.courseName}</h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs break-words">
                          <div><dt className="text-muted">ID de sección</dt><dd className="font-bold">{assignment.sectionId}</dd></div>
                          <div><dt className="text-muted">Fecha de asignación</dt><dd><time dateTime={assignment.assignedAt}>{assignment.assignedAt}</time></dd></div>
                          <div><dt className="text-muted">Estado</dt><dd className={`font-bold text-[10px] border rounded-full px-2 py-1 mt-1 w-fit ${assignment.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral text-muted border-line'}`}>{assignment.active ? 'Activa' : 'Inactiva'}</dd></div>
                        </dl>
                      </article>)}
                    </div>}
            </section>
          </div>
          {editing && <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div role="dialog" aria-modal="true" aria-labelledby="edit-teacher-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-5 sm:p-6 max-w-xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 id="edit-teacher-title" className="text-base font-bold tracking-tight mb-5 pb-3 border-b border-line flex items-center gap-2"><UserCircleIcon size={18} aria-hidden="true" className="text-accent" />Editar docente</h2>
              <TeacherForm teacher={teacher} onCancel={() => setEditing(false)} onSave={async payload => {
                if (mutationRef.current) throw new Error('Operación en curso');
                mutationRef.current = true;
                setBusy(true);
                try {
                  const updated = await teachersService.update(teacher.id, payload);
                  setResult(previous => ({
                    revision, teacher: { ...toAdminTeacher(updated), assignments: teacher.assignments },
                    assignmentsError: previous?.assignmentsError,
                  }));
                  setEditing(false);
                  setNotice('Cambios guardados por el servidor.');
                } finally { mutationRef.current = false; setBusy(false); }
              }} />
            </div>
          </div>}
        </>}
      </div>
    </div>
  );
}

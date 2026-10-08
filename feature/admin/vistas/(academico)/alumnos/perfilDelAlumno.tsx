'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, PencilEdit02Icon, UserCircleIcon, BookOpen01Icon, HeartAddIcon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { studentsService, studentErrorMessage, studentErrorStatus } from '@/services/admin/studentsService';
import { guardianRelationshipLabels, studentFullName, toAdminStudentDetail } from '@/adapters/studentAdapter';
import type { AdminStudentDetail } from '@/types/adminStudent';
import StudentEditForm from './components/StudentEditForm';

type DetailResult = { revision: number; student?: AdminStudentDetail; error?: string; notFound?: boolean };

const display = (value: string | number | null) => value === null ? 'No registrado' : value;
function Info({ label, value }: { label: string; value: string | number | null }) {
  return <div className="p-3 bg-neutral/40 border border-line/60 rounded-xl min-w-0">
    <dt className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</dt>
    <dd className="text-xs font-bold text-ink mt-1 break-words">{display(value)}</dd>
  </div>;
}

export default function PerfilDelAlumno() {
  const { estudianteId } = useParams<{ estudianteId: string }>();
  return <StudentProfile key={estudianteId} studentId={estudianteId} />;
}

function StudentProfile({ studentId }: { studentId: string }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const loading = result?.revision !== revision;
  const student = loading ? undefined : result?.student;

  useEffect(() => {
    let current = true;
    studentsService.getById(studentId)
      .then(response => { if (current) setResult({ revision, student: toAdminStudentDetail(response) }); })
      .catch(error => { if (current) setResult({ revision, error: studentErrorMessage(error), notFound: studentErrorStatus(error) === 404 }); });
    return () => { current = false; };
  }, [studentId, revision]);

  return (
    <div className="w-full h-full flex flex-col bg-canvas overflow-y-auto font-sans">
      <div className="h-28 bg-accent relative shrink-0">
        <Link href="/administrador/alumnos" className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/20 backdrop-blur-xs text-white rounded-xl text-xs font-bold min-h-10 hover:bg-black/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ArrowLeft01Icon size={16} aria-hidden="true" />Todos los alumnos</Link>
      </div>
      <div className="max-w-5xl w-full mx-auto px-6 pb-12 -mt-12 relative flex flex-col gap-6">
        {loading && <div role="status" className="bg-white rounded-2xl border border-line p-6 shadow-sm text-sm text-muted flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="text-accent" />Cargando alumno...</div>}
        {!loading && result?.error && <div role="alert" className="bg-rose-50 rounded-2xl border border-rose-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold">{result.notFound ? 'Alumno no encontrado' : 'No se pudo cargar el alumno'}</h1>
          <p className="mt-2 text-sm text-rose-700 flex items-start gap-2 break-words"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{result.error}</p>
          <button onClick={() => setRevision(n => n + 1)} className="mt-4 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
        </div>}
        {student && <>
          <header className="bg-white rounded-2xl border border-line p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-16 h-16 rounded-full border border-accent/20 bg-accent/10 text-accent font-bold flex items-center justify-center shrink-0">{student.nombres.charAt(0)}{student.apellidoPaterno.charAt(0)}</div>
              <div className="min-w-0"><h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink break-words">{student.nombreCompleto}</h1><span className="text-[10px] font-bold text-ink bg-neutral border border-line px-2 py-1 rounded-full inline-block mt-2">{student.estadoLabel}</span></div>
            </div>
            <button onClick={() => { setSaved(false); setEditing(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><PencilEdit02Icon size={16} aria-hidden="true" />Editar alumno</button>
          </header>
          {saved && <p role="status" className="rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">Cambios guardados por el servidor.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4 pb-3 border-b border-line"><UserCircleIcon size={18} aria-hidden="true" className="text-accent shrink-0" />Identidad</h2>
              <dl className="grid grid-cols-1 gap-3">
                <Info label="Código estudiante" value={student.studentCode} />
                <Info label="DNI" value={student.dni} />
                <Info label="Nombres" value={student.nombres} />
                <Info label="Apellido paterno" value={student.apellidoPaterno} />
                <Info label="Apellido materno" value={student.apellidoMaterno} />
                <Info label="Fecha de nacimiento" value={student.birthDate} />
                <Info label="Teléfono" value={student.phone} />
                <Info label="Estado estudiante" value={student.estadoLabel} />
              </dl>
            </section>
            <div className="flex flex-col gap-6">
              <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4 pb-3 border-b border-line"><BookOpen01Icon size={18} aria-hidden="true" className="text-accent shrink-0" />Matrícula actual</h2>
                {student.tieneMatriculaActiva ? <dl className="grid grid-cols-1 gap-3">
                  <Info label="Estado matrícula" value={student.matriculaLabel} />
                  <Info label="Periodo" value={student.academicPeriodName} />
                  <Info label="Nivel" value={student.nivelLabel} />
                  <Info label="Grado" value={student.grade} />
                  <Info label="Sección" value={student.sectionName} />
                  <Info label="Fecha matrícula" value={student.enrollmentDate} />
                </dl> : <p className="text-sm text-muted border border-dashed border-line rounded-xl p-4 bg-neutral/30 flex items-center gap-2"><BookOpen01Icon size={20} aria-hidden="true" className="shrink-0" />Sin matrícula activa</p>}
              </section>
              <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4 pb-3 border-b border-line"><HeartAddIcon size={18} aria-hidden="true" className="text-accent shrink-0" />Apoderados</h2>
                {student.guardians.length === 0 && <p className="text-sm text-muted border border-dashed border-line rounded-xl p-4 bg-neutral/30 flex items-center gap-2"><HeartAddIcon size={20} aria-hidden="true" className="shrink-0" />Sin apoderados registrados.</p>}
                <div className="flex flex-col gap-4">
                  {student.guardians.map(guardian => <article key={guardian.guardianId} className="border border-line rounded-xl p-4 shadow-sm min-w-0">
                    <h3 className="text-sm font-bold text-ink break-words mb-3 pb-3 border-b border-line">{studentFullName(guardian)}</h3>
                    <dl className="grid grid-cols-1 gap-2">
                      <Info label="DNI" value={guardian.dni} />
                      <Info label="Teléfono" value={guardian.phone} />
                      <Info label="Relación" value={guardianRelationshipLabels[guardian.relationship]} />
                      <Info label="Principal" value={guardian.primary ? 'Sí' : 'No'} />
                      <Info label="Autorizado para recoger" value={guardian.authorizedPickup ? 'Sí' : 'No'} />
                      <Info label="Estado de relación" value={guardian.active ? 'Activa' : 'Inactiva'} />
                    </dl>
                  </article>)}
                </div>
              </section>
            </div>
          </div>
          {editing && <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div role="dialog" aria-modal="true" aria-labelledby="edit-student-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-5 sm:p-6 max-w-xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 id="edit-student-title" className="text-base font-bold tracking-tight mb-5 pb-3 border-b border-line flex items-center gap-2"><UserCircleIcon size={18} aria-hidden="true" className="text-accent" />Editar alumno</h2>
              <StudentEditForm student={student} onCancel={() => setEditing(false)} onSave={async patch => {
                const updated = await studentsService.update(student.id, patch);
                setResult({ revision, student: toAdminStudentDetail(updated) });
                setEditing(false);
                setSaved(true);
              }} />
            </div>
          </div>}
        </>}
      </div>
    </div>
  );
}

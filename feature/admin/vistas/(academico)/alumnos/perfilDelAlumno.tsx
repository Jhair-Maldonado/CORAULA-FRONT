'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, PencilEdit02Icon, UserCircleIcon, BookOpen01Icon, HeartAddIcon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { guardianCreateErrorMessage, isUncertainGuardianCreate, studentsService, studentErrorMessage, studentErrorStatus } from '@/services/admin/studentsService';
import { guardianRelationshipLabels, studentFullName, toAdminStudentDetail } from '@/adapters/studentAdapter';
import type { AdminStudentDetail } from '@/types/adminStudent';
import StudentEditForm from './components/StudentEditForm';
import WithdrawEnrollmentDialog from './components/WithdrawEnrollmentDialog';
import EnrollStudentForm from './components/EnrollStudentForm';
import AddGuardianDialog from './components/AddGuardianDialog';
import { AuthContext } from '@/contexts/AuthContext';
import { enrollmentsService, enrollmentErrorMessage, enrollmentErrorStatus } from '@/services/admin/enrollmentsService';
import type { WithdrawEnrollmentRequest } from '@/types/enrollmentApi';
import type { CreateStudentGuardianRequest } from '@/types/studentApi';
import { Failure, SectionDialog, destructiveButtonClass, primaryButtonClass, secondaryButtonClass } from '../secciones/sectionUi';

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
  const auth = useContext(AuthContext);
  return <StudentProfile key={JSON.stringify([estudianteId, auth?.role, auth?.status, auth?.sessionValid, auth?.token])} studentId={estudianteId} />;
}

function StudentProfile({ studentId }: { studentId: string }) {
  const auth = useContext(AuthContext);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawNotice, setWithdrawNotice] = useState('');
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollBusy, setEnrollBusy] = useState(false);
  const [enrollNotice, setEnrollNotice] = useState('');
  const [addingGuardian, setAddingGuardian] = useState(false);
  const [guardianBusy, setGuardianBusy] = useState(false);
  const [guardianError, setGuardianError] = useState('');
  const [guardianNotice, setGuardianNotice] = useState('');
  const mutation = useRef(false);
  const target = useRef<number | null>(null);
  const verification = useRef<{ enrollmentId: number; accepted: boolean; message: string } | null>(null);
  const lifetime = useRef({ active: true });
  const canWithdraw = auth?.role === 'ADMINISTRADOR' && auth.status === 'authenticated' && auth.sessionValid;
  const loading = result?.revision !== revision;
  const student = loading ? undefined : result?.student;
  // Same ADMINISTRADOR gate as withdrawal; a previously withdrawn enrollment does not block a new one.
  const canEnroll = canWithdraw && student?.studentStatus === 'ACTIVE' && !student.tieneMatriculaActiva;
  // A profile reload unmounts every open dialog, so the guardian flow is mutually exclusive with withdrawal, enrollment and edition.
  const guardianLocked = addingGuardian || guardianBusy;

  useEffect(() => {
    const current = { active: true };
    lifetime.current = current;
    return () => { current.active = false; target.current = null; };
  }, [studentId, auth?.role, auth?.status, auth?.sessionValid, auth?.token]);

  async function verifyWithdrawal(pending: NonNullable<typeof verification.current>, current: { active: boolean }) {
    try {
      const updated = await studentsService.getById(studentId);
      if (!current.active) return;
      if (updated.studentId !== Number(studentId)) throw new Error('El perfil no corresponde al alumno.');
      setResult({ revision, student: toAdminStudentDetail(updated) });
      if (updated.enrollmentId === pending.enrollmentId && updated.enrollmentStatus === 'ACTIVE') {
        setWithdrawError(pending.accepted ? 'El servidor aceptó el retiro, pero el perfil aún muestra la matrícula activa. Actualiza la matrícula antes de continuar.' : pending.message);
      } else {
        verification.current = null;
        setRefreshRequired(false);
        setWithdrawError(pending.accepted ? '' : pending.message);
        setWithdrawNotice(pending.accepted ? 'Matrícula retirada y perfil actualizado.' : 'Perfil actualizado. La matrícula ya no está activa; verifica su retiro en auditoría.');
      }
    } catch {
      if (current.active) setWithdrawError(pending.accepted ? 'El servidor aceptó el retiro, pero no se pudo actualizar el perfil. Actualiza la matrícula para verificar su estado.' : pending.message + ' No se pudo actualizar el perfil.');
    }
  }

  async function withdraw(request: WithdrawEnrollmentRequest) {
    const enrollmentId = target.current;
    if (!canWithdraw || !auth?.isSessionPhysicallyValid() || mutation.current || verification.current || !enrollmentId || !student?.tieneMatriculaActiva || student.enrollmentId !== enrollmentId) return;
    const current = lifetime.current;
    if (!current.active) return;
    mutation.current = true;
    setWithdrawBusy(true);
    setWithdrawError('');
    setWithdrawNotice('');
    const pending = { enrollmentId, accepted: false, message: '' };
    verification.current = pending;
    setRefreshRequired(true);
    try {
      await enrollmentsService.withdraw(Number(studentId), enrollmentId, request);
      if (!current.active) return;
      pending.accepted = true;
    } catch (error) {
      if (!current.active) return;
      pending.message = enrollmentErrorMessage(error);
      if (enrollmentErrorStatus(error) === 400) {
        verification.current = null;
        setRefreshRequired(false);
        setWithdrawError(pending.message);
        return;
      }
      setWithdrawError(pending.message);
    } finally {
      if (current.active && verification.current === null) { mutation.current = false; setWithdrawBusy(false); }
    }
    if (!current.active) return;
    target.current = null;
    setWithdrawing(false);
    await verifyWithdrawal(pending, current);
    if (current.active) { mutation.current = false; setWithdrawBusy(false); }
  }

  async function refreshWithdrawal() {
    const pending = verification.current, current = lifetime.current;
    if (mutation.current || !pending || !current.active || !canWithdraw || !auth?.isSessionPhysicallyValid()) return;
    mutation.current = true;
    setWithdrawBusy(true);
    await verifyWithdrawal(pending, current);
    if (current.active) { mutation.current = false; setWithdrawBusy(false); }
  }

  // Single POST without automatic retries; success or an uncertain outcome closes the dialog and reloads the profile.
  async function addGuardian(request: CreateStudentGuardianRequest) {
    if (!canWithdraw || !auth?.isSessionPhysicallyValid() || mutation.current || verification.current || !student) return;
    const current = lifetime.current;
    if (!current.active) return;
    mutation.current = true;
    setGuardianBusy(true);
    setGuardianError('');
    try {
      const guardian = await studentsService.addGuardian(Number(student.id), request);
      if (!current.active) return;
      setAddingGuardian(false);
      setGuardianNotice(`Apoderado agregado: ${studentFullName(guardian)} · DNI ${guardian.dni}.`);
      setRevision(n => n + 1);
    } catch (error) {
      if (!current.active) return;
      setGuardianError(guardianCreateErrorMessage(error));
      if (isUncertainGuardianCreate(error)) { setAddingGuardian(false); setRevision(n => n + 1); }
    } finally {
      if (current.active) { mutation.current = false; setGuardianBusy(false); }
    }
  }

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
        {!withdrawing && withdrawBusy && <p role="status" className="bg-white rounded-xl p-4">Verificando el estado de la matrícula...</p>}
        {!withdrawing && withdrawError && <Failure message={withdrawError} />}
        {withdrawNotice && <p role="status" className="rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">{withdrawNotice}</p>}
        {enrollNotice && <p role="status" className="rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">{enrollNotice}</p>}
        {!addingGuardian && guardianError && <Failure message={guardianError} />}
        {guardianNotice && <p role="status" className="rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">{guardianNotice}</p>}
        {refreshRequired && !withdrawBusy && canWithdraw && <button className={secondaryButtonClass} onClick={() => void refreshWithdrawal()}>Actualizar matrícula</button>}
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
            <button disabled={withdrawBusy || withdrawing || refreshRequired || guardianLocked} onClick={() => { setSaved(false); setEditing(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><PencilEdit02Icon size={16} aria-hidden="true" />Editar alumno</button>
          </header>
          {saved && <p role="status" className="rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">Cambios guardados por el servidor.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4 pb-3 border-b border-line"><UserCircleIcon size={18} aria-hidden="true" className="text-accent shrink-0" />Identidad</h2>
              <dl className="grid grid-cols-1 gap-3">
                <Info label="Código estudiante" value={student.studentCode} />
                <Info label="Nombres" value={student.nombres} />
                {/* Apellido paterno y materno en una sola fila */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Info label="Apellido paterno" value={student.apellidoPaterno} />
                  <Info label="Apellido materno" value={student.apellidoMaterno} />
                </div>
                {/* DNI y fecha de nacimiento en una sola fila */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Info label="DNI" value={student.dni} />
                  <Info label="Fecha de nacimiento" value={student.birthDate} />
                </div>
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
                {canWithdraw && student.tieneMatriculaActiva && student.enrollmentId !== null && <button className={`${destructiveButtonClass} mt-4`} disabled={withdrawBusy || refreshRequired || editing || guardianLocked} onClick={() => {
                  if (mutation.current || verification.current) return;
                  target.current = student.enrollmentId;
                  setWithdrawError(''); setWithdrawNotice(''); setWithdrawing(true);
                }}>Retirar matrícula</button>}
                {canEnroll && <button className={`${primaryButtonClass} mt-4`} disabled={withdrawBusy || withdrawing || refreshRequired || editing || guardianLocked} onClick={() => {
                  if (mutation.current || verification.current) return;
                  setEnrollNotice(''); setWithdrawNotice(''); setEnrolling(true);
                }}>Matricular en sección</button>}
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
                {canWithdraw && <button className={`${primaryButtonClass} mt-4`} disabled={withdrawBusy || withdrawing || refreshRequired || editing || enrolling || enrollBusy || guardianLocked} onClick={() => {
                  if (mutation.current || verification.current) return;
                  setSaved(false); setEnrollNotice(''); setWithdrawNotice(''); setWithdrawError(''); setGuardianNotice(''); setGuardianError('');
                  setAddingGuardian(true);
                }}>Agregar apoderado</button>}
              </section>
            </div>
          </div>
          {withdrawing && canWithdraw && student.enrollmentId !== null && <WithdrawEnrollmentDialog name={student.nombreCompleto} enrollmentId={student.enrollmentId} enrollmentDate={student.enrollmentDate} busy={withdrawBusy} error={withdrawError}
            onCancel={() => { if (!mutation.current) { target.current = null; setWithdrawing(false); } }} onConfirm={request => void withdraw(request)} />}
          {addingGuardian && canWithdraw && <AddGuardianDialog name={student.nombreCompleto} guardians={student.guardians} busy={guardianBusy} error={guardianError}
            onCancel={() => { if (!mutation.current) { setAddingGuardian(false); setGuardianError(''); } }} onConfirm={request => void addGuardian(request)} />}
          {enrolling && canEnroll && <SectionDialog title="Matricular en sección" busy={enrollBusy} onClose={() => { setEnrolling(false); setRevision(n => n + 1); }}>
            <EnrollStudentForm studentId={Number(student.id)} studentStatus={student.studentStatus} hasActiveEnrollment={student.tieneMatriculaActiva}
              cancelLabel="Cancelar" onBusyChange={setEnrollBusy} onCancel={() => { setEnrolling(false); setRevision(n => n + 1); }}
              onEnrolled={enrollment => {
                setEnrolling(false);
                setEnrollNotice(`Matrícula registrada en ${enrollment.academicPeriodName} · ${enrollment.grade}° ${enrollment.sectionName}.`);
                setRevision(n => n + 1);
              }} />
          </SectionDialog>}
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

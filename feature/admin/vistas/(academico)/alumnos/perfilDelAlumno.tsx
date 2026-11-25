'use client';

import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, PencilEdit02Icon, UserCircleIcon, BookOpen01Icon, HeartAddIcon, AlertCircleIcon, Clock01Icon, Calendar01Icon, SmartPhone01Icon, CheckmarkCircle01Icon } from 'hugeicons-react';
import { guardianCreateErrorMessage, isUncertainGuardianCreate, studentsService, studentErrorMessage, studentErrorStatus } from '@/services/admin/studentsService';
import { guardianRelationshipLabels, studentFullName, studentStatusTone, toAdminStudentDetail } from '@/adapters/studentAdapter';
import { studentStatusToneClass } from '@/adapters/studentUi';
import type { AdminStudentDetail } from '@/types/adminStudent';
import StudentEditForm from './components/StudentEditForm';
import WithdrawEnrollmentDialog from './components/WithdrawEnrollmentDialog';
import EnrollStudentForm from './components/EnrollStudentForm';
import AddGuardianDialog from './components/AddGuardianDialog';
import StudentStateDialog from './components/StudentStateDialog';
import { availableStudentStateActions, studentStateActionLabels, studentStateChangeReloads, studentStateErrorMessage, studentStateService, studentStateSuccessMessage } from '@/services/admin/studentStateService';
import { AuthContext } from '@/contexts/AuthContext';
import { useCan } from '@/hooks/useCan';
import { enrollmentsService, enrollmentErrorMessage, enrollmentErrorStatus } from '@/services/admin/enrollmentsService';
import type { WithdrawEnrollmentRequest } from '@/types/enrollmentApi';
import type { ChangeStudentStateRequest, CreateStudentGuardianRequest, StudentStateAction } from '@/types/studentApi';
import { Failure, SectionDialog, destructiveButtonClass, primaryButtonClass, secondaryButtonClass, sectionName } from '../secciones/sectionUi';

type DetailResult = { revision: number; student?: AdminStudentDetail; error?: string; notFound?: boolean };

const display = (value: string | number | null) => value === null ? 'No registrado' : value;
/** Fila de dato con icono; el valor largo se trunca y el texto completo queda en el `title`. */
function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string | number | null }) {
  const text = String(display(value));
  return <div className="flex items-center gap-3.5 p-3 bg-neutral/50 rounded-xl min-w-0">
    <div aria-hidden="true" className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0 shadow-xs">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p title={text} className="text-xs font-bold text-ink mt-0.5 truncate">{text}</p>
    </div>
  </div>;
}

export default function PerfilDelAlumno() {
  // `id` solo existe en la ruta grado/[id]/estudiante/[estudianteId]: con él, el enlace de vuelta lleva al aula.
  const { estudianteId, id } = useParams<{ estudianteId: string; id?: string }>();
  const auth = useContext(AuthContext);
  const sectionId = id !== undefined && /^\d+$/.test(id) ? id : undefined;
  return <StudentProfile key={JSON.stringify([estudianteId, auth?.role, auth?.status, auth?.sessionValid, auth?.token])} studentId={estudianteId} sectionId={sectionId} />;
}

function StudentProfile({ studentId, sectionId }: { studentId: string; sectionId?: string }) {
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
  const [stateAction, setStateAction] = useState<StudentStateAction | null>(null);
  const [stateBusy, setStateBusy] = useState(false);
  const [stateError, setStateError] = useState('');
  const [stateNotice, setStateNotice] = useState('');
  const mutation = useRef(false);
  const target = useRef<number | null>(null);
  const verification = useRef<{ enrollmentId: number; accepted: boolean; message: string } | null>(null);
  const lifetime = useRef({ active: true });
  const canWithdraw = useCan('enrollment.withdraw');
  const canEnrollAction = useCan('enrollment.create');
  const canChangeState = useCan('student.changeState');
  const canAddGuardian = useCan('guardian.create');
  const loading = result?.revision !== revision;
  const student = loading ? undefined : result?.student;
  // Own permission (enrollment.create); a previously withdrawn enrollment does not block a new one.
  const canEnroll = canEnrollAction && student?.studentStatus === 'ACTIVE' && !student.tieneMatriculaActiva;
  // A profile reload unmounts every open dialog, so the guardian flow is mutually exclusive with withdrawal, enrollment and edition.
  const guardianLocked = addingGuardian || guardianBusy;
  // Same exclusivity for the state change (student.changeState; DIRECTIVO only reads the state).
  const stateLocked = stateAction !== null || stateBusy;
  const stateActions = canChangeState && student ? availableStudentStateActions(student.studentStatus) : [];

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
    if (!canAddGuardian || !auth?.isSessionPhysicallyValid() || mutation.current || verification.current || !student) return;
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

  // Single PATCH without automatic retries; success, 404, 409 or an uncertain outcome closes the dialog and reloads the profile.
  async function changeState(request: ChangeStudentStateRequest) {
    const action = stateAction;
    if (!action || !canChangeState || !auth?.isSessionPhysicallyValid() || mutation.current || verification.current || !student
      || !availableStudentStateActions(student.studentStatus).includes(action)) return;
    const current = lifetime.current;
    if (!current.active) return;
    mutation.current = true;
    setStateBusy(true);
    setStateError('');
    try {
      const change = await studentStateService.change(Number(student.id), action, request);
      if (!current.active) return;
      setStateAction(null);
      setStateNotice(studentStateSuccessMessage(change));
      setRevision(n => n + 1);
    } catch (error) {
      if (!current.active) return;
      setStateError(studentStateErrorMessage(error));
      if (studentStateChangeReloads(error)) { setStateAction(null); setRevision(n => n + 1); }
    } finally {
      if (current.active) { mutation.current = false; setStateBusy(false); }
    }
  }

  useEffect(() => {
    let current = true;
    studentsService.getById(studentId)
      .then(response => { if (current) setResult({ revision, student: toAdminStudentDetail(response) }); })
      .catch(error => { if (current) setResult({ revision, error: studentErrorMessage(error), notFound: studentErrorStatus(error) === 404 }); });
    return () => { current = false; };
  }, [studentId, revision]);

  const notice = 'rounded-xl p-3 bg-success text-success-ink text-sm';
  // El principal va primero; el orden relativo del resto se conserva.
  const guardians = student ? [...student.guardians].sort((a, b) => Number(b.primary) - Number(a.primary)) : [];
  const chip = 'px-2.5 py-1 rounded-lg flex items-center gap-1.5';
  return (
    <div className="w-full h-full flex flex-col bg-canvas overflow-y-auto font-sans">
      <div className="h-28 bg-accent relative shrink-0">
        <div className="absolute top-6 left-6 md:left-8 z-10 flex gap-2">
          <Link href={sectionId ? `/administrador/alumnos/grado/${sectionId}` : '/administrador/alumnos'} className="flex items-center gap-2 px-3.5 py-1.5 bg-black/20 backdrop-blur-xs text-white rounded-xl text-xs font-bold min-h-10 hover:bg-black/30 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ArrowLeft01Icon size={16} aria-hidden="true" />{sectionId ? 'Volver al aula' : 'Todos los alumnos'}</Link>
        </div>
      </div>
      <div className="max-w-5xl w-full mx-auto px-6 md:px-8 pb-12 -mt-12 relative z-20 flex-1 flex flex-col gap-6">
        {!withdrawing && withdrawBusy && <p role="status" className="bg-white rounded-xl p-4">Verificando el estado de la matrícula...</p>}
        {!withdrawing && withdrawError && <Failure message={withdrawError} />}
        {withdrawNotice && <p role="status" className={notice}>{withdrawNotice}</p>}
        {enrollNotice && <p role="status" className={notice}>{enrollNotice}</p>}
        {!addingGuardian && guardianError && <Failure message={guardianError} />}
        {guardianNotice && <p role="status" className={notice}>{guardianNotice}</p>}
        {!stateAction && stateError && <Failure message={stateError} />}
        {stateNotice && <p role="status" className={notice}>{stateNotice}</p>}
        {refreshRequired && !withdrawBusy && canWithdraw && <button className={secondaryButtonClass} onClick={() => void refreshWithdrawal()}>Actualizar matrícula</button>}
        {loading && <div role="status" className="bg-white rounded-2xl border border-line p-6 shadow-sm text-sm text-muted flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="text-accent" />Cargando alumno...</div>}
        {!loading && result?.error && <div role="alert" className="bg-accent-soft/60 rounded-2xl border border-accent-soft p-6 shadow-sm">
          <h1 className="text-xl font-bold">{result.notFound ? 'Alumno no encontrado' : 'No se pudo cargar el alumno'}</h1>
          <p className="mt-2 text-sm text-accent flex items-start gap-2 break-words"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{result.error}</p>
          <button onClick={() => setRevision(n => n + 1)} className="mt-4 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
        </div>}
        {student && <>
          <header className="bg-white rounded-2xl shadow-sm border border-line p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto min-w-0">
              <div aria-hidden="true" className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-neutral border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-accent shrink-0">{student.nombres.charAt(0)}{student.apellidoPaterno.charAt(0)}</div>
              <div className="flex-1 min-w-0 text-center sm:text-left w-full sm:w-auto">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink break-words mb-1">{student.nombreCompleto}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold text-muted">
                  {student.aulaLabel && <span className={`${chip} bg-neutral text-ink`}><BookOpen01Icon size={14} aria-hidden="true" />{student.aulaLabel}</span>}
                  <span className={`${chip} bg-neutral text-ink`}><UserCircleIcon size={14} aria-hidden="true" />DNI: {display(student.dni)}</span>
                  <span className={`${chip} border ${studentStatusToneClass[studentStatusTone(student.studentStatus)]}`}>{student.estadoLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
              {stateActions.map(action => <button key={action} className={action === 'REACTIVATE' ? secondaryButtonClass : destructiveButtonClass}
                disabled={withdrawBusy || withdrawing || refreshRequired || editing || enrolling || enrollBusy || guardianLocked || stateLocked} onClick={() => {
                  if (mutation.current || verification.current) return;
                  setSaved(false); setEnrollNotice(''); setWithdrawNotice(''); setWithdrawError(''); setGuardianNotice(''); setGuardianError('');
                  setStateNotice(''); setStateError(''); setStateAction(action);
                }}>{studentStateActionLabels[action].button}</button>)}
              <button disabled={withdrawBusy || withdrawing || refreshRequired || guardianLocked || stateLocked} onClick={() => { setSaved(false); setEditing(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><PencilEdit02Icon size={16} aria-hidden="true" />Editar alumno</button>
            </div>
          </header>
          {saved && <p role="status" className={notice}>Cambios guardados por el servidor.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4"><UserCircleIcon size={18} aria-hidden="true" className="text-accent shrink-0" />Datos personales</h2>
              <div className="grid grid-cols-1 gap-3">
                <InfoRow icon={<UserCircleIcon size={16} />} label="Código estudiante" value={student.studentCode} />
                <InfoRow icon={<Calendar01Icon size={16} />} label="F. Nacimiento" value={student.birthDateLabel} />
                <InfoRow icon={<SmartPhone01Icon size={16} />} label="Teléfono" value={student.phone} />
              </div>
            </section>
            <div className="flex flex-col gap-6">
              <section className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4"><BookOpen01Icon size={18} aria-hidden="true" className="text-accent shrink-0" />Matrícula actual</h2>
                {student.tieneMatriculaActiva ? <div className="grid grid-cols-1 gap-3">
                  <InfoRow icon={<Calendar01Icon size={16} />} label="Periodo" value={student.academicPeriodName} />
                  <InfoRow icon={<BookOpen01Icon size={16} />} label="Nivel" value={student.nivelLabel} />
                  <InfoRow icon={<BookOpen01Icon size={16} />} label="Grado" value={student.grade === null ? null : `${student.grade}.° grado`} />
                  <InfoRow icon={<BookOpen01Icon size={16} />} label="Sección" value={student.sectionName ? sectionName(student.sectionName) : null} />
                  <InfoRow icon={<Calendar01Icon size={16} />} label="Fecha de matrícula" value={student.enrollmentDateLabel} />
                  <InfoRow icon={<CheckmarkCircle01Icon size={16} />} label="Estado de matrícula" value={student.matriculaLabel} />
                </div> : <p className="text-sm text-muted border border-dashed border-line rounded-xl p-4 bg-neutral/30 flex items-center gap-2"><BookOpen01Icon size={20} aria-hidden="true" className="shrink-0" />Sin matrícula activa</p>}
                {canWithdraw && student.tieneMatriculaActiva && student.enrollmentId !== null && <button className={`${destructiveButtonClass} mt-4`} disabled={withdrawBusy || refreshRequired || editing || guardianLocked || stateLocked} onClick={() => {
                  if (mutation.current || verification.current) return;
                  target.current = student.enrollmentId;
                  setWithdrawError(''); setWithdrawNotice(''); setWithdrawing(true);
                }}>Retirar matrícula</button>}
                {canEnroll && <button className={`${primaryButtonClass} mt-4`} disabled={withdrawBusy || withdrawing || refreshRequired || editing || guardianLocked || stateLocked} onClick={() => {
                  if (mutation.current || verification.current) return;
                  setEnrollNotice(''); setWithdrawNotice(''); setEnrolling(true);
                }}>Matricular en sección</button>}
              </section>
              <section className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4"><HeartAddIcon size={18} aria-hidden="true" className="text-accent shrink-0" />Familiar / Apoderado</h2>
                {guardians.length === 0 && <p className="text-sm text-muted border border-dashed border-line rounded-xl p-4 bg-neutral/30 flex items-center gap-2"><HeartAddIcon size={20} aria-hidden="true" className="shrink-0" />Sin apoderados registrados.</p>}
                <div className="flex flex-col gap-3">
                  {guardians.map(guardian => <article key={guardian.guardianId} className="p-3 bg-accent-soft/60 rounded-xl border border-accent-soft border-l-4 border-l-accent flex flex-col gap-2.5 min-w-0">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-ink break-words">{studentFullName(guardian)}</h3>
                        <p className="text-[11px] font-bold text-muted mt-0.5">{guardianRelationshipLabels[guardian.relationship]}{guardian.primary && <span className="ml-1.5 text-accent">· Principal</span>}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Celular</p>
                        <p className="text-sm font-bold text-ink tracking-tight mt-0.5">{display(guardian.phone)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-white border border-line text-ink">DNI: {display(guardian.dni)}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-white border border-line text-ink">{guardian.authorizedPickup ? 'Autorizado para recoger' : 'No autorizado para recoger'}</span>
                      <span className={`px-2 py-0.5 rounded-lg border ${guardian.active ? 'bg-success text-success-ink border-success' : 'bg-neutral text-muted border-line'}`}>{guardian.active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </article>)}
                </div>
                {canAddGuardian && <button className={`${primaryButtonClass} mt-4`} disabled={withdrawBusy || withdrawing || refreshRequired || editing || enrolling || enrollBusy || guardianLocked || stateLocked} onClick={() => {
                  if (mutation.current || verification.current) return;
                  setSaved(false); setEnrollNotice(''); setWithdrawNotice(''); setWithdrawError(''); setGuardianNotice(''); setGuardianError('');
                  setAddingGuardian(true);
                }}>Agregar apoderado</button>}
              </section>
            </div>
          </div>
          {withdrawing && canWithdraw && student.enrollmentId !== null && <WithdrawEnrollmentDialog name={student.nombreCompleto} enrollmentId={student.enrollmentId} enrollmentDate={student.enrollmentDate} busy={withdrawBusy} error={withdrawError}
            onCancel={() => { if (!mutation.current) { target.current = null; setWithdrawing(false); } }} onConfirm={request => void withdraw(request)} />}
          {stateAction && canChangeState && <StudentStateDialog action={stateAction} name={student.nombreCompleto} busy={stateBusy} error={stateError}
            onCancel={() => { if (!mutation.current) { setStateAction(null); setStateError(''); } }} onConfirm={request => void changeState(request)} />}
          {addingGuardian && canAddGuardian && <AddGuardianDialog name={student.nombreCompleto} guardians={student.guardians} busy={guardianBusy} error={guardianError}
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

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, PencilEdit01Icon, BookOpen01Icon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { Check, X } from 'lucide-react';
import { teachersService, teacherErrorMessage, teacherErrorStatus } from '@/services/admin/teachersService';
import { sectionsService } from '@/services/admin/sectionsService';
import { toAdminTeacher, toAdminTeacherDetail, toUpdateTeacher } from '@/adapters/teacherAdapter';
import { toSectionLabels, toTeacherAssignmentRows } from '@/adapters/teacherAssignmentAdapter';
import type { AdminTeacherDetail, SectionLabel, TeacherAccountCreated, TeacherAccountStateAction, TeacherAccountStateRequest, TeacherFormValues } from '@/types/adminTeacher';
import { useCan } from '@/hooks/useCan';
import { accountStateActionFor, accountStateActionLabels, accountStateChangeReloads, accountStateErrorMessage, accountStateService, accountStateSuccessMessage } from '@/services/admin/accountStateService';
import TeacherAccountModal from './TeacherAccountModal';
import DeactivateTeacherDialog from './DeactivateTeacherDialog';
import AccountStateDialog from '../../(sistema)/personal/AccountStateDialog';

type DetailResult = {
  revision: number;
  teacher?: AdminTeacherDetail;
  error?: string;
  notFound?: boolean;
  assignmentsLoading?: boolean;
  assignmentsError?: string;
};

// Las etiquetas de grado y sección se cargan aparte del detalle: si fallan, el perfil sigue visible.
type SectionsResult = { revision: number; labels?: ReadonlyMap<number, SectionLabel>; error?: boolean };

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="p-3 bg-neutral/40 border border-line/60 rounded-xl min-w-0">
      <dt className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-xs font-bold text-ink mt-1 break-words">{value ?? 'No registrado'}</dd>
    </div>
  );
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
  const [editError, setEditError] = useState('');
  const [notice, setNotice] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [accountRefreshError, setAccountRefreshError] = useState('');
  const [accountStateAction, setAccountStateAction] = useState<TeacherAccountStateAction | null>(null);
  const [accountStateError, setAccountStateError] = useState('');
  const [sectionsRevision, setSectionsRevision] = useState(0);
  const [sectionsResult, setSectionsResult] = useState<SectionsResult | null>(null);
  const mutationRef = useRef(false);
  const canCreateAccountAction = useCan('teacher.account.create');
  const canChangeAccountState = useCan('account.changeState');
  const loading = result?.revision !== revision;
  const teacher = loading ? undefined : result?.teacher;
  const account = teacher?.account ?? null;
  const canCreateAccount = canCreateAccountAction && !!teacher && account === null;
  const accountBlocked = !!teacher && (!teacher.active || !teacher.dni?.trim());

  const [initialValues, setInitialValues] = useState<TeacherFormValues>({
    dni: '',
    firstNames: '',
    paternalLastName: '',
    maternalLastName: '',
    phone: '',
    specialty: '',
  });

  const [editValues, setEditValues] = useState<TeacherFormValues>({
    dni: '',
    firstNames: '',
    paternalLastName: '',
    maternalLastName: '',
    phone: '',
    specialty: '',
  });

  useEffect(() => {
    let current = true;
    teachersService.getById(teacherId)
      .then(response => { if (current) setResult({ revision, teacher: toAdminTeacherDetail(response) }); })
      .catch(error => { if (current) setResult({ revision, error: teacherErrorMessage(error), notFound: teacherErrorStatus(error) === 404 }); });
    return () => { current = false; };
  }, [teacherId, revision]);

  // PERF: una sola petición a sectionsService.list() por docente (sin paginar, todos los periodos e inactivas), en paralelo con el detalle.
  // Es necesaria porque las asignaciones históricas pueden apuntar a secciones de periodos cerrados.
  useEffect(() => {
    let current = true;
    sectionsService.list()
      .then(sections => { if (current) setSectionsResult({ revision: sectionsRevision, labels: toSectionLabels(sections) }); })
      .catch(() => { if (current) setSectionsResult({ revision: sectionsRevision, error: true }); });
    return () => { current = false; };
  }, [teacherId, sectionsRevision]);

  const sectionsLoading = sectionsResult?.revision !== sectionsRevision;
  const sectionLabels = sectionsLoading ? null : sectionsResult?.labels ?? null;
  const sectionsFailed = !sectionsLoading && !!sectionsResult?.error;
  const assignmentRows = useMemo(
    () => toTeacherAssignmentRows(teacher?.assignments ?? [], sectionLabels),
    [teacher?.assignments, sectionLabels],
  );

  function startEditing() {
    if (!teacher) return;
    setNotice('');
    setActionError('');
    setEditError('');
    const vals: TeacherFormValues = {
      dni: teacher.dni || '',
      firstNames: teacher.firstNames || '',
      paternalLastName: teacher.paternalLastName || '',
      maternalLastName: teacher.maternalLastName || '',
      phone: teacher.phone || '',
      specialty: teacher.specialty || '',
    };
    setInitialValues(vals);
    setEditValues(vals);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditError('');
  }

  function isModified(key: keyof TeacherFormValues): boolean {
    return (editValues[key] ?? '').trim() !== (initialValues[key] ?? '').trim();
  }

  async function handleSaveInline(e: React.FormEvent) {
    e.preventDefault();
    if (mutationRef.current || !teacher) return;
    if (!/^[0-9A-Z]{8,12}$/i.test(editValues.dni.trim())) {
      setEditError('El DNI debe tener entre 8 y 12 caracteres (generalmente 8 dígitos).');
      return;
    }
    if (!editValues.firstNames.trim() || !editValues.paternalLastName.trim()) {
      setEditError('Nombres y apellido paterno son obligatorios.');
      return;
    }
    const patch = toUpdateTeacher(editValues, teacher);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    mutationRef.current = true;
    setBusy(true);
    setEditError('');
    setActionError('');
    try {
      const updated = await teachersService.update(teacher.id, patch);
      setResult(previous => ({
        revision,
        teacher: { ...toAdminTeacher(updated), assignments: teacher.assignments, account: teacher.account },
        assignmentsError: previous?.assignmentsError,
      }));
      setEditing(false);
      setNotice('Datos del docente actualizados correctamente.');
    } catch (failure) {
      setEditError(teacherErrorMessage(failure));
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  function requestToggleActive() {
    if (!teacher || mutationRef.current) return;
    if (teacher.active) setConfirmingDeactivate(true);
    else void toggleActive();
  }

  async function toggleActive() {
    if (!teacher || mutationRef.current) return;
    mutationRef.current = true;
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      const updated = await teachersService.update(teacher.id, { active: !teacher.active });
      setResult({
        revision, teacher: { ...toAdminTeacher(updated), assignments: teacher.assignments, account: teacher.account }, assignmentsLoading: true,
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

  // The POST response lacks the account state, so the persisted detail is read again.
  async function refreshAccount() {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setBusy(true);
    setAccountRefreshError('');
    try {
      const detail = toAdminTeacherDetail(await teachersService.getById(teacherId));
      setResult(previous => ({ revision, teacher: detail, assignmentsError: previous?.assignmentsError }));
    } catch (error) {
      setAccountRefreshError(teacherErrorMessage(error));
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  // Endpoint genérico de cuenta (BACK #105): cambia solo usuario.estado, nunca teacher.active.
  // Limitación conocida con cuentas de docente: ver TODO(backend) en accountStateService.
  async function changeAccountState(request: TeacherAccountStateRequest) {
    if (!account || !accountStateAction || mutationRef.current) return;
    mutationRef.current = true;
    setBusy(true);
    setAccountStateError('');
    let reload = false;
    try {
      const change = await accountStateService.change(account.userId, accountStateAction, request);
      setAccountStateAction(null);
      setNotice(accountStateSuccessMessage(change));
      reload = true;
    } catch (error) {
      if (accountStateChangeReloads(error)) {
        setAccountStateAction(null);
        setActionError(accountStateErrorMessage(error));
        reload = true;
      } else {
        setAccountStateError(accountStateErrorMessage(error));
      }
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
    if (reload) void refreshAccount();
  }

  function handleAccountCreated(created: TeacherAccountCreated) {
    setAccountOpen(false);
    setNotice(created.created
      ? `Cuenta de acceso creada para ${created.email}. La contraseña inicial es el DNI del docente; pídele que la cambie.`
      : `El docente ya tenía una cuenta con ${created.email}. No se modificó su contraseña.`);
    void refreshAccount();
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
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><span className="text-accent text-[11px] font-bold tracking-widest uppercase">Equipo académico</span><h1 className="text-ink text-2xl font-bold tracking-tight mt-1">Perfil de docente</h1><p className="text-muted text-xs font-medium mt-0.5">Consulta sus datos, asignaciones y cuenta de acceso.</p></div>
            <div className="flex flex-wrap gap-2">
              {!editing ? (
                <button disabled={busy} onClick={startEditing} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"><PencilEdit01Icon size={16} aria-hidden="true" />Editar docente</button>
              ) : (
                <button type="button" disabled={busy} onClick={cancelEditing} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">Cancelar edición</button>
              )}
              <button disabled={busy} onClick={requestToggleActive} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{busy ? 'Guardando...' : teacher.active ? 'Desactivar docente (no afecta su cuenta de acceso)' : 'Reactivar docente'}</button>
              {canChangeAccountState && account && <button disabled={busy} onClick={() => { setNotice(''); setActionError(''); setAccountRefreshError(''); setAccountStateError(''); setAccountStateAction(accountStateActionFor(account.active)); }} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{accountStateActionLabels[accountStateActionFor(account.active)].button}</button>}
              {canCreateAccount && <button disabled={busy || accountBlocked} onClick={() => { setNotice(''); setActionError(''); setAccountRefreshError(''); setAccountOpen(true); }} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">Crear cuenta de acceso</button>}
            </div>
          </header>
          {canCreateAccount && accountBlocked && <p className="text-xs text-muted">Para crear la cuenta de acceso, el docente debe estar activo y tener DNI registrado.</p>}
          {accountRefreshError && <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm break-words">
            <p>No se pudo actualizar el estado de la cuenta. {accountRefreshError}</p>
            <button disabled={busy} onClick={() => void refreshAccount()} className="font-bold mt-2 min-h-10 px-3 py-2 rounded-lg bg-white border border-line hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">Actualizar estado</button>
          </div>}
          {notice && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">{notice}</p>}
          {actionError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm break-words">{actionError} Puedes volver a intentar la acción.</p>}
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
            <div className="lg:col-span-7 min-w-0 flex flex-col gap-6">
              <section className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-5 items-start">
                <div className="w-full md:w-44 h-44 rounded-xl bg-neutral/80 border border-line shrink-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-accent-soft text-accent font-bold text-2xl flex items-center justify-center">{teacher.iniciales}</div>
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-ink font-bold text-lg md:text-xl leading-tight break-words">{teacher.nombreCompleto}</h2>
                    {/* Botón verde si activo, gris si inactivo */}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={requestToggleActive}
                      title={teacher.active ? 'Docente activo (clic para desactivar)' : 'Docente inactivo (clic para activar)'}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer border shadow-xs ${
                        teacher.active
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600'
                          : 'bg-neutral hover:bg-neutral/80 text-muted border-line'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${teacher.active ? 'bg-white' : 'bg-muted'}`} />
                      {teacher.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                  <p className="text-accent text-xs font-bold mt-0.5 break-words">{teacher.specialty ? `Docente de ${teacher.specialty}` : 'Sin especialidad registrada'}</p>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h2 className="text-ink font-bold text-sm flex items-center gap-2"><BookOpen01Icon size={16} aria-hidden="true" className="text-accent" />Asignación de cursos, grado y sección</h2>
                </div>
                {result?.assignmentsLoading || sectionsLoading ? <p role="status" className="text-sm text-muted p-4 border border-line bg-neutral/30 rounded-xl flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="shrink-0" />{result?.assignmentsLoading ? 'Actualizando asignaciones...' : 'Cargando asignaciones...'}</p> :
                  result?.assignmentsError ? <div role="alert" className="text-sm text-rose-700 p-4 rounded-xl border border-rose-200 bg-rose-50 break-words">
                    <p>No se pudieron actualizar las asignaciones. {result.assignmentsError}</p>
                    <button onClick={() => setRevision(n => n + 1)} className="font-bold mt-3 min-h-10 px-3 py-2 rounded-lg bg-white border border-line hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
                  </div> :
                    assignmentRows.length === 0 ? <div className="p-6 border border-dashed border-line rounded-xl bg-neutral/30 text-center flex flex-col items-center gap-2"><BookOpen01Icon size={24} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold text-ink">Sin asignaciones registradas.</p><p className="text-xs text-muted">No hay asignaciones actuales ni históricas para mostrar.</p></div> :
                      <>
                        {sectionsFailed && <div role="alert" className="text-sm text-rose-700 p-3 rounded-xl border border-rose-200 bg-rose-50 break-words">
                          <p>No se pudieron cargar los grados y secciones. Las asignaciones se muestran sin ese dato.</p>
                          <button onClick={() => setSectionsRevision(n => n + 1)} className="font-bold mt-2 min-h-10 px-3 py-2 rounded-lg bg-white border border-line hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
                        </div>}
                        <ul className="flex flex-col gap-2">
                          {assignmentRows.map(row => <li key={row.id} className="p-3 rounded-xl bg-neutral/40 border border-line hover:bg-neutral/80 transition-colors flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
                            <span title={row.curso} className="text-ink font-bold text-xs sm:w-36 min-w-0 truncate">{row.curso}</span>
                            {row.nivelGrado ? <span title={row.nivelGrado} className="text-muted text-xs font-semibold sm:w-28 min-w-0 truncate">{row.nivelGrado}</span> : <span aria-hidden="true" className="hidden sm:block sm:w-28" />}
                            <span title={row.seccion} className="text-muted text-xs font-semibold min-w-0 truncate">{row.seccion}</span>
                            <span className="flex items-center gap-2 sm:ml-auto shrink-0">
                              {row.asignadoElIso ? <time dateTime={row.asignadoElIso} className="text-muted text-xs">{row.asignadoEl}</time> : <span className="text-muted text-xs">{row.asignadoEl}</span>}
                              <span className={`font-bold text-[10px] border rounded-full px-2 py-1 ${row.activa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral text-muted border-line'}`}>{row.estadoLabel}</span>
                            </span>
                          </li>)}
                        </ul>
                      </>}
              </section>
            </div>

            <div className="lg:col-span-5 min-w-0">
              <section className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h2 className="text-ink font-bold text-sm">Cuenta de acceso</h2>
                </div>
                <p className="text-sm text-ink break-words">
                  {account === null ? 'El docente no tiene cuenta de acceso.' : <>
                    Cuenta de acceso: <strong>{account.email}</strong>{' · '}
                    <span className={`font-bold ${account.active ? 'text-emerald-700' : 'text-muted'}`}>{account.active ? 'Cuenta activa' : 'Cuenta deshabilitada'}</span>
                  </>}
                </p>
                <div className="border-t border-line pt-4 mt-2">
                  <h2 className="text-ink font-bold text-sm mb-3 border-b border-line pb-2">Datos personales</h2>
                  {!editing ? (
                    <dl className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Info label="DNI" value={teacher.dni} />
                        <Info label="Nombres" value={teacher.firstNames} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Info label="Apellido paterno" value={teacher.paternalLastName} />
                        <Info label="Apellido materno" value={teacher.maternalLastName} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Info label="Teléfono" value={teacher.phone} />
                        <Info label="Especialidad" value={teacher.specialty} />
                      </div>
                      <Info label="Estado" value={teacher.estadoLabel} />
                    </dl>
                  ) : (
                    <form className="flex flex-col gap-4" onSubmit={handleSaveInline}>
                      <div className="flex items-center justify-between pb-2 border-b border-line">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                          <PencilEdit01Icon size={14} aria-hidden="true" />
                          Edición en panel
                        </h3>
                        <span className="text-[11px] text-muted font-medium">Modifica los campos requeridos</span>
                      </div>

                      {editError && (
                        <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2 break-words">
                          <AlertCircleIcon size={16} aria-hidden="true" className="shrink-0" />
                          {editError}
                        </p>
                      )}

                      <fieldset disabled={busy} className="flex flex-col gap-3.5 disabled:opacity-70">
                        {/* Fila 1: DNI y Nombres en 2 columnas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* DNI con indicador ✓ o ✕ en el lado derecho */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                              DNI <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative mt-1.5">
                              <input
                                required
                                maxLength={12}
                                value={editValues.dni}
                                onChange={e => setEditValues(prev => ({ ...prev, dni: e.target.value }))}
                                className={`w-full pl-3 pr-9 py-2 text-xs font-medium rounded-lg border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                  isModified('dni')
                                    ? 'border-blue-500 bg-blue-50/40 text-blue-900 focus-visible:outline-blue-600 ring-1 ring-blue-500/20'
                                    : 'border-line bg-neutral/50 text-ink focus-visible:outline-accent'
                                }`}
                                placeholder="Ej. 12345678"
                              />
                              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                {editValues.dni.trim().length === 8 ? (
                                  <Check size={16} className="text-emerald-600 stroke-[2.5]" aria-hidden="true" />
                                ) : (
                                  <X size={16} className="text-rose-500 stroke-[2.5]" aria-hidden="true" />
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] mt-1 font-medium px-0.5">
                              <span className={editValues.dni.trim().length === 8 ? 'text-emerald-700 font-bold' : 'text-muted'}>
                                {editValues.dni.trim().length}/8
                              </span>
                            </div>
                          </div>

                          {/* Nombres */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                              Nombres <span className="text-rose-500">*</span>
                            </label>
                            <input
                              required
                              maxLength={120}
                              value={editValues.firstNames}
                              onChange={e => setEditValues(prev => ({ ...prev, firstNames: e.target.value }))}
                              className={`w-full mt-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                isModified('firstNames')
                                  ? 'border-blue-500 bg-blue-50/40 text-blue-900 focus-visible:outline-blue-600 ring-1 ring-blue-500/20'
                                  : 'border-line bg-neutral/50 text-ink focus-visible:outline-accent'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Fila 2: Apellidos en 2 columnas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Apellido paterno */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                              Apellido paterno <span className="text-rose-500">*</span>
                            </label>
                            <input
                              required
                              maxLength={120}
                              value={editValues.paternalLastName}
                              onChange={e => setEditValues(prev => ({ ...prev, paternalLastName: e.target.value }))}
                              className={`w-full mt-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                isModified('paternalLastName')
                                  ? 'border-blue-500 bg-blue-50/40 text-blue-900 focus-visible:outline-blue-600 ring-1 ring-blue-500/20'
                                  : 'border-line bg-neutral/50 text-ink focus-visible:outline-accent'
                              }`}
                            />
                          </div>

                          {/* Apellido materno */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                              Apellido materno
                            </label>
                            <input
                              maxLength={120}
                              value={editValues.maternalLastName}
                              onChange={e => setEditValues(prev => ({ ...prev, maternalLastName: e.target.value }))}
                              className={`w-full mt-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                isModified('maternalLastName')
                                  ? 'border-blue-500 bg-blue-50/40 text-blue-900 focus-visible:outline-blue-600 ring-1 ring-blue-500/20'
                                  : 'border-line bg-neutral/50 text-ink focus-visible:outline-accent'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Fila 3: Teléfono y Especialidad en 2 columnas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Teléfono con indicador ✓ o ✕ en el lado derecho */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                              Teléfono
                            </label>
                            <div className="relative mt-1.5">
                              <input
                                maxLength={30}
                                value={editValues.phone}
                                onChange={e => setEditValues(prev => ({ ...prev, phone: e.target.value }))}
                                className={`w-full pl-3 pr-9 py-2 text-xs font-medium rounded-lg border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                  isModified('phone')
                                    ? 'border-blue-500 bg-blue-50/40 text-blue-900 focus-visible:outline-blue-600 ring-1 ring-blue-500/20'
                                    : 'border-line bg-neutral/50 text-ink focus-visible:outline-accent'
                                }`}
                                placeholder="Ej. 987654321"
                              />
                              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                {editValues.phone.trim().length === 9 ? (
                                  <Check size={16} className="text-emerald-600 stroke-[2.5]" aria-hidden="true" />
                                ) : (
                                  <X size={16} className="text-rose-500 stroke-[2.5]" aria-hidden="true" />
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] mt-1 font-medium px-0.5">
                              <span className={editValues.phone.trim().length === 9 ? 'text-emerald-700 font-bold' : 'text-muted'}>
                                {editValues.phone.trim().length}/9
                              </span>
                            </div>
                          </div>

                          {/* Especialidad */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                              Especialidad
                            </label>
                            <input
                              maxLength={100}
                              value={editValues.specialty}
                              onChange={e => setEditValues(prev => ({ ...prev, specialty: e.target.value }))}
                              className={`w-full mt-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                isModified('specialty')
                                  ? 'border-blue-500 bg-blue-50/40 text-blue-900 focus-visible:outline-blue-600 ring-1 ring-blue-500/20'
                                  : 'border-line bg-neutral/50 text-ink focus-visible:outline-accent'
                              }`}
                            />
                          </div>
                        </div>
                      </fieldset>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={cancelEditing}
                          className="px-3.5 py-2 min-h-9 rounded-xl bg-white border border-line text-ink text-xs font-bold hover:bg-neutral disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={busy}
                          className="px-4 py-2 min-h-9 rounded-xl bg-accent text-white text-xs font-bold shadow-sm hover:bg-accent/90 disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {busy ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </section>
            </div>
          </div>

          {accountOpen && canCreateAccountAction && (
            <TeacherAccountModal
              teacherId={teacher.id}
              onCancel={() => setAccountOpen(false)}
              onCreated={handleAccountCreated}
            />
          )}
          {accountStateAction && canChangeAccountState && account && <AccountStateDialog
            action={accountStateAction} name={teacher.nombreCompleto} email={account.email} busy={busy} error={accountStateError}
            onCancel={() => { if (!busy) setAccountStateAction(null); }}
            onConfirm={request => void changeAccountState(request)}
          />}
          {confirmingDeactivate && <DeactivateTeacherDialog
            message="Al desactivar al docente también se desactivarán sus asignaciones activas. Su cuenta de acceso no se modifica. ¿Deseas continuar?"
            onCancel={() => setConfirmingDeactivate(false)}
            onConfirm={() => { setConfirmingDeactivate(false); void toggleActive(); }}
          />}
        </>}
      </div>
    </div>
  );
}

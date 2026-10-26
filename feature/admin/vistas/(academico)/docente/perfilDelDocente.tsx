'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, PencilEdit01Icon, BookOpen01Icon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { Check } from 'lucide-react';
import { teachersService, teacherErrorMessage, teacherErrorStatus } from '@/services/admin/teachersService';
import { toAdminTeacher, toAdminTeacherDetail, toUpdateTeacher } from '@/adapters/teacherAdapter';
import type { AdminTeacherDetail, TeacherFormValues } from '@/types/adminTeacher';
import type { TeacherAccountResponse } from '@/types/teacherApi';
import { AuthContext } from '@/contexts/AuthContext';
import TeacherAccountModal from './TeacherAccountModal';

type DetailResult = {
  revision: number;
  teacher?: AdminTeacherDetail;
  error?: string;
  notFound?: boolean;
  assignmentsLoading?: boolean;
  assignmentsError?: string;
};

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
  // Session-only: the backend does not expose existing accounts yet (BACK #66).
  const [account, setAccount] = useState<TeacherAccountResponse | null>(null);
  const mutationRef = useRef(false);
  const auth = useContext(AuthContext);
  const canManageAccount = auth?.role === 'ADMINISTRADOR' && auth.status === 'authenticated' && auth.sessionValid;
  const loading = result?.revision !== revision;
  const teacher = loading ? undefined : result?.teacher;
  const accountBlocked = !!teacher && (!teacher.active || !teacher.dni?.trim());

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

  function startEditing() {
    if (!teacher) return;
    setNotice('');
    setActionError('');
    setEditError('');
    setEditValues({
      dni: teacher.dni || '',
      firstNames: teacher.firstNames || '',
      paternalLastName: teacher.paternalLastName || '',
      maternalLastName: teacher.maternalLastName || '',
      phone: teacher.phone || '',
      specialty: teacher.specialty || '',
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditError('');
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
        teacher: { ...toAdminTeacher(updated), assignments: teacher.assignments },
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
              {!editing ? (
                <button disabled={busy} onClick={startEditing} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"><PencilEdit01Icon size={16} aria-hidden="true" />Editar docente</button>
              ) : (
                <button type="button" disabled={busy} onClick={cancelEditing} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">Cancelar edición</button>
              )}
              <button disabled={busy} onClick={toggleActive} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{busy ? 'Guardando...' : teacher.active ? 'Desactivar docente' : 'Reactivar docente'}</button>
              {canManageAccount && !account && <button disabled={busy || accountBlocked} onClick={() => { setNotice(''); setActionError(''); setAccountOpen(true); }} className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">Crear cuenta de acceso</button>}
            </div>
          </header>
          {canManageAccount && !account && accountBlocked && <p className="text-xs text-muted">Para crear la cuenta de acceso, el docente debe estar activo y tener DNI registrado.</p>}
          {account && <p className="p-3 rounded-xl border border-line bg-neutral/40 text-sm text-ink break-words">El docente ya tiene cuenta de acceso: <strong>{account.email}</strong></p>}
          {notice && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">{notice}</p>}
          {actionError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm break-words">{actionError} Puedes volver a intentar la acción.</p>}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-5 min-w-0 bg-white border border-line rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-line">
                <span className="w-14 h-14 rounded-full border border-accent/20 bg-accent-soft text-accent flex items-center justify-center font-bold shrink-0 text-base">{teacher.iniciales}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold tracking-tight text-ink break-words">{teacher.nombreCompleto}</h2>
                    {/* Botón verde si activo, gris si inactivo */}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={toggleActive}
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
                  <p className="text-xs text-muted mt-1">{teacher.specialty || 'Sin especialidad registrada'}</p>
                </div>
              </div>

              {!editing ? (
                /* Modo lectura */
                <dl className="flex flex-col gap-3">
                  <Info label="DNI" value={teacher.dni} />
                  <Info label="Nombres" value={teacher.firstNames} />
                  <Info label="Apellido paterno" value={teacher.paternalLastName} />
                  <Info label="Apellido materno" value={teacher.maternalLastName} />
                  <Info label="Teléfono" value={teacher.phone} />
                  <Info label="Especialidad" value={teacher.specialty} />
                  <Info label="Estado" value={teacher.estadoLabel} />
                </dl>
              ) : (
                /* Modo edición en el mismo panel (sin formulario emergente) */
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

                  <fieldset disabled={busy} className="flex flex-col gap-3 disabled:opacity-70">
                    {/* DNI con contador X/8 y check de validación */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                        DNI <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        maxLength={12}
                        value={editValues.dni}
                        onChange={e => setEditValues(prev => ({ ...prev, dni: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 text-xs font-medium text-ink bg-neutral/50 border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        placeholder="Ej. 12345678"
                      />
                      <div className="flex items-center justify-between text-[11px] mt-1 font-medium px-0.5">
                        <span className={editValues.dni.trim().length === 8 ? 'text-emerald-700 font-bold' : 'text-muted'}>
                          {editValues.dni.trim().length}/8 caracteres
                        </span>
                        {editValues.dni.trim().length === 8 && (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            <Check size={12} className="stroke-[3]" /> Requisito cumplido
                          </span>
                        )}
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
                        className="w-full mt-1 px-3 py-2 text-xs font-medium text-ink bg-neutral/50 border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      />
                    </div>

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
                        className="w-full mt-1 px-3 py-2 text-xs font-medium text-ink bg-neutral/50 border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                        className="w-full mt-1 px-3 py-2 text-xs font-medium text-ink bg-neutral/50 border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      />
                    </div>

                    {/* Teléfono con contador X/9 y check de validación */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                        Teléfono
                      </label>
                      <input
                        maxLength={30}
                        value={editValues.phone}
                        onChange={e => setEditValues(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 text-xs font-medium text-ink bg-neutral/50 border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        placeholder="Ej. 987654321"
                      />
                      <div className="flex items-center justify-between text-[11px] mt-1 font-medium px-0.5">
                        <span className={editValues.phone.trim().length === 9 ? 'text-emerald-700 font-bold' : 'text-muted'}>
                          {editValues.phone.trim().length}/9 caracteres
                        </span>
                        {editValues.phone.trim().length === 9 && (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            <Check size={12} className="stroke-[3]" /> Requisito cumplido
                          </span>
                        )}
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
                        className="w-full mt-1 px-3 py-2 text-xs font-medium text-ink bg-neutral/50 border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      />
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

          {accountOpen && canManageAccount && (
            <TeacherAccountModal
              teacherId={teacher.id}
              onCancel={() => setAccountOpen(false)}
              onCreated={created => {
                setAccount(created);
                setAccountOpen(false);
                setNotice(created.created
                  ? `Cuenta de acceso creada para ${created.email}. La contraseña inicial es el DNI del docente; pídele que la cambie.`
                  : `El docente ya tenía una cuenta con ${created.email}. No se modificó su contraseña.`);
              }}
            />
          )}
        </>}
      </div>
    </div>
  );
}

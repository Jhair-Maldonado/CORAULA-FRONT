'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatIsoDate } from '@/lib/gradeWindowContract';
import { limaToday } from '@/services/admin/dailyAttendanceService';
import {
  extensionDeadlineError, gradeWindowActionErrorMessage, gradeWindowActionStatuses, gradeWindowReadErrorMessage, gradeWindowReasonError,
  gradeWindowService, maxGradeWindowReasonLength, minExtensionDate, registrationDateError, type GradeWindowAction,
} from '@/services/admin/gradeWindowService';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';
import type { GradeWindow } from '@/types/gradeWindowApi';
import { SectionDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, Failure } from '../secciones/sectionUi';

type Read = { revision: number; data?: GradeWindow; error?: string };
type Pending = { action: GradeWindowAction; view: GradeWindow };

const confirmations: Record<GradeWindowAction, { title: string; label: string; success: (name: string, date: string) => string; reached: (view: GradeWindow, date: string) => boolean }> = {
  registrationDate: {
    title: 'Fijar la fecha de registro', label: 'Fijar fecha de registro',
    success: (name, date) => `La fecha de registro de ${name} es el ${formatIsoDate(date)}. Confirmada mediante recarga.`,
    reached: (v, date) => v.registrationDateConfigured && v.registrationDate === date,
  },
  extension: {
    title: 'Ampliar el plazo de registro', label: 'Ampliar plazo',
    success: (name, date) => `El plazo de ${name} se amplió hasta el ${formatIsoDate(date)} inclusive. Confirmado mediante recarga.`,
    reached: (v, date) => v.extendedDeadline === date && v.deadline === date,
  },
};
const actions: GradeWindowAction[] = ['registrationDate', 'extension'];

// #39 registration date and extension of the teachers' MANUAL grade window. ADMINISTRADOR acts; DIRECTIVO reads.
export default function BimesterGradeWindowPanel({ bimester, canManage, locked, onClose, onChanged, onBusyChange, today = limaToday }: {
  bimester: Bimester; canManage: boolean; locked: boolean;
  onClose: () => void; onChanged: () => void; onBusyChange: (busy: boolean) => void;
  /** Calendar day in America/Lima; injectable for tests. */
  today?: () => string;
}) {
  const [revision, setRevision] = useState(0);
  const [read, setRead] = useState<Read>();
  const [dialog, setDialog] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false), mounted = useRef(true);
  // The dialog that may still be confirmed: cleared by cancel, refresh and the action itself.
  const pendingDialog = useRef<Pending | null>(null);
  const loading = read?.revision !== revision;
  const data = loading ? undefined : read?.data;
  const inactive = busy || locked || loading || !data || refreshRequired;
  const offered = (action: GradeWindowAction) => canManage && gradeWindowActionStatuses[action].includes(bimester.status);
  const allowed = (action: GradeWindowAction) => offered(action) && !inactive;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const abort = new AbortController();
    gradeWindowService.get(bimester.id, abort.signal)
      .then(view => { if (!abort.signal.aborted) setRead({ revision, data: view }); })
      .catch(failure => { if (!abort.signal.aborted) setRead({ revision, error: gradeWindowReadErrorMessage(failure) }); });
    return () => abort.abort();
  }, [bimester.id, revision]);

  function closeDialog() { if (!lock.current) { pendingDialog.current = null; setDialog(null); } }
  function refresh() {
    if (lock.current) return;
    pendingDialog.current = null; setDialog(null); setError(''); setNotice(''); setRefreshRequired(false); setRevision(n => n + 1);
  }
  function open(action: GradeWindowAction) {
    if (lock.current || !data || !allowed(action)) return;
    const next = { action, view: data };
    pendingDialog.current = next; setDialog(next); setError(''); setNotice('');
  }
  async function run(action: GradeWindowAction, date: string, reason: string) {
    // Only the view shown when the dialog opened may be acted upon; a reload or cancel invalidates it.
    const target = pendingDialog.current;
    if (lock.current || !canManage || locked || !target || target.action !== action) return;
    lock.current = true; pendingDialog.current = null; setDialog(null); setBusy(true); onBusyChange(true); setError(''); setNotice(''); setRefreshRequired(true);
    let accepted = false, failure = '';
    try {
      try {
        await (action === 'registrationDate' ? gradeWindowService.setRegistrationDate(bimester.id, date, reason) : gradeWindowService.extend(bimester.id, date, reason));
        accepted = true;
      } catch (cause) { failure = gradeWindowActionErrorMessage(cause, action); }
      // Any outcome, even an ambiguous one, is followed by reads; nothing is retried.
      onChanged();
      try {
        const view = await gradeWindowService.get(bimester.id);
        if (!mounted.current) return;
        setRead({ revision, data: view });
        const reached = confirmations[action].reached(view, date);
        setRefreshRequired(accepted && !reached);
        if (accepted && reached) setNotice(confirmations[action].success(bimester.name, date));
        else setError(failure || 'El servidor aceptó la operación, pero la recarga no la confirmó. Actualiza el panel.');
      } catch {
        if (mounted.current) setError(`${failure || 'El servidor aceptó la operación.'} No se pudo recargar el panel; actualízalo antes de continuar.`);
      }
    } finally { lock.current = false; onBusyChange(false); if (mounted.current) setBusy(false); }
  }

  return <section aria-labelledby="grade-window-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-6 shadow-sm flex flex-col gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="grade-window-title" className="text-base font-bold text-ink">Plazo de notas · {bimester.name}</h2>
        <p className="text-xs text-muted mt-1">{canManage ? 'Fecha de registro y plazo de los docentes para sus notas MANUAL, en hora de Lima.' : 'Acceso DIRECTIVO: solo lectura.'}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy || loading} onClick={refresh}>Actualizar panel</button>
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => { if (!lock.current) onClose(); }}>Cerrar panel</button>
      </div>
    </div>
    {loading ? <p role="status" className="text-xs text-muted">Consultando el plazo de registro...</p>
      : read?.error ? <Failure message={read.error} retry={refresh} />
      : data && <>
        <GradeWindowSummary view={data} status={bimester.status} />
        {actions.some(offered) && <div className="flex flex-wrap gap-2">
          {actions.filter(offered).map(action => <button key={action} type="button" className={action === 'registrationDate' ? secondaryButtonClass : primaryButtonClass}
            disabled={!allowed(action)} onClick={() => open(action)}>{confirmations[action].label}</button>)}
        </div>}
      </>}
    {busy && <p role="status" className="text-xs text-muted">Procesando y consultando el plazo de registro...</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {refreshRequired && !busy && <p role="alert" className="text-xs text-rose-700">Actualiza el panel antes de otra operación.</p>}
    {dialog?.action === 'registrationDate' && <RegistrationDateDialog name={bimester.name} startDate={bimester.startDate} view={dialog.view} onCancel={closeDialog}
      onConfirm={(date, reason) => { void run('registrationDate', date, reason); }} />}
    {dialog?.action === 'extension' && <ExtensionDialog name={bimester.name} view={dialog.view} today={today} onCancel={closeDialog}
      onConfirm={(date, reason) => { void run('extension', date, reason); }} />}
  </section>;
}

function DateText({ date }: { date: string }) { return <time dateTime={date}>{formatIsoDate(date)}</time>; }
function Item({ term, children }: { term: string; children: ReactNode }) {
  return <div className="p-3 rounded-xl border border-line bg-neutral/30"><dt className="font-bold text-muted">{term}</dt><dd className="mt-1 text-ink">{children}</dd></div>;
}

function GradeWindowSummary({ view, status }: { view: GradeWindow; status: Bimester['status'] }) {
  const note = status === 'ABIERTO'
    ? view.expired
      ? 'El plazo venció: los docentes ya no pueden registrar ni editar sus notas MANUAL. Solo una ampliación lo habilita de nuevo.'
      : 'Los docentes registran y editan sus notas MANUAL hasta el plazo vigente: la fecha de registro más 7 días, o la ampliación si es posterior.'
    : status === 'PLANIFICADO' ? 'El plazo rige cuando el bimestre se abra.' : 'El plazo solo rige con el bimestre Abierto.';
  return <div className="flex flex-col gap-3 text-xs">
    <p><span className="font-bold">Estado del bimestre:</span> {bimesterStatusLabels[status]}</p>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Item term="Fecha de registro"><DateText date={view.registrationDate} /> · {view.registrationDateConfigured ? 'configurada' : 'por defecto: fin del bimestre'}</Item>
      <Item term="Ampliación">{view.extendedDeadline !== null ? <>Hasta el <DateText date={view.extendedDeadline} /> inclusive</> : 'Sin ampliación'}</Item>
      <Item term="Plazo vigente">Hasta el <DateText date={view.deadline} /> inclusive (hora de Lima)</Item>
      <Item term="Estado del plazo">{view.expired ? <strong className="text-rose-700">Vencido</strong> : <strong className="text-emerald-700">Vigente</strong>}</Item>
    </dl>
    <p role="note" className={`p-3 rounded-xl border ${status === 'ABIERTO' && view.expired ? 'bg-amber-50 border-amber-200 text-amber-800' : 'border-line text-muted'}`}>{note}</p>
  </div>;
}

function ReasonField({ id, label, reason, onChange }: { id: string; label: string; reason: string; onChange: (value: string) => void }) {
  return <>
    <label className={labelClass}>{label}<textarea aria-label={label} aria-describedby={`${id}-help`} required rows={3} maxLength={maxGradeWindowReasonLength} value={reason}
      className={`${inputClass} normal-case tracking-normal`} onChange={event => onChange(event.target.value)} /></label>
    <p id={`${id}-help`} className="text-xs text-muted">Obligatorio; máximo {maxGradeWindowReasonLength} caracteres ({reason.trim().length}/{maxGradeWindowReasonLength}). Queda en auditoría.</p>
  </>;
}

function RegistrationDateDialog({ name, startDate, view, onCancel, onConfirm }: { name: string; startDate: string; view: GradeWindow; onCancel: () => void; onConfirm: (date: string, reason: string) => void }) {
  const [date, setDate] = useState(view.registrationDate);
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  return <SectionDialog title={confirmations.registrationDate.title} busy={false} onClose={onCancel}>
    <form aria-label="Fecha de registro de notas" noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      const invalid = registrationDateError(date, startDate, view) ?? gradeWindowReasonError(reason);
      if (invalid) { setValidation(invalid); return; }
      onConfirm(date, reason.trim());
    }}>
      <p className="text-sm">Fecha de registro de <strong>{name}</strong>. Vigente: <DateText date={view.registrationDate} /> ({view.registrationDateConfigured ? 'configurada' : 'por defecto: fin del bimestre'}).</p>
      <p className="text-xs text-muted">Los docentes podrán registrar y editar sus notas MANUAL hasta 7 días después de esta fecha, inclusive, en hora de Lima. La ampliación vigente se conserva.</p>
      <label className={labelClass}>Fecha de registro<input aria-label="Fecha de registro" type="date" required min={startDate} value={date}
        className={inputClass} onChange={event => { setDate(event.target.value); setValidation(''); }} /></label>
      <ReasonField id="registration-date-reason" label="Motivo de la fecha de registro" reason={reason} onChange={value => { setReason(value); setValidation(''); }} />
      {validation && <Failure message={validation} />}
      <div className="flex justify-end gap-2"><button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={primaryButtonClass}>Confirmar fecha de registro</button></div>
    </form>
  </SectionDialog>;
}

function ExtensionDialog({ name, view, today, onCancel, onConfirm }: { name: string; view: GradeWindow; today: () => string; onCancel: () => void; onConfirm: (date: string, reason: string) => void }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  return <SectionDialog title={confirmations.extension.title} busy={false} onClose={onCancel}>
    <form aria-label="Ampliación del plazo de registro" noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      const invalid = extensionDeadlineError(date, view, today()) ?? gradeWindowReasonError(reason);
      if (invalid) { setValidation(invalid); return; }
      onConfirm(date, reason.trim());
    }}>
      <p className="text-sm">Ampliar el plazo de <strong>{name}</strong>. Plazo vigente: hasta el <DateText date={view.deadline} /> inclusive{view.expired ? ' (vencido)' : ''}.</p>
      <p className="text-xs text-muted">La nueva fecha límite debe ser posterior al plazo vigente y no anterior a hoy, en hora de Lima. La fecha de registro no cambia.</p>
      <label className={labelClass}>Nueva fecha límite<input aria-label="Nueva fecha límite" type="date" required min={minExtensionDate(view, today())} value={date}
        className={inputClass} onChange={event => { setDate(event.target.value); setValidation(''); }} /></label>
      <ReasonField id="extension-reason" label="Motivo de la ampliación" reason={reason} onChange={value => { setReason(value); setValidation(''); }} />
      {validation && <Failure message={validation} />}
      <div className="flex justify-end gap-2"><button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={primaryButtonClass}>Confirmar ampliación</button></div>
    </form>
  </SectionDialog>;
}

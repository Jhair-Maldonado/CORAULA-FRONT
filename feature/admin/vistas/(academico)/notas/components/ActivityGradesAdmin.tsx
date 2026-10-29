'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminActivityGradesService, adminActivityCorrectionErrorMessage, adminActivityReadErrorMessage, isUncertainActivityCorrection,
} from '@/services/admin/adminActivityGradesService';
import { correctableBimesterStatuses, correctionError, maxCorrectionReasonLength } from '@/services/admin/adminGradesService';
import { academicActivityStatusLabels, type ActivityContext } from '@/types/teacherActivitiesApi';
import type { ManagementActivityGradesRow, ManagementActivityGradesSheet } from '@/types/managementActivitiesApi';
import ScheduleDialog from '../../../(administrativo)/horario/components/ScheduleDialog';
import { publishedAtLabel } from '@/components/evaluation/ResultadosBimestre';
import { button, input, useRead, Failure } from './notesShared';

type Shared = {
  canCorrect: boolean;
  /** Another grade flow (MANUAL correction) is running: no activity correction may start. */
  locked: boolean;
  /** Publication mark of the bimester, when known (CERRADO only). */
  publishedAt?: string | null;
  isCurrent: () => boolean;
  onBusyChange: (busy: boolean) => void;
  /** An accepted (or possibly applied) correction: the #45 results and the PA must be read again. */
  onGradeChanged: () => void;
};

// BACK #102 reads (ADMINISTRADOR and DIRECTIVO) and the #50 Director correction (ADMINISTRADOR only).
export default function ActivityGradesAdmin({ context, ...shared }: Shared & { context: ActivityContext }) {
  const { sectionCourseId, bimesterId } = context;
  const load = useCallback(() => adminActivityGradesService.listActivities({ sectionCourseId, bimesterId }), [sectionCourseId, bimesterId]);
  const activities = useRead(load, adminActivityReadErrorMessage);
  const [activityId, setActivityId] = useState('');
  const generation = useRef(0), [epoch, setEpoch] = useState(0);
  const activity = activities.data?.find(a => String(a.id) === activityId);
  return <section aria-labelledby="activity-grades-title" className="flex flex-col gap-4 border-t border-line pt-4">
    <div><h3 id="activity-grades-title" className="font-bold">Notas de actividades</h3>
      <p className="text-xs text-muted mt-1">{shared.canCorrect ? 'El Director corrige notas de actividades publicadas con el bimestre EN_REVISION o CERRADO, con motivo.' : 'Acceso DIRECTIVO: solo lectura.'} El PA se refleja en los resultados del bimestre.</p></div>
    {activities.loading ? <p role="status">Cargando actividades...</p> : activities.error ? <Failure message={activities.error} retry={activities.refresh} />
      : !activities.data?.length ? <p className="text-xs text-muted">No hay actividades en este curso y bimestre.</p>
      : <label className="block max-w-md text-xs font-bold text-muted">Actividad<select aria-label="Actividad" className={input} value={activityId} disabled={shared.locked}
        onChange={e => { setEpoch(++generation.current); setActivityId(e.target.value); }}><option value="">Selecciona una actividad</option>
        {activities.data.map(a => <option key={a.id} value={a.id}>{a.title} · {academicActivityStatusLabels[a.status]}{a.cuentaParaPa ? '' : ' · no cuenta para PA'}</option>)}</select></label>}
    {activity && <ActivitySheet key={`${activity.id}:${epoch}`} context={context} activityId={activity.id} {...shared}
      isCurrent={() => shared.isCurrent() && generation.current === epoch} />}
  </section>;
}

type Target = { gradeId: number; grade: number; version: number; enrollmentId: number; student: string };

function ActivitySheet({ context, activityId, canCorrect, locked, publishedAt, isCurrent, onBusyChange, onGradeChanged }: Shared & { context: ActivityContext; activityId: number }) {
  const { sectionCourseId, bimesterId } = context;
  const load = useCallback(() => adminActivityGradesService.getSheet({ sectionCourseId, bimesterId }, activityId), [sectionCourseId, bimesterId, activityId]);
  const sheet = useRead(load, adminActivityReadErrorMessage);
  const [target, setTarget] = useState<Target | null>(null), targetRef = useRef<Target | null>(null);
  const [newGrade, setNewGrade] = useState(''), [reason, setReason] = useState('');
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), lock = useRef(false), mounted = useRef(true);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const data = sheet.data;
  const disabled = busy || locked || sheet.loading || !!sheet.error || refreshRequired;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function close() { if (!lock.current) { targetRef.current = null; setTarget(null); } }
  function refresh() { if (!lock.current) { close(); setHistoryId(null); setNotice(''); setError(''); setRefreshRequired(false); sheet.refresh(); } }
  const windowOpen = (s: ManagementActivityGradesSheet | undefined) => !!s && correctableBimesterStatuses.includes(s.bimester.status) && s.activity.status === 'PUBLICADA';
  // A row without gradeId/version is never correctable; the target must still match the latest read.
  function eligible(t: Target, s = data) {
    const row = s?.students.find(r => r.enrollmentId === t.enrollmentId);
    return canCorrect && windowOpen(s) && row?.gradeId === t.gradeId && row.version === t.version && row.grade === t.grade;
  }
  async function submit() {
    if (!mounted.current || !isCurrent() || lock.current || disabled || !target || targetRef.current !== target || !eligible(target) || correctionError(newGrade, reason, target.grade)) return;
    const original = target, proposed = Number(newGrade);
    lock.current = true; setBusy(true); onBusyChange(true); targetRef.current = null; setTarget(null); setHistoryId(null); setError(''); setNotice(''); setRefreshRequired(true);
    let accepted = false, uncertain = false, changed = false, failure = '';
    try {
      try {
        await adminActivityGradesService.correctGrade(original.gradeId, activityId, { enrollmentId: original.enrollmentId, grade: proposed, expectedVersion: original.version, reason });
        accepted = true;
      } catch (cause) { failure = adminActivityCorrectionErrorMessage(cause); uncertain = isUncertainActivityCorrection(cause); }
      try {
        const reloaded = await load();
        if (!mounted.current || !isCurrent()) return;
        sheet.publish(reloaded);
        const row = reloaded.students.find(r => r.enrollmentId === original.enrollmentId);
        const confirmed = row?.gradeId === original.gradeId && row.grade === proposed && (row.version ?? 0) > original.version;
        // A different version means the grade (and so the PA) changed, even after an uncertain answer.
        changed = accepted || row?.version !== original.version;
        setRefreshRequired(accepted && !confirmed);
        if (accepted && confirmed) setNotice('Corrección confirmada en la planilla recargada. Se actualizaron los resultados del bimestre.');
        else setError(failure || 'El servidor aceptó la corrección, pero la nueva nota no se corroboró en la recarga. Actualiza la planilla.');
      } catch {
        changed = accepted || uncertain;
        if (mounted.current && isCurrent()) setError(`${failure || 'El servidor aceptó la corrección.'} No se pudo recargar la planilla; actualízala antes de continuar.`);
      }
    } finally {
      lock.current = false; onBusyChange(false);
      if (mounted.current) setBusy(false);
      if (changed && isCurrent()) onGradeChanged();
    }
  }

  const status = data?.bimester.status;
  const reasonError = target ? correctionError(newGrade, reason, target.grade) : null;
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-bold">{data ? `${data.activity.title} · ${academicActivityStatusLabels[data.activity.status]}${data.activity.cuentaParaPa ? ' · cuenta para PA' : ' · no cuenta para PA'}` : 'Planilla de la actividad'}</p>
      <button type="button" disabled={busy || sheet.loading} onClick={refresh} className={`${button} bg-white`}>Actualizar actividad</button>
    </div>
    {sheet.loading ? <p role="status">Cargando planilla de la actividad...</p> : sheet.error ? <Failure message={sheet.error} retry={refresh} /> : data && <>
      {data.activity.status === 'ANULADA' && <p className="text-xs text-muted">Actividad anulada: sus notas se conservan y no se corrigen.</p>}
      {data.activity.status === 'PLANIFICADA' && <p className="text-xs text-muted">Actividad planificada: aún no admite notas.</p>}
      {status === 'ABIERTO' ? <p role="note" className="text-xs text-muted">Mientras el bimestre está abierto, las notas de actividades las corrige el docente.</p>
        : !correctableBimesterStatuses.includes(data.bimester.status) && <p className="text-xs text-muted">Bimestre de solo lectura: las correcciones del Director requieren EN_REVISION o CERRADO.</p>}
      <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-neutral/40 text-muted"><tr>
        <th scope="col" className="p-3">Estudiante</th><th scope="col" className="p-3">Nota</th><th scope="col" className="p-3">Registró</th>{canCorrect && <th scope="col" className="p-3">Acciones</th>}</tr></thead>
        <tbody className="divide-y divide-line">{data.students.map(row => <ActivityRow key={row.enrollmentId} row={row} canCorrect={canCorrect} busy={busy}
          correctable={!!row.gradeId && eligible(toTarget(row)!)} disabled={disabled}
          onCorrect={() => { const t = toTarget(row); if (!t || lock.current || !isCurrent() || !eligible(t)) return; targetRef.current = t; setTarget(t); setNewGrade(''); setReason(''); setError(''); setNotice(''); }}
          onHistory={() => setHistoryId(row.gradeId)} />)}</tbody></table></div>
      {!data.students.length && <p className="text-sm text-muted">No hay matrículas activas en esta actividad.</p>}
    </>}
    {busy && <p role="status">Corrigiendo y consultando la planilla de la actividad...</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {refreshRequired && !busy && <p role="alert" className="text-xs text-rose-700">Actualiza la planilla de la actividad antes de otra corrección.</p>}
    {target && <ScheduleDialog title="Corregir nota de actividad" busy={busy} onClose={close}>
      <p className="text-sm">{target.student} · {data?.activity.title}</p><p className="text-sm mt-2">Nota actual: <strong>{target.grade}</strong> (versión {target.version})</p>
      {publishedAt && <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">Bimestre publicado el {publishedAtLabel(publishedAt)}: la corrección queda auditada e incrementa la revisión publicada.</p>}
      <form className="flex flex-col gap-4 mt-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <label className="text-xs font-bold">Nueva nota<input aria-label="Nueva nota de actividad" required inputMode="decimal" className={input} value={newGrade} onChange={e => setNewGrade(e.target.value)} /></label>
        <label className="text-xs font-bold">Motivo obligatorio<textarea aria-label="Motivo de la corrección de actividad" aria-describedby="activity-reason-help" required rows={3} maxLength={maxCorrectionReasonLength} className={input} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <p id="activity-reason-help" className="text-xs text-muted">Máximo {maxCorrectionReasonLength} caracteres ({reason.trim().length}/{maxCorrectionReasonLength}). Queda en el historial de la nota.</p>
        {reasonError && <p role="status" className="text-xs text-muted">{reasonError}</p>}
        <div className="flex gap-3"><button type="submit" disabled={disabled || !!reasonError} className={`${button} bg-accent text-white`}>Confirmar corrección</button><button type="button" className={`${button} bg-white`} onClick={close}>Cancelar</button></div>
      </form></ScheduleDialog>}
    {canCorrect && historyId !== null && <ActivityGradeHistory key={historyId} gradeId={historyId} close={() => setHistoryId(null)} />}
  </div>;
}

function toTarget(row: ManagementActivityGradesRow): Target | null {
  return row.gradeId !== null && row.grade !== null && row.version !== null ? { gradeId: row.gradeId, grade: row.grade, version: row.version, enrollmentId: row.enrollmentId, student: row.fullName } : null;
}

function ActivityRow({ row, canCorrect, correctable, busy, disabled, onCorrect, onHistory }: {
  row: ManagementActivityGradesRow; canCorrect: boolean; correctable: boolean; busy: boolean; disabled: boolean; onCorrect: () => void; onHistory: () => void;
}) {
  return <tr>
    <th scope="row" className="p-3">{row.fullName}{row.studentCode && <span className="block text-muted font-normal">{row.studentCode}</span>}</th>
    <td className="p-3">{row.grade ?? 'Sin nota'}</td>
    <td className="p-3 text-muted">{row.gradeId === null ? '—' : <>{row.registeredByTeacherName ?? `Docente #${row.registeredByTeacherId}`}{row.registeredAt && <> · <time dateTime={row.registeredAt}>{publishedAtLabel(row.registeredAt)}</time></>}</>}</td>
    {canCorrect && <td className="p-3">{row.gradeId !== null && <div className="flex flex-wrap gap-2">
      {correctable && <button type="button" disabled={disabled} className={`${button} bg-accent text-white`} onClick={onCorrect}>Corregir actividad {row.fullName}</button>}
      <button type="button" disabled={busy} className={`${button} bg-white`} onClick={onHistory}>Historial de actividad #{row.gradeId}</button>
    </div>}</td>}
  </tr>;
}

function ActivityGradeHistory({ gradeId, close }: { gradeId: number; close: () => void }) {
  const load = useCallback(() => adminActivityGradesService.getHistory(gradeId), [gradeId]);
  const history = useRead(load, adminActivityReadErrorMessage);
  return <ScheduleDialog title={`Historial de nota de actividad #${gradeId}`} onClose={close}>{history.loading ? <p role="status">Cargando historial...</p>
    : history.error ? <Failure message={history.error} retry={history.refresh} /> : !history.data?.length ? <p>No hay registros en el historial.</p>
    : <ol className="flex flex-col gap-3 text-xs">{history.data.map(h => <li key={h.id} className="p-3 rounded-xl border border-line">
      <p className="font-bold">{h.previousGrade === null ? `Registro inicial: ${h.newGrade}` : `${h.previousGrade} → ${h.newGrade}`} · versión {h.previousVersion} → {h.newVersion}</p>
      {h.reason && <p className="whitespace-pre-wrap break-words mt-2">{h.reason}</p>}
      <p className="text-muted mt-2">Usuario #{h.actorId} · <time dateTime={h.changedAt}>{publishedAtLabel(h.changedAt)}</time></p></li>)}</ol>}</ScheduleDialog>;
}

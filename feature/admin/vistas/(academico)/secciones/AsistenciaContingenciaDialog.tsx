'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import JustificacionAsistencia from '@/components/attendance/JustificacionAsistencia';
import SelectorEstadoAsistencia from '@/components/attendance/SelectorEstadoAsistencia';
import {
  ATTENDANCE_REASON_MAX_LENGTH,
  DEFAULT_CONTINGENCY_CAUSE,
  REASON_REQUIRED_MESSAGE,
  REASON_TOO_LONG_MESSAGE,
  hasAttendanceChanges,
  isFirstCapture as firstCaptureOf,
  isReasonValid
} from '@/lib/attendanceJustification';
import { isIsoDate } from '@/lib/gradeWindowContract';
import { limaToday } from '@/services/admin/dailyAttendanceService';
import { managementAttendanceErrorMessage, managementAttendanceService } from '@/services/admin/managementAttendanceService';
import { isAxiosError } from 'axios';
import type { SectionCourseResponse } from '@/types/sectionCourseApi';
import type { TeacherAttendanceResponse, TeacherAttendanceSessionResponse, TeacherAttendanceStatus, TeacherContingencyCause } from '@/types/teacherAttendanceApi';
import { Failure, SectionDialog, SectionEmpty, SectionLoading, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './sectionUi';

// FRONT #108 (RF-42, BACK #83): asistencia por contingencia desde el panel del Director.
// ADMINISTRADOR registra o corrige; DIRECTIVO solo consulta (sin causa, motivo ni "Guardar").
type Load = { key: string; data?: TeacherAttendanceResponse; error?: string };
type Statuses = Record<number, TeacherAttendanceStatus | null>;
type Draft = Record<number, TeacherAttendanceStatus>;

const STATUS_LABEL: Record<TeacherAttendanceStatus, string> = { PRESENTE: 'Presente', TARDANZA: 'Tardanza', INASISTENCIA: 'Falta' };
export const FUTURE_DATE_MESSAGE = 'No se registra asistencia futura: elige una fecha hasta hoy.';
export const INVALID_DATE_MESSAGE = 'Ingresa una fecha válida.';
export const NO_SESSIONS_MESSAGE = 'Este curso no tiene sesiones programadas para la fecha elegida.';

function sessionLabel(session: TeacherAttendanceSessionResponse): string {
  return `${session.startTime}–${session.endTime}${session.classroom ? ` · ${session.classroom}` : ''}`;
}

function savedOf(session: TeacherAttendanceSessionResponse | undefined): Statuses {
  return Object.fromEntries((session?.students ?? []).map(s => [s.enrollmentId, s.status]));
}

function draftOf(session: TeacherAttendanceSessionResponse | undefined): Draft {
  // Se conserva lo guardado; sin registro, PRESENTE como en el portal docente.
  return Object.fromEntries((session?.students ?? []).map(s => [s.enrollmentId, s.status ?? 'PRESENTE']));
}

export default function AsistenciaContingenciaDialog({ relation, sectionLabel, canManage, onClose, today = limaToday }: {
  relation: SectionCourseResponse;
  sectionLabel: string;
  canManage: boolean;
  onClose: () => void;
  today?: () => string;
}) {
  const maxDate = useMemo(() => today(), [today]);
  const [date, setDate] = useState(maxDate);
  const [revision, setRevision] = useState(0);
  const [load, setLoad] = useState<Load>();
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [cause, setCause] = useState<TeacherContingencyCause>(DEFAULT_CONTINGENCY_CAUSE);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const savingRef = useRef(false);
  const scheduleRef = useRef<number | null>(null);

  const dateError = !isIsoDate(date) ? INVALID_DATE_MESSAGE : date > maxDate ? FUTURE_DATE_MESSAGE : '';
  const key = `${date}|${revision}`;
  const loading = !dateError && load?.key !== key;
  const data = !dateError && load?.key === key ? load.data : undefined;
  const loadError = !dateError && load?.key === key ? load.error : undefined;
  const session = data?.sessions.find(s => s.scheduleId === scheduleId) ?? data?.sessions[0];

  // Al cambiar la fecha (o tras guardar) se recarga la lista de sesiones del día.
  useEffect(() => {
    if (dateError) return;
    let current = true;
    managementAttendanceService.getAttendance(relation.id, date)
      .then(result => {
        if (!current) return;
        // Se mantiene la sesión elegida si sigue en el día; el borrador sale siempre de lo guardado.
        const next = result.sessions.find(s => s.scheduleId === scheduleRef.current) ?? result.sessions[0];
        scheduleRef.current = next?.scheduleId ?? null;
        setLoad({ key, data: result });
        setScheduleId(scheduleRef.current);
        setDraft(draftOf(next));
      })
      .catch(error => { if (current) setLoad({ key, error: managementAttendanceErrorMessage(error, 'load') }); });
    return () => { current = false; };
  }, [relation.id, date, key, dateError]);

  const saved = useMemo(() => savedOf(session), [session]);
  const enrollmentIds = useMemo(() => (session?.students ?? []).map(s => s.enrollmentId), [session]);
  const firstCapture = firstCaptureOf(enrollmentIds, saved);
  const changed = hasAttendanceChanges(enrollmentIds, saved, draft);
  const reasonRequired = firstCapture || changed;
  const trimmedReason = reason.trim();
  // Primera toma: causa y motivo. Corrección: solo con cambios y motivo.
  const canSave = canManage && !!session && session.students.length > 0 && !saving && !loading
    && (firstCapture || changed) && isReasonValid(reason, reasonRequired) && trimmedReason.length > 0;

  const resetJustification = () => { setReason(''); setCause(DEFAULT_CONTINGENCY_CAUSE); setSaveError(''); };

  const changeDate = (value: string) => {
    if (savingRef.current) return;
    setDate(value); setNotice(''); resetJustification();
  };

  const changeSession = (value: string) => {
    if (savingRef.current || !data) return;
    const next = data.sessions.find(s => s.scheduleId === Number(value));
    if (!next) return;
    scheduleRef.current = next.scheduleId;
    setScheduleId(next.scheduleId); setDraft(draftOf(next)); setNotice(''); resetJustification();
  };

  const save = async () => {
    if (!canManage || !session || savingRef.current) return;
    if (reasonRequired && trimmedReason.length === 0) { setSaveError(REASON_REQUIRED_MESSAGE); return; }
    if (trimmedReason.length > ATTENDANCE_REASON_MAX_LENGTH) { setSaveError(REASON_TOO_LONG_MESSAGE); return; }
    if (!firstCapture && !changed) return;
    savingRef.current = true; setSaving(true); setSaveError(''); setNotice('');
    try {
      await managementAttendanceService.saveAttendance(relation.id, session.scheduleId, date, {
        records: session.students.map(s => ({ enrollmentId: s.enrollmentId, status: draft[s.enrollmentId] ?? 'PRESENTE' })),
        reason: trimmedReason,
        contingencyCause: firstCapture ? cause : undefined
      });
      resetJustification();
      setNotice(firstCapture ? 'Asistencia por contingencia registrada.' : 'Corrección de asistencia registrada.');
      setRevision(n => n + 1);
    } catch (error) {
      setSaveError(managementAttendanceErrorMessage(error, 'save'));
      // Ante un conflicto se recarga la sesión: el estado guardado manda.
      if (isAxiosError(error) && error.response?.status === 409) setRevision(n => n + 1);
    } finally {
      savingRef.current = false; setSaving(false);
    }
  };

  const title = canManage ? 'Asistencia por contingencia' : 'Asistencia del curso';
  return <SectionDialog title={title} busy={saving} onClose={() => { if (!savingRef.current) onClose(); }}>
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold break-words">{relation.courseName}</p>
        <p className="text-xs text-muted">{sectionLabel}</p>
        <p className="text-xs text-muted mt-1">{canManage
          ? 'Registra la asistencia cuando el docente no pudo hacerlo. Una sesión sin registro exige causa y motivo; una corrección, motivo.'
          : 'Acceso DIRECTIVO: solo lectura.'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className={labelClass}>Fecha
          <input type="date" aria-label="Fecha de asistencia" className={inputClass} value={date} max={maxDate} disabled={saving}
            onChange={event => changeDate(event.target.value)} />
        </label>
        {data && data.sessions.length > 1 && <label className={labelClass}>Sesión
          <select aria-label="Sesión del día" className={inputClass} value={session?.scheduleId ?? ''} disabled={saving}
            onChange={event => changeSession(event.target.value)}>
            {data.sessions.map(s => <option key={s.scheduleId} value={s.scheduleId}>{sessionLabel(s)}</option>)}
          </select>
        </label>}
      </div>
      {notice && <p role="status" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold">{notice}</p>}
      {dateError ? <p role="alert" className="text-xs text-rose-700">{dateError}</p>
        : loading ? <SectionLoading>Cargando sesiones del día...</SectionLoading>
        : loadError ? <Failure message={loadError} retry={() => setRevision(n => n + 1)} />
        : !session ? <SectionEmpty title="Sin sesiones">{NO_SESSIONS_MESSAGE}</SectionEmpty>
        : <>
          <p className="text-xs text-muted">{`Sesión ${sessionLabel(session)} · Presentes ${session.presentCount} · Tardanzas ${session.lateCount} · Faltas ${session.absenceCount} · Sin registro ${session.pendingCount}`}</p>
          {saveError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">{saveError}</p>}
          {session.students.length === 0 ? <SectionEmpty title="Sin estudiantes">No hay estudiantes matriculados en esta sesión.</SectionEmpty>
            : <ul className="flex flex-col gap-2" aria-label="Estudiantes de la sesión">
              {canManage && <li><button type="button" className={secondaryButtonClass} disabled={saving}
                onClick={() => setDraft(Object.fromEntries(session.students.map(s => [s.enrollmentId, 'PRESENTE'])))}>Marcar todos presentes</button></li>}
              {session.students.map((student, index) => <li key={student.enrollmentId}
                className="px-3.5 py-2.5 rounded-xl border border-line bg-white flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-semibold break-words"><span className="text-muted mr-2">{index + 1}.</span>{student.fullName}</span>
                {canManage
                  ? <SelectorEstadoAsistencia studentName={student.fullName} status={draft[student.enrollmentId] ?? 'PRESENTE'} disabled={saving}
                    onChange={status => setDraft(previous => ({ ...previous, [student.enrollmentId]: status }))} />
                  : <span className="text-xs font-bold text-muted shrink-0">{student.status ? STATUS_LABEL[student.status] : 'Sin registro'}</span>}
              </li>)}
            </ul>}
          {canManage && session.students.length > 0 && <JustificacionAsistencia firstCapture={firstCapture} reasonRequired={reasonRequired}
            contingencyCause={cause} onContingencyCauseChange={setCause} reason={reason} onReasonChange={setReason} disabled={saving} />}
          {canManage && !firstCapture && !changed && session.students.length > 0 &&
            <p className="text-xs text-muted">Sin cambios respecto de lo guardado: modifica algún estado para corregir.</p>}
        </>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <button type="button" className={secondaryButtonClass} disabled={saving} onClick={onClose}>{canManage ? 'Cancelar' : 'Cerrar'}</button>
        {canManage && <button type="button" className={primaryButtonClass} disabled={!canSave} onClick={save}>{saving ? 'Guardando...' : 'Guardar asistencia'}</button>}
      </div>
    </div>
  </SectionDialog>;
}

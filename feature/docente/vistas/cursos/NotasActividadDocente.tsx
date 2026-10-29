'use client';

import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import {
  activityErrorCode,
  activityGradeEntryError,
  isUncertainActivityResult,
  teacherActivitiesErrorMessage,
  teacherActivitiesService
} from '@/services/teacher/teacherActivitiesService';
import { gradeInputError } from '@/lib/manualGrades';
import { academicActivityStatusLabels } from '@/types/teacherActivitiesApi';
import type { ActivityContext, ActivityGradesSheet, ActivityGradesSheetRow, SaveActivityGradeEntry } from '@/types/teacherActivitiesApi';
import { bimesterStatusLabels } from '@/types/evaluationApi';

const button =
  'min-h-10 px-3 py-2 rounded-lg border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 transition-colors';
const input =
  'w-full p-2 rounded-lg border border-line bg-white text-ink focus-visible:outline-accent text-xs';

type Draft = { grade: string; reason: string };
type Prepared = { row: ActivityGradesSheetRow; entry?: SaveActivityGradeEntry; error: string | null };
// Codes after which nothing changed and the typed values are still useful to fix and resend.
const KEEP_DRAFTS = ['ACTIVITY_REQUEST_INVALID', 'ACTIVITY_GRADE_UNCHANGED', 'ENROLLMENT_NOT_ELIGIBLE'];

function prepare(row: ActivityGradesSheetRow, draft: Draft | undefined): Prepared | null {
  if (!draft?.grade.trim()) return null;
  const inputError = gradeInputError(draft.grade.trim());
  if (inputError) return { row, error: inputError };
  // Number() keeps the typed value; it never rounds to fit the 2-decimal rule.
  const entry: SaveActivityGradeEntry = {
    enrollmentId: row.enrollmentId,
    grade: Number(draft.grade.trim()),
    expectedVersion: row.grade?.version ?? null,
    ...(row.grade ? { reason: draft.reason } : {})
  };
  return { row, entry, error: activityGradeEntryError(entry, row.grade) };
}

export default function NotasActividadDocente({
  context,
  activityId,
  disabled,
  lockRef
}: {
  context: ActivityContext;
  activityId: number;
  disabled: boolean;
  lockRef: MutableRefObject<boolean>;
}) {
  const [revision, setRevision] = useState(0);
  const [sheet, setSheet] = useState<{ key: string; data?: ActivityGradesSheet; error?: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);
  const key = String(revision);
  const loading = sheet?.key !== key;
  const data = !loading ? sheet?.data : undefined;
  const { sectionCourseId, bimesterId } = context;
  const editable = !!data && data.activity.status === 'PUBLICADA' && data.bimester.status === 'ABIERTO';
  const locked = disabled || busy || loading || !editable;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    teacherActivitiesService
      .getGradesSheet({ sectionCourseId, bimesterId }, activityId, controller.signal)
      .then(result => {
        if (current) setSheet({ key, data: result });
      })
      .catch(err => {
        if (current) setSheet({ key, error: teacherActivitiesErrorMessage(err) });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [sectionCourseId, bimesterId, activityId, key]);

  const prepared = (data?.students ?? []).map(row => prepare(row, drafts[row.enrollmentId])).filter((p): p is Prepared => p !== null);
  const batchReady = prepared.length > 0 && prepared.length <= 100 && prepared.every(p => !p.error);

  function setDraft(enrollmentId: number, change: Partial<Draft>) {
    setDrafts(prev => ({ ...prev, [enrollmentId]: { ...(prev[enrollmentId] ?? { grade: '', reason: '' }), ...change } }));
  }

  async function save(items: Prepared[]) {
    if (!mounted.current || lockRef.current || locked || !items.length || items.some(p => p.error || !p.entry)) return;
    const entries = items.map(p => p.entry!);
    lockRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    let failure: unknown = null;
    let saved = false;
    try {
      try {
        if (entries.length === 1) await teacherActivitiesService.saveGrade(context, activityId, entries[0]);
        else await teacherActivitiesService.saveGrades(context, activityId, entries);
        saved = true;
      } catch (err) {
        failure = err;
      }
      if (!mounted.current) return;
      const code = failure ? activityErrorCode(failure) : null;
      if (saved || !code || !KEEP_DRAFTS.includes(code)) {
        // Never resend a stale or uncertain value: the teacher re-enters it over reloaded data.
        setDrafts(prev => {
          const next = { ...prev };
          for (const e of entries) delete next[e.enrollmentId];
          return next;
        });
      }
      if (saved) {
        setNotice(entries.length === 1 ? 'Nota guardada. Se recargó la planilla con el PA vigente.' : `Lote de ${entries.length} notas guardado completo. Se recargó la planilla con el PA vigente.`);
      } else if (isUncertainActivityResult(failure)) {
        setError('No se pudo confirmar si las notas se guardaron. Se volvió a consultar la planilla: revisa los valores vigentes antes de registrar de nuevo; no se reintentó automáticamente.');
      } else {
        setError(`${teacherActivitiesErrorMessage(failure)}${entries.length > 1 ? ' El lote es atómico: no se guardó ninguna nota.' : ''}`);
      }
      setRevision(n => n + 1);
    } finally {
      lockRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="mt-4 pt-4 border-t border-line flex flex-col gap-3 min-w-0" aria-label="Notas de la actividad">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h5 className="font-bold text-sm text-ink">Notas por actividad</h5>
        <button type="button" disabled={busy || loading} className={`${button} bg-white`} onClick={() => setRevision(n => n + 1)}>
          Recargar planilla
        </button>
      </div>
      {notice && <p role="status" className="text-xs font-medium text-emerald-700 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">{notice}</p>}
      {error && <p role="alert" className="text-xs font-medium text-rose-700 p-3 bg-rose-50 border border-rose-200 rounded-lg">{error}</p>}
      {busy && <p role="status" className="text-xs text-muted">Guardando y recargando la planilla...</p>}
      {loading ? (
        <p role="status" className="text-xs text-muted py-2">Cargando planilla...</p>
      ) : sheet?.error ? (
        <div role="alert" className="text-xs text-rose-700">
          <p>{sheet.error}</p>
          <button type="button" className={`${button} bg-white mt-2`} onClick={() => setRevision(n => n + 1)}>
            Reintentar planilla
          </button>
        </div>
      ) : data ? (
        <>
          <p className="text-[11px] text-muted">
            Actividad {academicActivityStatusLabels[data.activity.status]} · Bimestre {bimesterStatusLabels[data.bimester.status]}.{' '}
            {editable
              ? 'Registra notas de 0 a 20 con hasta dos decimales. Una corrección exige motivo. «Sin nota» no equivale a 0.'
              : data.activity.status !== 'PUBLICADA'
                ? 'Solo las actividades publicadas admiten notas; la planilla es de consulta.'
                : 'El bimestre no está abierto: la planilla es de consulta.'}{' '}
            El PA es calculado por el servidor y es de solo lectura.
          </p>
          {data.students.length === 0 ? (
            <p className="p-4 text-xs text-muted border border-dashed border-line rounded-lg text-center">No hay estudiantes con matrícula activa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs text-left">
                <thead className="text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="p-2">Estudiante</th>
                    <th className="p-2">Elegible PA</th>
                    <th className="p-2">Nota vigente</th>
                    <th className="p-2">Versión</th>
                    <th className="p-2">PA</th>
                    {editable && <th className="p-2">Nueva nota</th>}
                    {editable && <th className="p-2">Motivo de corrección</th>}
                    {editable && <th className="p-2"><span className="sr-only">Acción</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.students.map(row => {
                    const draft = drafts[row.enrollmentId];
                    const item = prepare(row, draft);
                    return (
                      <tr key={row.enrollmentId} className="border-t border-line align-top">
                        <td className="p-2 font-semibold text-ink">{row.fullName}</td>
                        <td className="p-2">{row.eligibleForPa ? 'Sí' : 'No'}</td>
                        <td className="p-2">{row.grade ? row.grade.grade.toFixed(2) : <span className="text-muted">Sin nota</span>}</td>
                        <td className="p-2">{row.grade ? row.grade.version : '—'}</td>
                        <td className="p-2" title={`${row.gradedActivities} de ${row.assignedActivities} actividades elegibles calificadas`}>
                          {row.pa === null ? '—' : row.pa.toFixed(1)}
                        </td>
                        {editable && (
                          <td className="p-2 w-28">
                            <input
                              aria-label={`Nueva nota de ${row.fullName}`}
                              inputMode="decimal"
                              disabled={locked}
                              className={input}
                              placeholder={row.grade ? 'Corregir' : 'Registrar'}
                              value={draft?.grade ?? ''}
                              aria-invalid={!!item?.error}
                              onChange={e => setDraft(row.enrollmentId, { grade: e.target.value })}
                            />
                            {item?.error && <p role="alert" className="text-rose-700 text-[11px] mt-1">{item.error}</p>}
                          </td>
                        )}
                        {editable && (
                          <td className="p-2">
                            {row.grade && (
                              <input
                                aria-label={`Motivo de corrección de ${row.fullName}`}
                                disabled={locked}
                                maxLength={1000}
                                className={input}
                                value={draft?.reason ?? ''}
                                onChange={e => setDraft(row.enrollmentId, { reason: e.target.value })}
                              />
                            )}
                          </td>
                        )}
                        {editable && (
                          <td className="p-2">
                            <button
                              type="button"
                              aria-label={`Guardar nota de ${row.fullName}`}
                              disabled={locked || !item || !!item.error}
                              className={`${button} bg-white`}
                              onClick={() => {
                                if (item) void save([item]);
                              }}
                            >
                              Guardar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {editable && data.students.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Guardar notas en lote"
                disabled={locked || !batchReady}
                className={`${button} bg-accent text-white`}
                onClick={() => void save(prepared)}
              >
                Guardar {prepared.length} {prepared.length === 1 ? 'nota' : 'notas'} en lote
              </button>
              <span className="text-[11px] text-muted">El lote es atómico: se guardan todas o ninguna (máximo 100).</span>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

'use client';

// Libreta bimestral publicada del hijo activo (FRONT #56, docs/guardian-report.md). Solo lectura.
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { GUARDIAN_STUDENT_UNLINKED, guardianPortalErrorCode } from '@/services/padres/guardianErrors';
import {
  formatLimaDate, formatReportGrade, guardianReportErrorMessage, guardianReportFallbackName, guardianReportService, isFailingGrade,
} from '@/services/padres/guardianReportService';
import type { GuardianBimesterReport, GuardianPublishedBimester } from '@/types/guardianReportApi';

export const LIBRETA_EMPTY_MESSAGE = 'Aún no hay libretas publicadas para este estudiante';
export const LIBRETA_UNAVAILABLE_MESSAGE = 'Esta libreta ya no está disponible';

const LEVEL: Record<string, string> = { PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const card = 'rounded-xl border border-line bg-white p-4';
const errorBox = 'rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700';
const primaryButton = 'rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

/** Error resuelto en la vista por código; nunca se muestra el texto del servidor. */
type ViewError = { message: string; retry: boolean; unavailable: boolean };
function resolveError(error: unknown, subject: 'published' | 'report' | 'reportPdf'): ViewError {
  const code = guardianPortalErrorCode(error);
  if (code === 'STUDENT_NOT_FOUND') return { message: GUARDIAN_STUDENT_UNLINKED, retry: false, unavailable: false };
  if (code === 'REPORT_NOT_FOUND' || code === 'REPORT_NOT_PUBLISHED') return { message: LIBRETA_UNAVAILABLE_MESSAGE, retry: false, unavailable: true };
  return { message: guardianReportErrorMessage(error, subject), retry: true, unavailable: false };
}

function Nota({ grade, strong = false }: { grade: number | null; strong?: boolean }) {
  const failing = isFailingGrade(grade);
  return (
    <span data-failing={failing ? 'true' : undefined} className={failing ? 'font-bold text-rose-700' : strong ? 'font-bold text-ink' : 'text-ink'}>
      {formatReportGrade(grade)}
    </span>
  );
}

export function TablaLibreta({ report }: { report: GuardianBimesterReport }) {
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-xs">
        <table className="w-full min-w-[560px] text-left text-xs" aria-label="Notas por curso">
          <thead className="border-b border-line bg-neutral/40 font-bold text-muted">
            <tr>
              <th className="p-3.5">Área</th>
              <th className="p-3.5">Curso</th>
              <th className="p-3.5">Criterios</th>
              <th className="p-3.5 text-right">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.courses.map((course, i) => (
              <tr key={`${course.areaName}-${course.name}-${i}`} className="align-top">
                <td className="p-3.5 text-muted">{course.areaName}</td>
                <td className="p-3.5 font-semibold text-ink">{course.name}</td>
                <td className="p-3.5">
                  <ul className="space-y-1">
                    {course.criteria.map((criterion, j) => (
                      <li key={`${criterion.name}-${j}`} className="flex justify-between gap-3">
                        <span className="text-muted">{criterion.name}</span>
                        <Nota grade={criterion.grade} />
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-3.5 text-right text-sm"><Nota grade={course.grade} strong /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-label="Resumen por área" className={`mt-4 ${card}`}>
        <h3 className="text-sm font-bold text-ink">Resumen por área</h3>
        <ul className="mt-2 divide-y divide-line text-sm">
          {report.areas.map((area, i) => (
            <li key={`${area.name}-${i}`} className="flex justify-between gap-3 py-2">
              <span className="text-ink">{area.name}</span>
              <Nota grade={area.grade} strong />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

type ListLoad = { key: string; data?: GuardianPublishedBimester[]; error?: ViewError };
type ReportLoad = { key: string; data?: GuardianBimesterReport; error?: ViewError };

export default function VistaLibreta() {
  const { hijoActivo: hijo, isLoading: padreLoading, error: padreError, refreshPadreData } = usePadre();
  const studentId = hijo?.id ?? null;
  const [listReload, setListReload] = useState(0);
  const [reportReload, setReportReload] = useState(0);
  const [list, setList] = useState<ListLoad>();
  const [result, setResult] = useState<ReportLoad>();
  // La selección vale solo para el hijo con el que se hizo: al cambiar de hijo se toma su bimestre más reciente.
  const [selection, setSelection] = useState<{ hijoId: string; bimesterId: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadingRef = useRef(false);
  const scopeRef = useRef<{ key: string; signal: AbortSignal } | null>(null);
  // Hijo y bimestre que ya provocaron una recarga por «no disponible»: si vuelve a fallar, se muestra el error sin recargar más.
  const unavailableRef = useRef<string | null>(null);

  const listKey = studentId ? `${studentId}:${listReload}` : null;
  const listCurrent = list?.key === listKey ? list : undefined;
  const bimesters = listCurrent?.data ?? [];
  const selected = selection && selection.hijoId === studentId && bimesters.some(b => b.bimesterId === selection.bimesterId)
    ? selection.bimesterId : bimesters[0]?.bimesterId ?? null;
  const viewKey = studentId && selected ? `${studentId}:${selected}` : null;
  const reportKey = viewKey ? `${viewKey}:${reportReload}` : null;
  const current = result?.key === reportKey ? result : undefined;

  // Otro hijo: se olvidan la selección y los avisos del anterior; al volver se toma de nuevo su bimestre más reciente.
  const [lastStudent, setLastStudent] = useState(studentId);
  if (lastStudent !== studentId) { setLastStudent(studentId); setSelection(null); setNotice(null); setDownloadError(null); }

  /** Libreta o PDF que ya no están publicados: aviso fijo y la lista se recarga una vez (vuelve al más reciente). */
  const markUnavailable = useCallback((key: string): boolean => {
    if (unavailableRef.current === key) return false;
    unavailableRef.current = key;
    setNotice(LIBRETA_UNAVAILABLE_MESSAGE);
    setSelection(null);
    setListReload(n => n + 1);
    return true;
  }, []);

  useEffect(() => {
    if (!listKey || !studentId) return;
    const abort = new AbortController();
    guardianReportService.published(studentId, abort.signal)
      .then(data => { if (!abort.signal.aborted) setList({ key: listKey, data }); })
      .catch(error => { if (!abort.signal.aborted) setList({ key: listKey, error: resolveError(error, 'published') }); });
    return () => abort.abort();
  }, [listKey, studentId]);

  useEffect(() => {
    if (!reportKey || !viewKey || !studentId || !selected) return;
    const abort = new AbortController();
    guardianReportService.report(studentId, selected, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key: reportKey, data }); })
      .catch(error => {
        if (abort.signal.aborted) return;
        const resolved = resolveError(error, 'report');
        if (!resolved.unavailable || !markUnavailable(viewKey)) setResult({ key: reportKey, error: resolved });
      });
    return () => abort.abort();
  }, [reportKey, viewKey, studentId, selected, markUnavailable]);

  // Una descarga en curso pertenece a su hijo y bimestre: al cambiar (o al desmontar) se cancela y se descarta.
  useEffect(() => {
    if (!viewKey) return;
    const abort = new AbortController();
    scopeRef.current = { key: viewKey, signal: abort.signal };
    return () => abort.abort();
  }, [viewKey]);

  const choose = (bimesterId: number) => {
    if (!studentId) return;
    setSelection({ hijoId: studentId, bimesterId });
    setNotice(null);
    setDownloadError(null);
  };

  async function download(report: GuardianBimesterReport) {
    const scope = scopeRef.current;
    if (downloadingRef.current || !studentId || !scope) return;
    downloadingRef.current = true;
    setDownloading(true);
    setDownloadError(null);
    try {
      const pdf = await guardianReportService.reportPdf(studentId, report.bimester.id, {
        fallbackName: guardianReportFallbackName(report.student.code, report.bimester.number), signal: scope.signal,
      });
      if (scope.signal.aborted) return;
      const url = URL.createObjectURL(pdf.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdf.fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        // Se libera en el siguiente ciclo, cuando el navegador ya tomó la descarga.
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (error) {
      if (scope.signal.aborted) return;
      const resolved = resolveError(error, 'reportPdf');
      if (!resolved.unavailable || !markUnavailable(scope.key)) setDownloadError(resolved.message);
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  }

  const listLoading = !!listKey && !listCurrent;
  const reportLoading = !!reportKey && !current;
  const report = current?.data;

  return (
    <div className="mx-auto max-w-5xl py-4">
      <h1 className="text-xl font-black text-ink">Libreta de calificaciones</h1>
      <p className="mt-1 text-sm text-muted">Libreta bimestral publicada del estudiante. Las fechas están en hora de Lima.</p>

      {padreLoading ? <p role="status" className="mt-6 text-sm text-muted">Cargando estudiantes…</p> : padreError ? (
        <div className="mt-6 text-sm text-accent" role="alert">
          {padreError} <button type="button" className="underline" onClick={() => { void refreshPadreData(); }}>Reintentar</button>
        </div>
      ) : !hijo ? (
        <p className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-muted">No tiene estudiantes vinculados.</p>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold text-ink">{hijo.nombreCompleto}</p>
          {notice && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{notice}</p>}

          {listLoading ? <p role="status" className="mt-5 text-sm text-muted">Cargando libretas publicadas…</p>
            : listCurrent?.error ? (
              <div role="alert" className={`mt-5 ${errorBox}`}>
                <p>{listCurrent.error.message}</p>
                {listCurrent.error.retry && <button type="button" className="mt-2 font-semibold underline" onClick={() => setListReload(n => n + 1)}>Reintentar</button>}
              </div>
            )
            : bimesters.length === 0 ? <p role="status" className="mt-5 rounded-xl border border-line bg-white p-6 text-sm text-muted">{LIBRETA_EMPTY_MESSAGE}</p>
            : (
              <>
                <div className={`my-5 flex flex-wrap items-end gap-3 ${card}`}>
                  <label className="text-xs font-semibold text-muted">
                    Bimestre publicado
                    <select
                      aria-label="Bimestre publicado" value={selected ?? ''} onChange={e => choose(Number(e.target.value))}
                      className="mt-1 block rounded-lg border border-line p-2 text-ink"
                    >
                      {bimesters.map(b => <option key={b.bimesterId} value={b.bimesterId}>{b.name} · {b.academicPeriodName}</option>)}
                    </select>
                  </label>
                </div>

                {reportLoading ? <p role="status" className="text-sm text-muted">Cargando libreta…</p>
                  : current?.error ? (
                    <div role="alert" className={errorBox}>
                      <p>{current.error.message}</p>
                      {current.error.retry && <button type="button" className="mt-2 font-semibold underline" onClick={() => setReportReload(n => n + 1)}>Reintentar</button>}
                    </div>
                  )
                  : report ? (
                    <article aria-label="Libreta" className="space-y-4">
                      <div className={card}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-base font-black text-ink">{report.student.fullName}</h2>
                            <p className="mt-1 text-xs font-semibold text-muted">Código: {report.student.code ?? 'Sin código'}</p>
                            <p className="mt-1 text-xs text-muted">
                              {report.section.grade}.° grado «{report.section.name}»{LEVEL[report.section.level] ? ` · ${LEVEL[report.section.level]}` : ''}
                              {' · '}{report.period.name} · {report.bimester.name}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="rounded-full border border-line bg-neutral px-3 py-0.5 text-[11px] font-bold text-ink">
                              Publicada el <time dateTime={report.publishedAt}>{formatLimaDate(report.publishedAt)}</time>
                            </span>
                            {report.revision > 1 && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-[11px] font-bold text-amber-800">
                                Actualizada (revisión {report.revision})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button type="button" className={primaryButton} disabled={downloading} onClick={() => { void download(report); }}>
                            {downloading ? 'Descargando…' : 'Descargar PDF'}
                          </button>
                          {downloadError && <p role="alert" className="text-sm text-rose-700">{downloadError}</p>}
                        </div>
                      </div>
                      <TablaLibreta report={report} />
                    </article>
                  ) : null}
              </>
            )}
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { formatIsoDate } from '@/lib/gradeWindowContract';
import type { Bimester } from '@/types/evaluationApi';
import type { EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';
import {
  EARLY_ALERTS_EMPTY_MESSAGE, EARLY_ALERTS_PAGE_SIZE, teacherEarlyAlertsErrorMessage, teacherEarlyAlertsService,
} from '@/services/teacher/teacherEarlyAlertsService';

type Load = { key: string; data?: EarlyWarningsPage; error?: string };
const button = 'min-h-10 px-3 py-2 rounded-lg bg-white border border-line text-xs font-bold hover:bg-neutral focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';
const paFormat = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const detectedFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

// #107: students whose accumulated PA was below 11 when the bimester was evaluated (days 15–21).
// Read-only; values are the ones recorded at detection.
export default function AlertasTempranasDocente({ sectionCourseId, bimester }: { sectionCourseId: number; bimester: Bimester }) {
  const bimesterId = bimester.id;
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const key = JSON.stringify([page, revision]);
  const loading = load?.key !== key;
  const data = loading ? undefined : load?.data;

  useEffect(() => {
    const abort = new AbortController();
    teacherEarlyAlertsService.list(sectionCourseId, bimesterId, page, EARLY_ALERTS_PAGE_SIZE, abort.signal)
      .then(result => { if (!abort.signal.aborted) setLoad({ key, data: result }); })
      .catch(error => { if (!abort.signal.aborted) setLoad({ key, error: teacherEarlyAlertsErrorMessage(error) }); });
    return () => abort.abort();
  }, [sectionCourseId, bimesterId, page, key]);

  return (
    <section aria-labelledby={`alertas-${bimesterId}`} className="p-5 bg-white border border-line rounded-xl flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`alertas-${bimesterId}`} className="text-base font-bold text-ink">Alertas tempranas · {bimester.name}</h2>
        <button type="button" className={button} disabled={loading} onClick={() => setRevision(n => n + 1)}>Actualizar alertas</button>
      </div>
      <p className="text-xs text-muted">Alumnos con PA acumulada menor que 11 al evaluarse el bimestre. Se muestran los valores registrados al detectar la alerta.</p>

      {loading ? <p role="status" className="text-muted">Consultando alertas tempranas...</p>
        : load?.error ? <div role="alert" className="text-rose-700"><p>{load.error}</p>
            <button type="button" className={`${button} mt-2`} onClick={() => setRevision(n => n + 1)}>Reintentar</button></div>
        : data && data.totalElements === 0 && data.content.length === 0 ? <p role="status" className="text-muted">{EARLY_ALERTS_EMPTY_MESSAGE}</p>
        : data && <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <caption className="sr-only">Alertas tempranas de {bimester.name}</caption>
              <thead><tr className="border-b border-line text-muted uppercase tracking-wider">
                <th scope="col" className="py-2 pr-3">Código</th>
                <th scope="col" className="py-2 pr-3">Alumno</th>
                <th scope="col" className="py-2 pr-3 text-center">PA al detectarse</th>
                <th scope="col" className="py-2 pr-3 text-center">Actividades</th>
                <th scope="col" className="py-2 pr-3">Fecha de evaluación</th>
                <th scope="col" className="py-2">Detectada</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {data.content.map(alert => <tr key={alert.alertId}>
                  <td className="py-2 pr-3 text-muted">{alert.studentCode ?? 'Sin código'}</td>
                  <th scope="row" className="py-2 pr-3 font-bold text-ink">{alert.fullName}</th>
                  <td className="py-2 pr-3 text-center font-bold text-rose-700">{paFormat.format(alert.paAtDetection)}</td>
                  <td className="py-2 pr-3 text-center">{alert.activityCount}</td>
                  <td className="py-2 pr-3"><time dateTime={alert.evaluatedOn}>{formatIsoDate(alert.evaluatedOn)}</time></td>
                  <td className="py-2"><time dateTime={alert.detectedAt}>{detectedFormat.format(new Date(alert.detectedAt))}</time></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <nav aria-label="Paginación de alertas" className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{data.totalElements} {data.totalElements === 1 ? 'alerta' : 'alertas'} · Página {Math.min(data.page + 1, Math.max(data.totalPages, 1))} de {Math.max(data.totalPages, 1)}</span>
            <span className="flex gap-2">
              <button type="button" className={button} disabled={data.page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</button>
              <button type="button" className={button} disabled={data.page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </span>
          </nav>
        </>}
    </section>
  );
}

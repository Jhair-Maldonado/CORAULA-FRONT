'use client';

import { useEffect, useState } from 'react';
import TablaAlertasTempranas, { earlyAlertsButtonClass as button } from '@/components/earlyAlerts/TablaAlertasTempranas';
import type { Bimester } from '@/types/evaluationApi';
import type { EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';
import {
  EARLY_ALERTS_EMPTY_MESSAGE, EARLY_ALERTS_PAGE_SIZE, teacherEarlyAlertsErrorMessage, teacherEarlyAlertsService,
} from '@/services/teacher/teacherEarlyAlertsService';

type Load = { key: string; data?: EarlyWarningsPage; error?: string };

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
        : data && <TablaAlertasTempranas data={data} caption={`Alertas tempranas de ${bimester.name}`} onPageChange={setPage} />}
    </section>
  );
}

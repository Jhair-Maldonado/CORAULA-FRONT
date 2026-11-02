'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeriodDate } from '@/services/admin/academicPeriodsService';
import { currentBimester, dashboardIndicatorErrorMessage, dashboardIndicatorsService, type PeriodVacancies } from '@/services/admin/dashboardIndicatorsService';
import { evaluationService } from '@/services/admin/evaluationService';
import { managementEarlyAlertsErrorMessage, managementEarlyAlertsService } from '@/services/admin/managementEarlyAlertsService';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';

const card = 'bg-white rounded-2xl border border-line p-6 shadow-sm flex flex-col gap-3';
const button = 'min-h-10 px-4 py-2 rounded-xl text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const link = 'text-xs font-bold text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded';

type Load<T> = { key: string; data?: T; error?: string };

export const NO_PERIOD_MESSAGE = 'Sin periodo académico disponible.';

// Period indicators (current bimester, its early alerts and vacancies). Each card loads and fails on its own;
// the period is the dashboard's default one, taken from the list the dashboard already loaded.
export default function IndicadoresPeriodo({ period, today }: { period: AcademicPeriod | undefined; today: string }) {
  const periodId = period?.id ?? null;
  const [bimestersRevision, setBimestersRevision] = useState(0);
  const [bimesters, setBimesters] = useState<Load<Bimester[]>>();
  const bimestersKey = periodId === null ? null : `${periodId}|${bimestersRevision}`;
  useEffect(() => {
    if (periodId === null || bimestersKey === null) return;
    let current = true;
    evaluationService.getBimesters(periodId)
      .then(data => { if (current) setBimesters({ key: bimestersKey, data }); })
      .catch(error => { if (current) setBimesters({ key: bimestersKey, error: dashboardIndicatorErrorMessage(error, 'bimester') }); });
    return () => { current = false; };
  }, [periodId, bimestersKey]);
  const bimestersLoading = bimestersKey !== null && bimesters?.key !== bimestersKey;
  const bimesterList = bimestersLoading ? undefined : bimesters?.data;
  const bimester = bimesterList && today ? currentBimester(bimesterList, today) : null;

  return <div className="grid gap-6 md:grid-cols-3">
    <section aria-labelledby="current-bimester-title" className={card}>
      <h2 id="current-bimester-title" className="text-base font-bold text-ink">Bimestre vigente</h2>
      {periodId === null ? <p className="text-xs text-muted">{NO_PERIOD_MESSAGE}</p>
        : bimestersLoading ? <p role="status" className="text-xs text-muted">Cargando bimestres...</p>
        : bimesters?.error ? <Failure message={bimesters.error} label="Reintentar bimestre" retry={() => setBimestersRevision(n => n + 1)} />
        : !bimesterList?.length ? <p className="text-xs text-muted">El periodo no tiene bimestres.</p>
        : !bimester ? <p className="text-xs text-muted">Ningún bimestre en curso hoy.</p>
        : <>
          <p className="text-2xl font-bold text-ink">{bimester.name}</p>
          <p className="text-xs text-muted">Estado: <span className="font-bold text-ink">{bimesterStatusLabels[bimester.status]}</span></p>
          <p className="text-xs text-muted">Del {formatPeriodDate(bimester.startDate)} al {formatPeriodDate(bimester.endDate)}</p>
        </>}
      <Link href="/administrador/bimestres" prefetch={false} className={link}>Ir a Bimestres</Link>
    </section>
    <EarlyAlertsCard bimester={periodId === null || bimestersLoading || bimesters?.error ? undefined : bimester} unavailable={periodId === null} />
    <VacanciesCard periodId={periodId} />
  </div>;
}

function EarlyAlertsCard({ bimester, unavailable }: { bimester: Bimester | null | undefined; unavailable: boolean }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Load<number>>();
  const bimesterId = bimester && bimester.status !== 'PLANIFICADO' ? bimester.id : null;
  const key = bimesterId === null ? null : `${bimesterId}|${revision}`;
  useEffect(() => {
    if (bimesterId === null || key === null) return;
    const abort = new AbortController();
    managementEarlyAlertsService.list(bimesterId, null, 0, 1, abort.signal)
      .then(page => { if (!abort.signal.aborted) setResult({ key, data: page.totalElements }); })
      .catch(error => { if (!abort.signal.aborted) setResult({ key, error: managementEarlyAlertsErrorMessage(error, 'list') }); });
    return () => abort.abort();
  }, [bimesterId, key]);
  const loading = key !== null && result?.key !== key;
  const total = loading ? undefined : result?.data;

  return <section aria-labelledby="dashboard-alerts-title" className={card}>
    <h2 id="dashboard-alerts-title" className="text-base font-bold text-ink">Alertas tempranas</h2>
    {unavailable ? <p className="text-xs text-muted">{NO_PERIOD_MESSAGE}</p>
      : bimester === undefined ? <p className="text-xs text-muted">Se mostrarán al conocer el bimestre vigente.</p>
      : bimester === null ? <p className="text-xs text-muted">Sin bimestre en curso hoy.</p>
      : bimesterId === null ? <p className="text-xs text-muted">{bimester.name} aún no se ha abierto.</p>
      : loading ? <p role="status" className="text-xs text-muted">Cargando alertas...</p>
      : result?.error ? <Failure message={result.error} label="Reintentar alertas" retry={() => setRevision(n => n + 1)} />
      : total === 0 ? <p className="text-xs text-muted">Sin alertas en {bimester.name}.</p>
      : total !== undefined && <>
        <p className="text-2xl font-bold text-ink">{total}</p>
        <p className="text-xs text-muted">{total === 1 ? 'alumno con alerta' : 'alumnos con alerta'} en {bimester.name}</p>
      </>}
    <Link href="/administrador/bimestres" prefetch={false} className={link}>Ver en Bimestres</Link>
  </section>;
}

function VacanciesCard({ periodId }: { periodId: number | null }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Load<PeriodVacancies>>();
  const key = periodId === null ? null : `${periodId}|${revision}`;
  useEffect(() => {
    if (periodId === null || key === null) return;
    const abort = new AbortController();
    dashboardIndicatorsService.vacancies(periodId, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!abort.signal.aborted) setResult({ key, error: dashboardIndicatorErrorMessage(error, 'vacancies') }); });
    return () => abort.abort();
  }, [periodId, key]);
  const loading = key !== null && result?.key !== key;
  const data = loading ? undefined : result?.data;
  const rows: [string, number][] = data ? [['Capacidad', data.totalCapacity], ['Matriculados', data.activeEnrollmentCount]] : [];

  return <section aria-labelledby="dashboard-vacancies-title" className={card}>
    <h2 id="dashboard-vacancies-title" className="text-base font-bold text-ink">Vacantes del periodo</h2>
    {periodId === null ? <p className="text-xs text-muted">{NO_PERIOD_MESSAGE}</p>
      : loading ? <p role="status" className="text-xs text-muted">Cargando vacantes...</p>
      : result?.error ? <Failure message={result.error} label="Reintentar vacantes" retry={() => setRevision(n => n + 1)} />
      : data && data.grades === 0 ? <p className="text-xs text-muted">El periodo no tiene secciones activas.</p>
      : data && <>
        <p className="text-2xl font-bold text-ink">{data.availableVacancies}</p>
        <p className="text-xs text-muted">{data.availableVacancies === 1 ? 'vacante disponible' : 'vacantes disponibles'}</p>
        <dl className="grid grid-cols-2 gap-3">
          {rows.map(([label, value]) => <div key={label} className="rounded-xl border border-line p-3">
            <dt className="text-[11px] font-bold text-muted">{label}</dt><dd className="text-lg font-bold text-ink">{value}</dd>
          </div>)}
        </dl>
      </>}
    <Link href="/administrador/vacantes" prefetch={false} className={link}>Ir a Vacantes</Link>
  </section>;
}

function Failure({ message, label, retry }: { message: string; label: string; retry: () => void }) {
  return <div role="alert" className="text-xs text-rose-700"><p>{message}</p>
    <button type="button" aria-label={label} className={`${button} bg-accent text-white mt-3`} onClick={retry}>Reintentar</button></div>;
}

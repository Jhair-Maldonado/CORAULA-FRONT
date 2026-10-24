'use client';

import { useContext, useEffect, useState } from 'react';
import { DashboardSquare01Icon } from 'hugeicons-react';
import { AuthContext } from '@/contexts/AuthContext';
import { academicPeriodLabel, academicPeriodsLoadErrorMessage, academicPeriodsService, formatPeriodDate } from '@/services/admin/academicPeriodsService';
import {
  dailyAttendanceErrorMessage, dailyAttendanceService, defaultAcademicPeriod, defaultAttendanceDate, formatAttendancePercentage, limaToday,
} from '@/services/admin/dailyAttendanceService';
import { sectionsService } from '@/services/admin/sectionsService';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import type { DailyAttendanceIndicator, DailyAttendanceStatus } from '@/types/dailyAttendanceApi';
import type { SectionResponse } from '@/types/sectionApi';

const button = 'min-h-10 px-4 py-2 rounded-xl text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const field = 'min-h-10 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const card = 'bg-white rounded-2xl border border-line p-6 shadow-sm';

// Shown instead of the percentage: these states have none, and must never read as «0 %».
const statusMessages: Partial<Record<DailyAttendanceStatus, string>> = {
  NO_SESSIONS: 'No hay clases programadas para esta fecha. El indicador no considera feriados ni suspensiones.',
  NO_ENROLLMENTS: 'Hay clases programadas, pero ninguna sección consultada tiene estudiantes con matrícula activa.',
  PENDING: 'Aún no se registra asistencia en la primera clase del día.',
};

const sectionName = (section: SectionResponse) => `${section.grade}° ${section.name} · ${section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}`;

export default function PantallaPrincipalAdmin() {
  const auth = useContext(AuthContext);
  if (auth?.status !== 'authenticated' || !auth.sessionValid || (auth.role !== 'ADMINISTRADOR' && auth.role !== 'DIRECTIVO')) {
    return <p role="alert" className="m-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">No tienes acceso al panel de gestión.</p>;
  }
  return <Dashboard />;
}

type Filters = { periodId: number | null; date: string; sectionId: number | null };

function Dashboard() {
  const [periodsRevision, setPeriodsRevision] = useState(0);
  const [periodsResult, setPeriodsResult] = useState<{ revision: number; periods?: AcademicPeriod[]; today?: string; error?: string } | null>(null);
  const [filters, setFilters] = useState<Filters>({ periodId: null, date: '', sectionId: null });
  const [sectionsResult, setSectionsResult] = useState<{ periodId: number; sections?: SectionResponse[]; error?: string } | null>(null);
  const [indicatorRevision, setIndicatorRevision] = useState(0);
  const [indicatorResult, setIndicatorResult] = useState<{ key: string; data?: DailyAttendanceIndicator; error?: string } | null>(null);

  const periodsLoading = periodsResult?.revision !== periodsRevision;
  const periods = periodsResult?.periods ?? [];
  const today = periodsResult?.today ?? '';
  const period = periods.find(p => p.id === filters.periodId);
  const dateError = !period ? null
    : !/^\d{4}-\d{2}-\d{2}$/.test(filters.date) ? 'Selecciona una fecha.'
    : filters.date < period.startDate || filters.date > period.endDate ? `La fecha debe estar entre ${formatPeriodDate(period.startDate)} y ${formatPeriodDate(period.endDate)}.`
    : null;
  const ready = !!period && !dateError;
  const indicatorKey = ready ? `${filters.periodId}|${filters.date}|${filters.sectionId ?? ''}|${indicatorRevision}` : null;
  const indicatorLoading = !!indicatorKey && indicatorResult?.key !== indicatorKey;
  const sections = sectionsResult?.periodId === filters.periodId ? sectionsResult.sections ?? [] : [];

  useEffect(() => {
    let current = true;
    academicPeriodsService.list()
      .then(list => {
        if (!current) return;
        const day = limaToday();
        const selected = defaultAcademicPeriod(list);
        setPeriodsResult({ revision: periodsRevision, periods: list, today: day });
        setFilters({ periodId: selected?.id ?? null, date: selected ? defaultAttendanceDate(selected, day) : '', sectionId: null });
      })
      .catch(error => { if (current) setPeriodsResult({ revision: periodsRevision, error: academicPeriodsLoadErrorMessage(error) }); });
    return () => { current = false; };
  }, [periodsRevision]);

  const periodId = filters.periodId;
  useEffect(() => {
    if (periodId === null) return;
    let current = true;
    sectionsService.list({ academicPeriodId: periodId, active: true })
      .then(list => { if (current) setSectionsResult({ periodId, sections: list.filter(s => s.active && s.academicPeriodId === periodId) }); })
      .catch(() => { if (current) setSectionsResult({ periodId, error: 'No se pudieron cargar las secciones; el indicador se muestra para todo el periodo.' }); });
    return () => { current = false; };
  }, [periodId]);

  const { date, sectionId } = filters;
  useEffect(() => {
    if (!indicatorKey || periodId === null) return;
    // Responses for filters that are no longer selected are discarded.
    let current = true;
    dailyAttendanceService.get({ academicPeriodId: periodId, date, sectionId: sectionId ?? undefined })
      .then(data => { if (current) setIndicatorResult({ key: indicatorKey, data }); })
      .catch(error => { if (current) setIndicatorResult({ key: indicatorKey, error: dailyAttendanceErrorMessage(error) }); });
    return () => { current = false; };
  }, [indicatorKey, periodId, date, sectionId]);

  const selectPeriod = (value: string) => {
    const next = periods.find(p => String(p.id) === value);
    setFilters({ periodId: next?.id ?? null, date: next ? defaultAttendanceDate(next, today) : '', sectionId: null });
  };

  return <div className="w-full min-h-full bg-canvas p-6 md:p-8 font-sans flex flex-col gap-6">
    <header className={`${card} flex flex-wrap items-center justify-between gap-4`}>
      <div><h1 className="text-xl md:text-2xl font-bold text-ink flex items-center gap-3"><DashboardSquare01Icon className="text-accent" aria-hidden="true" />Panel de gestión</h1>
        <p className="text-xs text-muted mt-2">Indicadores institucionales con datos registrados en el sistema.</p></div>
    </header>

    <section aria-labelledby="daily-attendance-title" className={`${card} flex flex-col gap-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="daily-attendance-title" className="text-base font-bold text-ink">Asistencia diaria</h2>
        <button type="button" disabled={!ready || indicatorLoading} onClick={() => setIndicatorRevision(n => n + 1)} className={`${button} bg-white border border-line hover:bg-neutral`}>Actualizar</button>
      </div>

      {periodsLoading ? <p role="status" className="text-xs text-muted">Cargando periodos académicos...</p>
        : periodsResult?.error ? <div role="alert" className="text-xs text-rose-700"><p>{periodsResult.error}</p>
          <button type="button" className={`${button} bg-accent text-white mt-3`} onClick={() => setPeriodsRevision(n => n + 1)}>Reintentar</button></div>
        : !periods.length ? <p className="text-xs text-muted">No hay periodos académicos registrados.</p>
        : <>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] font-bold text-muted">Periodo académico
              <select aria-label="Periodo académico" className={field} value={filters.periodId ?? ''} onChange={e => selectPeriod(e.target.value)}>
                <option value="">Selecciona un periodo</option>
                {periods.map(p => <option key={p.id} value={p.id}>{academicPeriodLabel(p)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-muted">Fecha
              <input aria-label="Fecha" type="date" className={field} disabled={!period} value={filters.date} min={period?.startDate} max={period?.endDate}
                onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-muted">Sección (opcional)
              <select aria-label="Sección" className={field} disabled={!period} value={filters.sectionId ?? ''}
                onChange={e => setFilters(f => ({ ...f, sectionId: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Todas las secciones</option>
                {sections.map(s => <option key={s.id} value={s.id}>{sectionName(s)}</option>)}
              </select>
            </label>
          </div>
          {sectionsResult?.periodId === filters.periodId && sectionsResult.error && <p role="status" className="text-xs text-amber-700">{sectionsResult.error}</p>}

          {!period ? <p className="text-xs text-muted">Selecciona un periodo académico para ver el indicador.</p>
            : dateError ? <p role="alert" className="text-xs text-rose-700">{dateError}</p>
            : indicatorLoading ? <p role="status" className="text-xs text-muted">Cargando indicador...</p>
            : indicatorResult?.error ? <div role="alert" className="text-xs text-rose-700"><p>{indicatorResult.error}</p>
              <button type="button" className={`${button} bg-accent text-white mt-3`} onClick={() => setIndicatorRevision(n => n + 1)}>Reintentar</button></div>
            : indicatorResult?.data ? <Indicator data={indicatorResult.data} today={today} sections={sections} /> : null}
        </>}
    </section>

    <section aria-labelledby="general-average-title" className={card}>
      <h2 id="general-average-title" className="text-base font-bold text-ink">Promedio general</h2>
      <p className="text-xs text-muted mt-2">Disponible próximamente: aún no existe un indicador aprobado.</p>
    </section>
  </div>;
}

function Indicator({ data, today, sections }: { data: DailyAttendanceIndicator; today: string; sections: SectionResponse[] }) {
  const section = data.sectionId === null ? null : sections.find(s => s.id === data.sectionId);
  const scope = data.sectionId === null ? 'Todas las secciones' : section ? sectionName(section) : `Sección #${data.sectionId}`;
  const message = statusMessages[data.status];
  const breakdown: [string, number][] = [['Presentes', data.present], ['Tardanzas', data.late], ['Inasistencias', data.absent], ['Sin registro', data.unrecorded]];

  return <div className="flex flex-col gap-4" aria-live="polite">
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
      <p>Fecha: <time dateTime={data.date} className="font-bold text-ink">{formatPeriodDate(data.date)}</time></p>
      <p>Ámbito: <span className="font-bold text-ink">{scope}</span></p>
      <p>Población: <span className="font-bold text-ink">{data.expectedStudents} estudiantes esperados</span></p>
      <p>{data.scheduledSections} secciones con clase · {data.sectionsWithoutSessions} sin clase</p>
    </div>

    {message || data.attendancePercentage === null
      ? <p className="rounded-xl border border-line bg-neutral/40 p-4 text-sm text-ink">{message ?? 'El porcentaje no está disponible para esta fecha.'}</p>
      : <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-3xl font-bold text-ink">{formatAttendancePercentage(data.attendancePercentage)}</p>
        {data.status === 'PARTIAL'
          ? <><span className="px-3 py-1 rounded-full border font-bold text-[10px] bg-amber-50 text-amber-700 border-amber-200">Provisional</span>
            <p className="text-xs text-muted">Faltan {data.unrecorded} estudiantes por registrar.</p></>
          : <p className="text-xs text-muted">Asistencia registrada para todos los estudiantes.</p>}
      </div>}

    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {breakdown.map(([label, value]) => <div key={label} className="rounded-xl border border-line p-3">
        <dt className="text-[11px] font-bold text-muted">{label}</dt><dd className="text-lg font-bold text-ink">{value}</dd>
      </div>)}
    </dl>

    {data.sectionsWithConflictingFirstSession > 0 && <p role="note" className="text-xs text-amber-700">Hay secciones con horarios que empiezan a la misma hora; revisa los horarios.</p>}
    {today && data.date < today && <p role="note" className="text-xs text-muted">Para fechas pasadas el indicador es orientativo.</p>}
  </div>;
}

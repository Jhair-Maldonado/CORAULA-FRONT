'use client';

import { useEffect, useRef, useState } from 'react';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import type { SectionResponse } from '@/types/sectionApi';
import type { EnrollmentDetailResponse } from '@/types/enrollmentApi';
import type { StudentStatus } from '@/types/studentApi';
import { academicPeriodLabel, academicPeriodsLoadErrorMessage, academicPeriodsService } from '@/services/admin/academicPeriodsService';
import { sectionsService } from '@/services/admin/sectionsService';
import { vacanciesService } from '@/services/management/vacanciesService';
import { enrollmentCreateErrorMessage, enrollmentCreateReason, enrollmentCreateValidation, enrollmentsService, localToday } from '@/services/admin/enrollmentsService';
import { studentLevelLabels } from '@/adapters/studentAdapter';
import { Failure, SectionLoading, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, sectionName } from '../../secciones/sectionUi';

type SectionOption = { section: SectionResponse; vacancies: number | null };
type PeriodsResult = { revision: number; periods?: AcademicPeriod[]; error?: string };
type SectionsResult = { key: string; options?: SectionOption[]; vacanciesUnavailable?: boolean; error?: string };

const defaultDate = (period: AcademicPeriod | undefined) => {
  const today = localToday();
  return period && today >= period.startDate && today <= period.endDate ? today : '';
};

export default function EnrollStudentForm({ studentId, studentStatus, hasActiveEnrollment, cancelLabel, onBusyChange, onEnrolled, onCancel }: {
  studentId: number; studentStatus: StudentStatus; hasActiveEnrollment: boolean; cancelLabel: string;
  onBusyChange: (busy: boolean) => void; onEnrolled: (enrollment: EnrollmentDetailResponse) => void; onCancel: () => void;
}) {
  const [periodsRevision, setPeriodsRevision] = useState(0);
  const [periodsResult, setPeriodsResult] = useState<PeriodsResult | null>(null);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [sectionsRevision, setSectionsRevision] = useState(0);
  const [sectionsResult, setSectionsResult] = useState<SectionsResult | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const periods = periodsResult?.revision === periodsRevision ? periodsResult.periods : undefined;
  const periodsError = periodsResult?.revision === periodsRevision ? periodsResult.error : undefined;
  const period = periods?.find(item => item.id === periodId);
  const sectionsKey = JSON.stringify([periodId, sectionsRevision]);
  const sections = sectionsResult?.key === sectionsKey ? sectionsResult : undefined;
  const selected = sections?.options?.find(option => option.section.id === sectionId);

  useEffect(() => {
    let current = true;
    academicPeriodsService.list().then(list => {
      if (!current) return;
      const active = list.filter(item => item.active);
      const initial = active.find(item => item.current) ?? active[0];
      setPeriodsResult({ revision: periodsRevision, periods: active });
      setPeriodId(initial?.id ?? null);
      setSectionId(null);
      setDate(defaultDate(initial));
    }).catch(failure => { if (current) setPeriodsResult({ revision: periodsRevision, error: academicPeriodsLoadErrorMessage(failure) }); });
    return () => { current = false; };
  }, [periodsRevision]);

  useEffect(() => {
    if (periodId === null) return;
    let current = true;
    const key = JSON.stringify([periodId, sectionsRevision]);
    // Vacancies are optional context: if they cannot be read, the backend 409 still guards capacity.
    Promise.all([sectionsService.list({ academicPeriodId: periodId, active: true }), vacanciesService.list(periodId).catch(() => null)])
      .then(([list, groups]) => {
        if (!current) return;
        const vacancies = new Map((groups ?? []).filter(group => group.academicPeriodId === periodId)
          .flatMap(group => group.sections).map(row => [row.sectionId, row.availableVacancies] as const));
        const options = list.filter(section => section.academicPeriodId === periodId && section.active && section.enrollmentOpen)
          .map(section => ({ section, vacancies: groups ? vacancies.get(section.id) ?? null : null }));
        setSectionsResult({ key, options, vacanciesUnavailable: groups === null });
      })
      .catch(() => { if (current) setSectionsResult({ key, error: 'No se pudieron cargar las secciones del periodo.' }); });
    return () => { current = false; };
  }, [periodId, sectionsRevision]);

  return <form noValidate className="flex flex-col gap-4" onSubmit={async event => {
    event.preventDefault();
    if (submitting.current) return;
    const invalid = enrollmentCreateValidation({ studentStatus, hasActiveEnrollment, period, section: selected?.section,
      availableVacancies: selected?.vacancies ?? null, enrollmentDate: date });
    if (invalid || !period || !selected) { setError(invalid ?? 'Selecciona un periodo y una sección.'); return; }
    submitting.current = true;
    setBusy(true); onBusyChange(true); setError('');
    try {
      const enrollment = await enrollmentsService.create(studentId, {
        academicPeriodId: period.id, sectionId: selected.section.id, enrollmentDate: date, reason: enrollmentCreateReason,
      });
      onEnrolled(enrollment);
    } catch (failure) {
      setError(enrollmentCreateErrorMessage(failure));
    } finally {
      submitting.current = false;
      setBusy(false); onBusyChange(false);
    }
  }}>
    {!periodsResult || periodsResult.revision !== periodsRevision ? <SectionLoading>Cargando periodos académicos...</SectionLoading>
      : periodsError ? <Failure message={periodsError} retry={() => setPeriodsRevision(n => n + 1)} />
      : !periods?.length ? <Failure message="No hay periodos académicos activos para matricular." />
      : <>
        <label className={labelClass}>Periodo académico<select aria-label="Periodo académico" value={periodId ?? ''} disabled={busy} className={inputClass} onChange={event => {
          const next = periods.find(item => item.id === Number(event.target.value));
          setPeriodId(next?.id ?? null); setSectionId(null); setDate(defaultDate(next)); setError('');
        }}>
          {periods.map(item => <option key={item.id} value={item.id}>{academicPeriodLabel(item)}</option>)}
        </select></label>
        {!sections ? <SectionLoading>Cargando secciones...</SectionLoading>
          : sections.error ? <Failure message={sections.error} retry={() => setSectionsRevision(n => n + 1)} />
          : !sections.options?.length ? <Failure message="No hay secciones activas con matrícula abierta en este periodo." />
          : <label className={labelClass}>Sección<select aria-label="Sección" value={sectionId ?? ''} disabled={busy} className={inputClass} onChange={event => { setSectionId(Number(event.target.value) || null); setError(''); }}>
            <option value="">Selecciona una sección</option>
            {sections.options.map(({ section, vacancies }) => <option key={section.id} value={section.id} disabled={vacancies !== null && vacancies <= 0}>
              {studentLevelLabels[section.level]} · {section.grade}° · {sectionName(section.name)}{vacancies === null ? '' : vacancies <= 0 ? ' · Sin vacantes' : ` · ${vacancies} ${vacancies === 1 ? 'vacante' : 'vacantes'}`}
            </option>)}
          </select></label>}
        {sections?.vacanciesUnavailable && <p className="text-xs text-muted">No se pudieron consultar las vacantes; la capacidad se verificará al matricular.</p>}
        <label className={labelClass}>Fecha de matrícula<input aria-label="Fecha de matrícula" type="date" required min={period?.startDate} max={period?.endDate} value={date} disabled={busy} onChange={event => setDate(event.target.value)} className={inputClass} /></label>
      </>}
    {error && <Failure message={error} />}
    {busy && <p role="status" className="text-xs text-muted">Registrando matrícula...</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onCancel}>{cancelLabel}</button>
      <button className={primaryButtonClass} disabled={busy || !periods?.length || !sections?.options?.length}>Matricular</button>
    </div>
  </form>;
}

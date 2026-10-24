'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { academicPeriodLabel, academicPeriodsLoadErrorMessage, academicPeriodsService } from '@/services/admin/academicPeriodsService';
import { maxGradeByLevel, maxSectionNameLength, sectionChanges, sectionsService, sectionValidation } from '@/services/admin/sectionsService';
import { sectionManagementErrorMessage } from '@/services/admin/sectionErrors';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import type { CreateSectionRequest, SectionResponse } from '@/types/sectionApi';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, Failure, SectionDialog, SectionLoading } from './sectionUi';

type Props = {
  original?: SectionResponse;
  onCancel: () => void;
  onSaved: (section: SectionResponse) => void;
};

type Values = { academicPeriodId: string; grade: string; name: string; maxCapacity: string; enrollmentOpen: boolean };

export default function SectionForm({ original, onCancel, onSaved }: Props) {
  // Only SECONDARY is offered for new sections; an existing section keeps its level.
  const level = original?.level ?? 'SECONDARY';
  const [values, setValues] = useState<Values>({
    academicPeriodId: original ? String(original.academicPeriodId) : '', grade: original ? String(original.grade) : '1',
    name: original?.name ?? '', maxCapacity: original ? String(original.maxCapacity) : '', enrollmentOpen: original?.enrollmentOpen ?? true,
  });
  const [periodsRevision, setPeriodsRevision] = useState(0);
  const [periods, setPeriods] = useState<{ revision: number; data?: AcademicPeriod[]; error?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const periodsLoading = periods?.revision !== periodsRevision;

  useEffect(() => {
    let current = true;
    academicPeriodsService.list().then(data => {
      if (!current) return;
      setPeriods({ revision: periodsRevision, data });
      // Preselect the current period for a new section when it can receive sections.
      const vigente = data.find(period => period.current && period.active);
      if (!original && vigente) setValues(previous => previous.academicPeriodId ? previous : { ...previous, academicPeriodId: String(vigente.id) });
    }).catch(failure => { if (current) setPeriods({ revision: periodsRevision, error: academicPeriodsLoadErrorMessage(failure) }); });
    return () => { current = false; };
  }, [original, periodsRevision]);

  function change(next: Partial<Values>) {
    setValues(previous => ({ ...previous, ...next }));
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || periodsLoading || periods?.error) return;
    const request: CreateSectionRequest = {
      academicPeriodId: values.academicPeriodId === '' ? NaN : Number(values.academicPeriodId), level,
      grade: Number(values.grade), name: values.name, maxCapacity: values.maxCapacity === '' ? NaN : Number(values.maxCapacity), enrollmentOpen: values.enrollmentOpen,
    };
    const problem = sectionValidation(request);
    if (problem) { setError(problem); return; }
    const changes = original ? sectionChanges(original, request) : null;
    if (changes && !Object.keys(changes).length) { setError('No hay cambios.'); return; }
    lock.current = true;
    setBusy(true); setError(null);
    try {
      onSaved(original && changes
        ? await sectionsService.update(original.id, changes)
        : await sectionsService.create({ ...request, name: request.name.trim() }));
    } catch (failure) {
      setError(sectionManagementErrorMessage(failure));
    } finally {
      lock.current = false; setBusy(false);
    }
  }

  const periodOptions = periodsLoading ? [] : periods?.data ?? [];
  const missingOriginal = original && !periodOptions.some(period => period.id === original.academicPeriodId);
  return <SectionDialog title={original ? 'Editar sección' : 'Nueva sección'} busy={busy} onClose={() => { if (!lock.current) onCancel(); }}>
    <form aria-label="Sección" noValidate onSubmit={submit} className="flex flex-col gap-4">
      {periodsLoading ? <SectionLoading>Cargando periodos académicos...</SectionLoading> : periods?.error ? <Failure message={periods.error} retry={() => setPeriodsRevision(n => n + 1)} /> : <fieldset disabled={busy} className="flex flex-col gap-4">
        <label className={labelClass}>Periodo académico
          <select aria-label="Periodo académico" className={inputClass} value={values.academicPeriodId} onChange={event => change({ academicPeriodId: event.target.value })}>
            {!original && <option value="">Selecciona un periodo</option>}
            {missingOriginal && <option value={String(original.academicPeriodId)}>Periodo {original.academicPeriodId}</option>}
            {/* Inactive periods cannot receive sections; the section's own period stays visible when editing. */}
            {periodOptions.map(period => <option key={period.id} value={String(period.id)} disabled={!period.active && period.id !== original?.academicPeriodId}>{academicPeriodLabel(period)}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={labelClass}>Nivel<p className={`${inputClass} flex items-center bg-neutral`}>{level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}</p></div>
          <label className={labelClass}>Grado
            <select aria-label="Grado" className={inputClass} value={values.grade} onChange={event => change({ grade: event.target.value })}>
              {Array.from({ length: maxGradeByLevel[level] }, (_, index) => index + 1).map(grade => <option key={grade} value={String(grade)}>{grade}°</option>)}
            </select>
          </label>
          <label className={labelClass}>Nombre
            <input aria-label="Nombre" required maxLength={maxSectionNameLength} placeholder="A" className={inputClass} value={values.name} onChange={event => change({ name: event.target.value })} />
          </label>
          <label className={labelClass}>Capacidad máxima
            <input aria-label="Capacidad máxima" required type="number" min={1} step={1} className={inputClass} value={values.maxCapacity} onChange={event => change({ maxCapacity: event.target.value })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-ink min-h-10">
          <input aria-label="Matrícula abierta" type="checkbox" className="w-4 h-4 accent-accent" checked={values.enrollmentOpen} onChange={event => change({ enrollmentOpen: event.target.checked })} />Matrícula abierta
        </label>
      </fieldset>}
      {error && <Failure message={error} />}
      {busy && <p role="status" className="text-xs text-muted">Guardando sección...</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => { if (!lock.current) onCancel(); }}>Cancelar</button>
        <button type="submit" className={primaryButtonClass} disabled={busy || periodsLoading || !!periods?.error}>{busy ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  </SectionDialog>;
}

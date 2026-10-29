'use client';

import { useRef, useState, type FormEvent } from 'react';
import ScheduleDialog from '@/../feature/admin/vistas/(administrativo)/horario/components/ScheduleDialog';
import { academicPeriodChanges, academicPeriodErrorMessage, academicPeriodsService, academicPeriodValidation, maxAcademicPeriodNameLength } from '@/services/admin/academicPeriodsService';
import type { AcademicPeriod, CreateAcademicPeriodRequest } from '@/types/academicPeriodApi';

const button = 'min-h-10 px-4 py-2 rounded-xl text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const input = 'w-full mt-2 p-3 rounded-xl border border-line bg-neutral/40 text-ink focus-visible:outline-accent';

type Props = {
  original?: AcademicPeriod;
  onCancel: () => void;
  onSaved: (period: AcademicPeriod) => void;
};

export default function AcademicPeriodForm({ original, onCancel, onSaved }: Props) {
  const [values, setValues] = useState<CreateAcademicPeriodRequest>({
    name: original?.name ?? '', startDate: original?.startDate ?? '', endDate: original?.endDate ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const problem = academicPeriodValidation(values);
    if (problem) { setError(problem); return; }
    const changes = original ? academicPeriodChanges(original, values) : null;
    if (changes && !Object.keys(changes).length) { setError('No hay cambios.'); return; }
    lock.current = true;
    setBusy(true); setError(null);
    try {
      onSaved(original && changes
        ? await academicPeriodsService.update(original.id, changes)
        : await academicPeriodsService.create({ ...values, name: values.name.trim() }));
    } catch (failure) {
      setError(academicPeriodErrorMessage(failure));
    } finally {
      lock.current = false; setBusy(false);
    }
  }

  return <ScheduleDialog title={original ? 'Editar periodo académico' : 'Crear periodo académico'} busy={busy} onClose={() => { if (!lock.current) onCancel(); }}>
    <form aria-label="Periodo académico" noValidate onSubmit={submit} className="flex flex-col gap-4 text-xs font-bold text-muted">
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <label>Nombre<input aria-label="Nombre" required maxLength={maxAcademicPeriodNameLength} value={values.name} className={input} onChange={e => { setValues({ ...values, name: e.target.value }); setError(null); }} /></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>Fecha de inicio<input aria-label="Fecha de inicio" required type="date" value={values.startDate} className={input} onChange={e => { setValues({ ...values, startDate: e.target.value }); setError(null); }} /></label>
          <label>Fecha de fin<input aria-label="Fecha de fin" required type="date" min={values.startDate || undefined} value={values.endDate} className={input} onChange={e => { setValues({ ...values, endDate: e.target.value }); setError(null); }} /></label>
        </div>
      </fieldset>
      {error && <p role="alert" className="text-rose-700 break-words">{error}</p>}
      {busy && <p role="status" className="text-muted">Guardando periodo académico...</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={busy} onClick={onCancel} className={`${button} bg-white border border-line hover:bg-neutral`}>Cancelar</button>
        <button type="submit" disabled={busy} className={`${button} bg-accent text-white hover:bg-accent/90`}>{busy ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  </ScheduleDialog>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar01Icon, PlusSignIcon } from 'hugeicons-react';
import { evaluationService, evaluationErrorMessage, bimesterOpeningErrorMessage } from '@/services/admin/evaluationService';
import { academicPeriodLabel, academicPeriodsService, academicPeriodsLoadErrorMessage } from '@/services/admin/academicPeriodsService';
import ScheduleDialog from '@/../feature/admin/vistas/(administrativo)/horario/components/ScheduleDialog';
import { bimesterStatusLabels, type Bimester, type BimesterInput } from '@/types/evaluationApi';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import { isPositiveInteger } from '@/lib/evaluationPreparation';

const button = 'min-h-10 px-4 py-2 rounded-xl text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const input = 'w-full mt-2 p-3 rounded-xl border border-line bg-neutral/40 text-ink focus-visible:outline-accent';
// Annulled bimesters (#43) keep their row but release their number for reuse.
const occupiesNumber = (b: Bimester) => b.status !== 'ANULADO';
type OpeningConfirmation = { bimester: Bimester; periodId: number; generation: number };
type QueryContext = { periodId: number; generation: number };

export default function VistaBimestres() {
  const [period, setPeriod] = useState('');
  const [query, setQuery] = useState<QueryContext | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; data?: Bimester[]; error?: string } | null>(null);
  const [form, setForm] = useState<{ periodId: number; original?: Bimester; values: BimesterInput } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [opening, setOpening] = useState<OpeningConfirmation | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const confirmation = useRef<OpeningConfirmation | null>(null);
  const contextGeneration = useRef(0);
  const mounted = useRef(true);
  const lock = useRef(false);
  const activeQuery = useRef<QueryContext | null>(null);
  const read = useRef<{ key: string; promise: Promise<Bimester[]> } | null>(null);
  const [periodsRevision, setPeriodsRevision] = useState(0);
  const [periods, setPeriods] = useState<{ revision: number; data?: AcademicPeriod[]; error?: string } | null>(null);
  const periodsRead = useRef<{ revision: number; promise: Promise<AcademicPeriod[]> } | null>(null);
  const autoSelected = useRef(false);
  const periodsLoading = periods?.revision !== periodsRevision;
  const periodOptions = periodsLoading ? [] : periods?.data ?? [];
  const periodId = query?.periodId ?? 0;
  const valid = query !== null;
  const key = JSON.stringify(query);
  const loading = valid && result?.key !== key;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    // Reuse the request if React replays the effect.
    if (periodsRead.current?.revision !== periodsRevision) periodsRead.current = { revision: periodsRevision, promise: academicPeriodsService.list() };
    periodsRead.current.promise.then(data => {
      if (!current) return;
      setPeriods({ revision: periodsRevision, data });
      // Preselect the current period once, unless the user already chose a context.
      const vigente = data.find(p => p.current);
      if (autoSelected.current || !vigente || lock.current || activeQuery.current) return;
      autoSelected.current = true;
      setPeriod(String(vigente.id)); setPeriodError(null); startQuery(vigente.id);
    }).catch(error => { if (current) setPeriods({ revision: periodsRevision, error: academicPeriodsLoadErrorMessage(error) }); });
    return () => { current = false; };
  }, [periodsRevision]);
  useEffect(() => {
    if (!query) return;
    let current = true;
    // Reuse this confirmation's request if React replays the effect.
    if (read.current?.key !== key) read.current = { key, promise: evaluationService.getBimesters(query.periodId) };
    read.current.promise.then(data => { if (current && activeQuery.current === query) { setResult({ key, data }); setRefreshRequired(false); } })
      .catch(error => { if (current && activeQuery.current === query) setResult({ key, error: evaluationErrorMessage(error) }); });
    return () => { current = false; };
  }, [query, key]);

  function startQuery(id: number) {
    const next = { periodId: id, generation: ++contextGeneration.current };
    activeQuery.current = next; setQuery(next);
    confirmation.current = null; setOpening(null); setForm(null);
    setResult(null); setNotice(null); setActionError(null);
  }
  function confirmPeriod() {
    if (lock.current || activeQuery.current !== query || (query && loading)) return;
    const id = Number(period);
    if (!/^\d+$/.test(period) || !periodOptions.some(p => p.id === id)) {
      setPeriodError('Selecciona un periodo académico de la lista.'); return;
    }
    setPeriodError(null); startQuery(id);
  }
  function currentContext() { return query !== null && activeQuery.current === query; }

  function refreshList() {
    if (lock.current || !currentContext() || loading) return;
    startQuery(periodId);
  }
  function cancelOpening() { if (!lock.current) { confirmation.current = null; setOpening(null); } }
  function requestOpening(bimester: Bimester) {
    if (lock.current || !currentContext() || loading || form || refreshRequired || result?.key !== key || result.error || bimester.academicPeriodId !== periodId || result.data?.find(b => b.id === bimester.id)?.status !== 'PLANIFICADO') return;
    const pending = { bimester, periodId, generation: contextGeneration.current };
    confirmation.current = pending; setOpening(pending); setActionError(null); setNotice(null);
  }
  async function confirmOpening() {
    if (!opening || confirmation.current !== opening || opening.generation !== contextGeneration.current || lock.current || loading || form || refreshRequired) return;
    lock.current = true; confirmation.current = null; setOpening(null);
    setBusy(true); setRefreshRequired(true); setActionError(null); setNotice(null);
    const target = opening;
    const current = () => mounted.current && target.generation === contextGeneration.current;
    let accepted = false, failure: string | null = null;
    try {
      try {
        const opened = await evaluationService.openBimester(target.bimester.id);
        if (opened.academicPeriodId !== target.periodId) throw new Error('Periodo de apertura inconsistente.');
        accepted = true;
      } catch (error) { failure = bimesterOpeningErrorMessage(error); }
      // Even an ambiguous POST or 409 requires a read before another attempt.
      try {
        const rows = await evaluationService.getBimesters(target.periodId);
        if (!current()) return;
        setResult({ key, data: rows });
        const confirmed = rows.find(b => b.id === target.bimester.id)?.status === 'ABIERTO';
        setRefreshRequired(accepted && !confirmed);
        if (accepted && confirmed) setNotice(`${target.bimester.name} está ABIERTO. Estado confirmado mediante recarga.`);
        else setActionError(failure ?? 'El servidor aceptó la apertura, pero el estado ABIERTO no se confirmó mediante recarga. Actualiza la lista.');
      } catch {
        if (current()) setActionError(`${failure ?? 'El servidor aceptó la apertura.'} No se pudo confirmar el estado visual mediante recarga. Actualiza la lista antes de continuar.`);
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }

  return <div className="w-full min-h-full bg-canvas p-6 md:p-8 font-sans flex flex-col gap-6">
    <header className="bg-white rounded-2xl border border-line p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl md:text-2xl font-bold text-ink flex items-center gap-3"><Calendar01Icon className="text-accent" aria-hidden="true" />Bimestres</h1><p className="text-xs text-muted mt-2">Configuración del calendario de evaluación.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!valid || busy || loading} onClick={refreshList} className={`${button} bg-white border border-line hover:bg-neutral`}>Actualizar</button>
      <button disabled={!valid || busy || loading || !!result?.error || !!form || !!opening || refreshRequired} onClick={() => { if (lock.current || !currentContext() || loading || result?.key !== key || result.error || refreshRequired) return; setActionError(null); setNotice(null); setForm({ periodId, values: { number: (result?.data?.filter(occupiesNumber).reduce((max, b) => Math.max(max, b.number), 0) ?? 0) + 1, name: '', startDate: '', endDate: '' } }); }} className={`${button} bg-accent text-white flex items-center gap-2 hover:bg-accent/90`}><PlusSignIcon size={16} aria-hidden="true" />Crear bimestre</button></div>
    </header>
    <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
      <form aria-label="Consulta de bimestres" noValidate onSubmit={e => { e.preventDefault(); confirmPeriod(); }} className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-bold text-muted w-full max-w-md">Periodo académico<select className={input} value={period} disabled={busy || periodsLoading || !periodOptions.length} aria-invalid={!!periodError} aria-describedby={periodError ? 'period-error' : undefined} onChange={e => { if (lock.current) return; contextGeneration.current++; activeQuery.current = null; setQuery(null); setResult(null); confirmation.current = null; setOpening(null); setRefreshRequired(false); setPeriod(e.target.value); setPeriodError(null); setForm(null); setActionError(null); setNotice(null); }}>
          <option value="">Selecciona un periodo</option>
          {periodOptions.map(p => <option key={p.id} value={String(p.id)}>{academicPeriodLabel(p)}</option>)}
        </select></label>
        <button type="submit" disabled={busy || loading || !periodOptions.length} className={`${button} bg-accent text-white`}>Consultar bimestres</button>
      </form>
      {periodsLoading && <p role="status" className="mt-3 text-xs text-muted">Cargando periodos académicos...</p>}
      {!periodsLoading && periods?.error && <div role="alert" className="mt-3 text-xs text-rose-700"><p>{periods.error}</p><button type="button" className={`${button} bg-white border border-line mt-2`} disabled={busy} onClick={() => setPeriodsRevision(n => n + 1)}>Reintentar</button></div>}
      {!periodsLoading && periods?.data?.length === 0 && <p className="mt-3 text-xs text-muted">No hay periodos académicos registrados. Créalos en Periodos.</p>}
      {periodError && <p id="period-error" role="alert" className="mt-3 text-xs text-rose-700">{periodError}</p>}
    </section>
    <section className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
      {!valid ? <p className="p-6 text-xs text-muted">Selecciona un periodo académico para consultar sus bimestres.</p>
        : loading ? <p role="status" className="p-6 text-xs text-muted">Cargando bimestres...</p>
        : result?.error ? <div role="alert" className="p-6 text-xs text-rose-700"><p>{result.error}</p><button className={`${button} bg-accent text-white mt-3`} disabled={busy} onClick={refreshList}>Reintentar</button></div>
        : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-neutral/40 text-muted uppercase text-[10px] tracking-wider"><tr>{['Nombre', 'Fechas', 'Estado', 'Acciones'].map(title => <th scope="col" key={title} className="p-4 border-b border-line">{title}</th>)}</tr></thead><tbody className="divide-y divide-line">
          {result?.data?.map(b => <tr key={b.id}><th scope="row" className="p-4 font-bold text-ink">{b.name}</th><td className="p-4 whitespace-nowrap"><time dateTime={b.startDate}>{b.startDate.split('-').reverse().join('/')}</time> — <time dateTime={b.endDate}>{b.endDate.split('-').reverse().join('/')}</time></td><td className="p-4"><span className={`px-3 py-1 rounded-full border font-bold ${b.status === 'ABIERTO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : b.status === 'ANULADO' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-neutral text-muted border-line'}`}>{bimesterStatusLabels[b.status]}</span></td><td className="p-4"><div className="flex gap-2 whitespace-nowrap">{b.status === 'PLANIFICADO' && <><button className={`${button} bg-white border border-line hover:bg-neutral`} disabled={busy || !!form || !!opening || refreshRequired} onClick={() => { if (lock.current || !currentContext() || loading || refreshRequired) return; setActionError(null); setForm({ periodId, original: b, values: { number: b.number, name: b.name, startDate: b.startDate, endDate: b.endDate } }); }}>Editar</button><button type="button" className={`${button} bg-accent text-white`} disabled={busy || loading || !!form || !!opening || refreshRequired} onClick={() => requestOpening(b)}>Abrir bimestre</button></>}</div></td></tr>)}
          {result?.data?.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted">No hay bimestres registrados.</td></tr>}
        </tbody></table></div>}
    </section>
    {busy && !form && <p role="status" className="text-xs text-muted">Abriendo bimestre y consultando su estado...</p>}
    {refreshRequired && !busy && <p role="alert" className="text-xs text-rose-700">Actualiza la lista para confirmar el estado antes de otra operación.</p>}
    {!form && actionError && <p role="alert" className="text-xs text-rose-700">{actionError}</p>}
    {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
    {opening && <ScheduleDialog title="Confirmar apertura del bimestre" onClose={cancelOpening}>
      <p className="text-sm text-ink">Abrir <strong>{opening.bimester.name}</strong> del periodo académico <strong>{periods?.data?.find(p => p.id === opening.periodId)?.name ?? opening.periodId}</strong>.</p>
      <p className="text-xs text-muted mt-3">La apertura habilita el registro de notas. Esta funcionalidad no permite deshacer la apertura, cerrar ni reabrir bimestres.</p>
      <div className="flex flex-wrap gap-3 mt-5"><button type="button" className={`${button} bg-white border border-line`} onClick={cancelOpening}>Cancelar</button><button type="button" className={`${button} bg-accent text-white`} disabled={busy || loading || refreshRequired} onClick={() => { void confirmOpening(); }}>Confirmar apertura</button></div>
    </ScheduleDialog>}
    {form && <section className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-6 shadow-sm max-w-xl" aria-labelledby="bimester-form-title">
      <h2 id="bimester-form-title" className="text-base font-bold pb-3 border-b border-line">{form.original ? 'Editar bimestre' : 'Crear bimestre'}</h2>
      <form className="flex flex-col gap-4 mt-4 text-xs font-bold text-muted" onSubmit={async e => {
        e.preventDefault();
        if (lock.current || !currentContext() || form.periodId !== periodId || opening || refreshRequired) return;
        if (loading || result?.key !== key || result.error) return;
        if (form.original && result.data?.find(b => b.id === form.original?.id)?.status !== 'PLANIFICADO') { setActionError('Este bimestre ya no está PLANIFICADO. Cancela la edición y actualiza la lista.'); return; }
        if (!form.values.name.trim()) { setActionError('Ingresa el nombre del bimestre.'); return; }
        if (!isPositiveInteger(form.values.number)) { setActionError('El número debe ser un entero positivo.'); return; }
        if (!form.original && result?.data?.some(b => occupiesNumber(b) && b.number === form.values.number)) { setActionError('Ya existe un bimestre con ese número en este periodo.'); return; }
        if (form.values.endDate < form.values.startDate) { setActionError('La fecha de fin debe ser igual o posterior a la fecha de inicio.'); return; }
        lock.current = true;
        setBusy(true); setActionError(null); setNotice(null);
        try {
          const { name, startDate, endDate } = form.values;
          if (form.original) await evaluationService.updateBimester(form.original.id, { name: name.trim(), startDate, endDate });
          else await evaluationService.createBimester(form.periodId, { ...form.values, name: name.trim() });
          startQuery(form.periodId); setNotice('Configuración del bimestre guardada.');
        } catch (error) { setActionError(evaluationErrorMessage(error)); }
        finally { lock.current = false; setBusy(false); }
      }}>
        <fieldset disabled={busy} className="flex flex-col gap-4">
          {!form.original && <label>Número<input required type="number" min="1" max="2147483647" step="1" value={form.values.number} className={input} onChange={e => setForm({ ...form, values: { ...form.values, number: Number(e.target.value) } })} /></label>}
          <label>Nombre<input autoFocus required maxLength={100} value={form.values.name} className={input} onChange={e => setForm({ ...form, values: { ...form.values, name: e.target.value } })} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label>Fecha de inicio<input required type="date" value={form.values.startDate} className={input} onChange={e => setForm({ ...form, values: { ...form.values, startDate: e.target.value } })} /></label><label>Fecha de fin<input required type="date" min={form.values.startDate || undefined} value={form.values.endDate} className={input} onChange={e => setForm({ ...form, values: { ...form.values, endDate: e.target.value } })} /></label></div>
        </fieldset>
        {actionError && <p role="alert" className="text-rose-700">{actionError}</p>}
        <div className="flex gap-3"><button disabled={busy || loading || !!result?.error} className={`${button} bg-accent text-white`} type="submit">{busy ? 'Guardando...' : 'Guardar'}</button><button disabled={busy} className={`${button} bg-white border border-line`} type="button" onClick={() => setForm(null)}>Cancelar</button></div>
      </form>
    </section>}
  </div>;
}

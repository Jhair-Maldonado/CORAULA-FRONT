'use client';
import { useEffect, useRef, useState } from 'react';
import { evaluationService, evaluationErrorMessage } from '@/services/admin/evaluationService';
import { isPositiveInteger } from '@/lib/evaluationPreparation';
import type { EvaluationConfiguration, EvaluationCriterion, CreateEvaluationCriterionInput, UpdateEvaluationCriterionInput } from '@/types/evaluationApi';

const button = 'min-h-10 px-4 py-2 rounded-xl text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const input = 'block mt-2 w-full p-3 bg-neutral/40 border border-line rounded-xl text-ink focus-visible:outline-accent';
type CriterionForm = { original?: EvaluationCriterion; values: CreateEvaluationCriterionInput; active: boolean };

export default function CourseCriteria({ courseId }: { courseId: string }) {
  const [period, setPeriod] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; response?: EvaluationConfiguration; error?: string } | null>(null);
  const [form, setForm] = useState<CriterionForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false);
  const periodId = Number(period);
  const valid = Number.isSafeInteger(periodId) && periodId > 0;
  const key = JSON.stringify([courseId, periodId, revision]);
  const loading = valid && result?.key !== key;
  const response = !loading && result?.key === key ? result.response : undefined;
  const existing = response?.criteria ?? [];
  useEffect(() => {
    if (!valid) return;
    let current = true;
    evaluationService.getCriteria(courseId, periodId).then(response => {
      if (current) setResult({ key, response });
    }).catch(error => { if (current) setResult({ key, error: evaluationErrorMessage(error) }); });
    return () => { current = false; };
  }, [courseId, periodId, valid, key]);

  async function save() {
    if (!form || lock.current || !response) return;
    const { original, values, active } = form;
    const name = values.name.trim();
    if (!name || name.length > 255) { setActionError('El nombre debe tener entre 1 y 255 caracteres.'); return; }
    if (!isPositiveInteger(values.order)) { setActionError('El orden debe ser un entero positivo.'); return; }
    if (existing.some(c => c.id !== original?.id && c.order === values.order)) { setActionError('El orden ya existe en este curso y periodo, incluso si el criterio está inactivo.'); return; }
    if (active && values.type === 'PARTICIPACION_ACADEMICA' && existing.some(c => c.id !== original?.id && c.active && c.type === 'PARTICIPACION_ACADEMICA')) {
      setActionError('Solo puede existir un criterio PA activo en este curso y periodo.'); return;
    }
    const description = values.description?.trim() || null;
    const patch: UpdateEvaluationCriterionInput = {};
    if (original) {
      if (name !== original.name) patch.name = name;
      if (description !== original.description) patch.description = description;
      if (values.order !== original.order) patch.order = values.order;
      if (active !== original.active) patch.active = active;
      if (Object.keys(patch).length === 0) { setForm(null); return; }
    }
    lock.current = true;
    setBusy(true); setActionError(null); setNotice(null);
    try {
      if (original) await evaluationService.updateCriterion(original.id, patch);
      else await evaluationService.createCriterion(courseId, { ...values, name, description });
      setForm(null); setRevision(n => n + 1); setNotice('Configuración del criterio guardada.');
    } catch (error) { setActionError(evaluationErrorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  }

  return <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
      <h2 className="text-xs font-bold uppercase tracking-wider">Criterios de evaluación</h2>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!valid || busy || loading} className={`${button} bg-white border border-line hover:bg-neutral`} onClick={() => setRevision(n => n + 1)}>Actualizar</button>
      <button type="button" disabled={!response || busy || !!form} className={`${button} bg-accent text-white hover:bg-accent/90`} onClick={() => {
        setActionError(null); setNotice(null);
        const firstFreeOrder = existing.reduce((max, c) => Math.max(max, c.order), 0) + 1;
        setForm({ values: { academicPeriodId: periodId, name: '', description: null, order: firstFreeOrder, type: 'MANUAL' }, active: true });
      }}>Crear criterio</button></div>
    </div>
    <label className="block text-xs font-bold text-muted my-4">ID del periodo académico
      <input type="number" min="1" step="1" value={period} disabled={busy} onChange={e => { setPeriod(e.target.value); setForm(null); setActionError(null); setNotice(null); }} className="block mt-2 w-full sm:w-56 p-3 bg-neutral/40 border border-line rounded-xl text-ink focus-visible:outline-accent" />
    </label>
    {!valid ? <p className="text-xs text-muted">Ingresa el ID del periodo académico para consultar su configuración.</p>
      : loading ? <p role="status" className="text-xs text-muted">Cargando criterios...</p>
      : result?.error ? <div role="alert" className="text-xs text-rose-700"><p>{result.error}</p><button onClick={() => setRevision(n => n + 1)} className="mt-3 min-h-10 px-4 py-2 bg-accent text-white rounded-xl font-bold">Reintentar</button></div>
      : response && <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-neutral/40 text-muted"><tr>{['Nombre', 'Orden', 'Tipo', 'Activo', 'Acciones'].map(title => <th scope="col" key={title} className="p-3 border-b border-line">{title}</th>)}</tr></thead><tbody>
        {response.criteria.map(criterion => <tr key={criterion.id} className="border-b border-line"><td className="p-3 font-bold">{criterion.name}</td><td className="p-3">{criterion.order}</td><td className="p-3">{criterion.type === 'MANUAL' ? 'MANUAL' : 'PARTICIPACIÓN ACADÉMICA (AUTOMÁTICO)'}</td><td className="p-3">{criterion.active ? 'Sí' : 'No'}</td><td className="p-3"><button type="button" disabled={busy || !!form} aria-label={`Editar ${criterion.name}`} className={`${button} bg-white border border-line hover:bg-neutral`} onClick={() => {
          setActionError(null); setNotice(null);
          setForm({ original: criterion, values: { academicPeriodId: criterion.academicPeriodId, name: criterion.name, description: criterion.description, order: criterion.order, type: criterion.type }, active: criterion.active });
        }}>Editar</button></td></tr>)}
        {response.criteria.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No hay criterios configurados para este periodo.</td></tr>}
      </tbody></table></div>}
    {notice && <p role="status" className="mt-4 text-xs text-emerald-700">{notice}</p>}
    {form && <form aria-labelledby="criterion-form-title" className="mt-5 pt-4 border-t border-line flex flex-col gap-4 text-xs font-bold text-muted" onSubmit={e => { e.preventDefault(); void save(); }}>
      <h3 id="criterion-form-title" className="text-sm text-ink">{form.original ? 'Editar criterio' : 'Crear criterio'}</h3>
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <label>Nombre<input autoFocus required maxLength={255} value={form.values.name} className={input} onChange={e => setForm({ ...form, values: { ...form.values, name: e.target.value } })} /></label>
        <label>Descripción<textarea value={form.values.description ?? ''} className={input} onChange={e => setForm({ ...form, values: { ...form.values, description: e.target.value } })} /></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label>Orden<input required type="number" min="1" max="2147483647" step="1" value={form.values.order} className={input} onChange={e => setForm({ ...form, values: { ...form.values, order: Number(e.target.value) } })} /></label>
          <label>Tipo<select disabled={!!form.original} value={form.values.type} className={input} onChange={e => setForm({ ...form, values: { ...form.values, type: e.target.value as EvaluationCriterion['type'] } })}><option value="MANUAL">MANUAL</option><option value="PARTICIPACION_ACADEMICA">PARTICIPACIÓN ACADÉMICA (AUTOMÁTICO)</option></select></label></div>
        {form.original ? <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Activo</label> : <p>El criterio se crea activo.</p>}
        <p className="font-normal">El tipo, el curso y el periodo no se pueden cambiar al editar. PA se obtiene de actividades calificadas; no se ingresa manualmente.</p>
      </fieldset>
      {actionError && <p role="alert" className="text-rose-700">{actionError}</p>}
      <div className="flex gap-3"><button type="submit" disabled={busy || loading || !response} className={`${button} bg-accent text-white hover:bg-accent/90`}>{busy ? 'Guardando...' : 'Guardar criterio'}</button><button type="button" disabled={busy} className={`${button} bg-white border border-line`} onClick={() => { setForm(null); setActionError(null); }}>Cancelar</button></div>
    </form>}
  </section>;
}

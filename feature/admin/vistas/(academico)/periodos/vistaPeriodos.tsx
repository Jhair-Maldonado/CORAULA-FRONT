'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar03Icon, PlusSignIcon } from 'hugeicons-react';
import { AuthContext } from '@/contexts/AuthContext';
import { academicPeriodsLoadErrorMessage, academicPeriodsService, formatPeriodDate } from '@/services/admin/academicPeriodsService';
import {
  academicPeriodActivationErrorMessage, academicPeriodActivationReloads, academicPeriodDependencies, academicPeriodDependencyGuide,
} from '@/services/admin/academicPeriodActivationErrors';
import type { AcademicPeriod, AcademicPeriodActivationAction, AcademicPeriodDependency } from '@/types/academicPeriodApi';
import AcademicPeriodForm from './AcademicPeriodForm';
import AcademicPeriodActivationDialog, { academicPeriodActivationLabels } from './AcademicPeriodActivationDialog';

const button = 'min-h-10 px-4 py-2 rounded-xl text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const badge = 'px-3 py-1 rounded-full border font-bold text-[10px] whitespace-nowrap';

type Activation = { action: AcademicPeriodActivationAction; period: AcademicPeriod };

// ADMINISTRADOR manages; DIRECTIVO reads (the backend GETs accept both, #104).
export default function VistaPeriodos() {
  const auth = useContext(AuthContext);
  if (auth?.status !== 'authenticated' || !auth.sessionValid || (auth.role !== 'ADMINISTRADOR' && auth.role !== 'DIRECTIVO')) {
    return <p role="alert" className="m-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">No tienes acceso a la gestión de periodos académicos.</p>;
  }
  return <AcademicPeriods canManage={auth.role === 'ADMINISTRADOR'} />;
}

function AcademicPeriods({ canManage }: { canManage: boolean }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: AcademicPeriod[]; error?: string } | null>(null);
  const [form, setForm] = useState<{ original?: AcademicPeriod } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Activation | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  // An accepted change is confirmed by the reload of this revision.
  const [outcome, setOutcome] = useState<{ revision: number; id: number; active: boolean; success: string } | null>(null);
  const [failure, setFailure] = useState<{ message: string; name: string; dependencies: AcademicPeriodDependency[] | null } | null>(null);
  const lock = useRef(false), mounted = useRef(true);
  // The dialog that may still be confirmed: cleared by cancel and by the action itself.
  const pendingDialog = useRef<Activation | null>(null);
  const loading = result?.revision !== revision;
  const blocked = loading || busy || !!form || !!dialog;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    academicPeriodsService.list()
      .then(data => { if (current) setResult({ revision, data }); })
      .catch(error => { if (current) setResult({ revision, error: academicPeriodsLoadErrorMessage(error) }); });
    return () => { current = false; };
  }, [revision]);

  function clearMessages() { setNotice(null); setOutcome(null); setFailure(null); }
  function reload() { if (!lock.current) { clearMessages(); setRevision(n => n + 1); } }
  function openActivation(next: Activation) {
    if (lock.current || !canManage || blocked) return;
    clearMessages(); setDialogError(''); pendingDialog.current = next; setDialog(next);
  }
  function closeActivation() { if (!lock.current) { pendingDialog.current = null; setDialog(null); } }

  async function confirmActivation(reason: string) {
    const target = pendingDialog.current;
    if (lock.current || !canManage || !target) return;
    lock.current = true; setBusy(true); setDialogError('');
    try {
      let changed: AcademicPeriod;
      try {
        changed = await academicPeriodsService[target.action](target.period.id, reason);
      } catch (cause) {
        if (!mounted.current) return;
        const message = academicPeriodActivationErrorMessage(cause);
        // 400/401/403 keep the dialog; anything else, even an ambiguous outcome, reloads once and never retries.
        if (!academicPeriodActivationReloads(cause)) { setDialogError(message); return; }
        pendingDialog.current = null; setDialog(null);
        setFailure({ message, name: target.period.name, dependencies: academicPeriodDependencies(cause) });
        setRevision(n => n + 1);
        return;
      }
      if (!mounted.current) return;
      pendingDialog.current = null; setDialog(null);
      const next = revision + 1;
      setOutcome({ revision: next, id: changed.id, active: changed.active, success: `Periodo académico «${changed.name}» ${changed.active ? 'reactivado' : 'desactivado'}.` });
      setRevision(next);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const confirmed = outcome && !loading && result?.revision === outcome.revision && result.data
    ? result.data.some(period => period.id === outcome.id && period.active === outcome.active) : null;

  return <div className="w-full min-h-full bg-canvas p-6 md:p-8 font-sans flex flex-col gap-6">
    <header className="bg-white rounded-2xl border border-line p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl md:text-2xl font-bold text-ink flex items-center gap-3"><Calendar03Icon className="text-accent" aria-hidden="true" />Periodos académicos</h1><p className="text-xs text-muted mt-2">Años escolares y sus fechas. Las fechas son inclusivas.{canManage ? '' : ' Acceso DIRECTIVO: solo lectura.'}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading || busy} onClick={reload} className={`${button} bg-white border border-line hover:bg-neutral`}>Actualizar</button>
        {canManage && <button type="button" disabled={blocked} onClick={() => { clearMessages(); setForm({}); }} className={`${button} bg-accent text-white flex items-center gap-2 hover:bg-accent/90`}><PlusSignIcon size={16} aria-hidden="true" />Crear periodo</button>}
      </div>
    </header>
    {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
    {outcome && confirmed === true && <p role="status" className="text-xs text-emerald-700">{outcome.success} Estado confirmado mediante recarga.</p>}
    {outcome && confirmed === false && <p role="alert" className="text-xs text-rose-700">El servidor aceptó el cambio, pero la lista recargada no lo refleja. Actualiza la lista antes de continuar.</p>}
    {failure && <DependencyFailure {...failure} />}
    <section className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
      {loading ? <p role="status" className="p-6 text-xs text-muted">Cargando periodos académicos...</p>
        : result?.error ? <div role="alert" className="p-6 text-xs text-rose-700"><p>{result.error}</p><button type="button" className={`${button} bg-accent text-white mt-3`} disabled={busy} onClick={reload}>Reintentar</button></div>
        : !result?.data?.length ? <p className="p-6 text-xs text-muted text-center">No hay periodos académicos registrados.</p>
        : <div className="overflow-x-auto"><table className="w-full text-left text-xs">
          <thead className="bg-neutral/40 text-muted uppercase text-[10px] tracking-wider"><tr>{['Nombre', 'Fechas', 'Estado', ...(canManage ? ['Acciones'] : [])].map(title => <th scope="col" key={title} className="p-4 border-b border-line">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {result.data.map(period => <tr key={period.id}>
              <th scope="row" className="p-4 font-bold text-ink break-words">{period.name}</th>
              <td className="p-4 whitespace-nowrap"><time dateTime={period.startDate}>{formatPeriodDate(period.startDate)}</time> — <time dateTime={period.endDate}>{formatPeriodDate(period.endDate)}</time></td>
              <td className="p-4"><div className="flex flex-wrap gap-2">
                {period.current && <span className={`${badge} bg-emerald-50 text-emerald-700 border-emerald-200`}>Vigente</span>}
                <span className={`${badge} ${period.active ? 'bg-accent-soft text-accent border-accent/20' : 'bg-neutral text-muted border-line'}`}>{period.active ? 'Activo' : 'Inactivo'}</span>
              </div></td>
              {canManage && <td className="p-4"><div className="flex flex-wrap gap-2">
                <button type="button" disabled={blocked} onClick={() => { clearMessages(); setForm({ original: period }); }} className={`${button} bg-white border border-line hover:bg-neutral`}>Editar</button>
                {period.active
                  ? <button type="button" disabled={blocked} onClick={() => openActivation({ action: 'deactivate', period })} className={`${button} bg-white border border-rose-200 text-rose-700 hover:bg-rose-50`}>{academicPeriodActivationLabels.deactivate.button}</button>
                  : <button type="button" disabled={blocked} onClick={() => openActivation({ action: 'reactivate', period })} className={`${button} bg-white border border-line hover:bg-neutral`}>{academicPeriodActivationLabels.reactivate.button}</button>}
              </div></td>}
            </tr>)}
          </tbody>
        </table></div>}
    </section>
    {canManage && form && <AcademicPeriodForm original={form.original} onCancel={() => setForm(null)} onSaved={saved => {
      setForm(null);
      setNotice(`Periodo académico «${saved.name}» guardado.`);
      setRevision(n => n + 1);
    }} />}
    {canManage && dialog && <AcademicPeriodActivationDialog key={`${dialog.action}-${dialog.period.id}`} action={dialog.action} period={dialog.period} busy={busy} error={dialogError}
      onCancel={closeActivation} onConfirm={reason => { void confirmActivation(reason); }} />}
  </div>;
}

function DependencyFailure({ message, name, dependencies }: { message: string; name: string; dependencies: AcademicPeriodDependency[] | null }) {
  return <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs shadow-sm flex flex-col gap-3">
    <p className="font-medium leading-relaxed break-words">{message}</p>
    {dependencies && <>
      <p className="font-bold break-words">Registros activos que impiden desactivar «{name}»:</p>
      <ul className="flex flex-col gap-2">
        {dependencies.map(dependency => {
          const guide = academicPeriodDependencyGuide[dependency.type];
          const more = dependency.count - dependency.ids.length;
          return <li key={dependency.type} className="p-3 rounded-xl bg-white border border-rose-200 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold">{guide.label}: {dependency.count}</p>
              {dependency.ids.length > 0 && <p className="text-muted break-words">IDs: {dependency.ids.join(', ')}{dependency.truncated && more > 0 ? ` y ${more} más` : dependency.truncated ? ' y otros' : ''}</p>}
              <p>{guide.hint}</p>
            </div>
            <Link href={guide.href} className={`${button} bg-white border border-line text-ink hover:bg-neutral`}>{guide.link}</Link>
          </li>;
        })}
      </ul>
    </>}
  </div>;
}

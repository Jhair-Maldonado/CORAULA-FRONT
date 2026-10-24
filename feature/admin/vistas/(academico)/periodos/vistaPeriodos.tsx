'use client';

import { useContext, useEffect, useState } from 'react';
import { Calendar03Icon, PlusSignIcon } from 'hugeicons-react';
import { AuthContext } from '@/contexts/AuthContext';
import { academicPeriodsLoadErrorMessage, academicPeriodsService, formatPeriodDate } from '@/services/admin/academicPeriodsService';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import AcademicPeriodForm from './AcademicPeriodForm';

const button = 'min-h-10 px-4 py-2 rounded-xl text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const badge = 'px-3 py-1 rounded-full border font-bold text-[10px] whitespace-nowrap';

export default function VistaPeriodos() {
  const auth = useContext(AuthContext);
  if (auth?.status !== 'authenticated' || !auth.sessionValid || auth.role !== 'ADMINISTRADOR') {
    return <p role="alert" className="m-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">No tienes acceso a la gestión de periodos académicos.</p>;
  }
  return <AcademicPeriods />;
}

function AcademicPeriods() {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: AcademicPeriod[]; error?: string } | null>(null);
  const [form, setForm] = useState<{ original?: AcademicPeriod } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loading = result?.revision !== revision;

  useEffect(() => {
    let current = true;
    academicPeriodsService.list()
      .then(data => { if (current) setResult({ revision, data }); })
      .catch(error => { if (current) setResult({ revision, error: academicPeriodsLoadErrorMessage(error) }); });
    return () => { current = false; };
  }, [revision]);

  return <div className="w-full min-h-full bg-canvas p-6 md:p-8 font-sans flex flex-col gap-6">
    <header className="bg-white rounded-2xl border border-line p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl md:text-2xl font-bold text-ink flex items-center gap-3"><Calendar03Icon className="text-accent" aria-hidden="true" />Periodos académicos</h1><p className="text-xs text-muted mt-2">Años escolares y sus fechas. Las fechas son inclusivas.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading} onClick={() => { setNotice(null); setRevision(n => n + 1); }} className={`${button} bg-white border border-line hover:bg-neutral`}>Actualizar</button>
        <button type="button" disabled={loading || !!form} onClick={() => { setNotice(null); setForm({}); }} className={`${button} bg-accent text-white flex items-center gap-2 hover:bg-accent/90`}><PlusSignIcon size={16} aria-hidden="true" />Crear periodo</button>
      </div>
    </header>
    {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
    <section className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
      {loading ? <p role="status" className="p-6 text-xs text-muted">Cargando periodos académicos...</p>
        : result?.error ? <div role="alert" className="p-6 text-xs text-rose-700"><p>{result.error}</p><button type="button" className={`${button} bg-accent text-white mt-3`} onClick={() => setRevision(n => n + 1)}>Reintentar</button></div>
        : !result?.data?.length ? <p className="p-6 text-xs text-muted text-center">No hay periodos académicos registrados.</p>
        : <div className="overflow-x-auto"><table className="w-full text-left text-xs">
          <thead className="bg-neutral/40 text-muted uppercase text-[10px] tracking-wider"><tr>{['Nombre', 'Fechas', 'Estado', 'Acciones'].map(title => <th scope="col" key={title} className="p-4 border-b border-line">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {result.data.map(period => <tr key={period.id}>
              <th scope="row" className="p-4 font-bold text-ink break-words">{period.name}</th>
              <td className="p-4 whitespace-nowrap"><time dateTime={period.startDate}>{formatPeriodDate(period.startDate)}</time> — <time dateTime={period.endDate}>{formatPeriodDate(period.endDate)}</time></td>
              <td className="p-4"><div className="flex flex-wrap gap-2">
                {period.current && <span className={`${badge} bg-emerald-50 text-emerald-700 border-emerald-200`}>Vigente</span>}
                <span className={`${badge} ${period.active ? 'bg-accent-soft text-accent border-accent/20' : 'bg-neutral text-muted border-line'}`}>{period.active ? 'Activo' : 'Inactivo'}</span>
              </div></td>
              <td className="p-4"><button type="button" disabled={!!form} onClick={() => { setNotice(null); setForm({ original: period }); }} className={`${button} bg-white border border-line hover:bg-neutral`}>Editar</button></td>
            </tr>)}
          </tbody>
        </table></div>}
    </section>
    {form && <AcademicPeriodForm original={form.original} onCancel={() => setForm(null)} onSaved={saved => {
      setForm(null);
      setNotice(`Periodo académico «${saved.name}» guardado.`);
      setRevision(n => n + 1);
    }} />}
  </div>;
}

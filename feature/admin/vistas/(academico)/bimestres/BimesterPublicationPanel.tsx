'use client';

import { useEffect, useRef, useState } from 'react';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionCoursesService } from '@/services/admin/sectionCoursesService';
import {
  bimesterPublicationService, hasPublicationPendings, maxReopenReasonLength, publicationActionErrorMessage, publicationReadErrorMessage,
  publicationReasonLabel, reopenReasonError, type PublicationAction,
} from '@/services/admin/bimesterPublicationService';
import { publishedAtLabel } from '@/components/evaluation/ResultadosBimestre';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';
import type { BimesterPublicationView, PublicationPending } from '@/types/bimesterPublicationApi';
import { SectionDialog, buttonClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, destructiveButtonClass, Failure } from '../secciones/sectionUi';

const dangerButtonClass = `${buttonClass} bg-rose-700 text-white border-rose-700 hover:bg-rose-800`;
type Names = { sections: Map<number, string>; courses: Map<number, { label: string; sectionId: number }> };
type Read = { revision: number; data?: BimesterPublicationView; error?: string };

const sectionLabel = (s: { level: string; grade: number; name: string }) => `${s.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · ${s.grade}° ${s.name}`;
async function loadNames(academicPeriodId: number): Promise<Names> {
  const sections = await sectionsService.list({ academicPeriodId });
  const names: Names = { sections: new Map(sections.map(s => [s.id, sectionLabel(s)])), courses: new Map() };
  const lists = await Promise.all(sections.map(s => sectionCoursesService.list(s.id)));
  lists.flat().forEach(sc => names.courses.set(sc.id, { label: `${sc.courseName} · ${names.sections.get(sc.sectionId) ?? `Sección #${sc.sectionId}`}`, sectionId: sc.sectionId }));
  return names;
}

const confirmations: Record<PublicationAction, { title: string; success: (name: string) => string; reached: (view: BimesterPublicationView) => boolean }> = {
  review: { title: 'Pasar el bimestre a revisión', success: name => `${name} está En revisión. Estado confirmado mediante recarga.`, reached: v => v.status === 'EN_REVISION' },
  publish: { title: 'Publicar el bimestre', success: name => `${name} quedó publicado. Publicación confirmada mediante recarga.`, reached: v => v.status === 'CERRADO' && v.publishedAt !== null },
  reopen: { title: 'Reabrir el bimestre', success: name => `${name} volvió a Abierto. Estado confirmado mediante recarga.`, reached: v => v.status === 'ABIERTO' },
};

// #51-A institutional review/publication and #100 reopening. ADMINISTRADOR acts; DIRECTIVO reads.
export default function BimesterPublicationPanel({ bimester, canManage, locked, onClose, onChanged, onBusyChange }: {
  bimester: Bimester; canManage: boolean; locked: boolean;
  onClose: () => void; onChanged: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [read, setRead] = useState<Read>();
  const [names, setNames] = useState<Names | null>(null);
  const [namesFailed, setNamesFailed] = useState(false);
  const [dialog, setDialog] = useState<{ action: PublicationAction; view: BimesterPublicationView } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false), mounted = useRef(true);
  // The dialog that may still be confirmed: cleared by cancel, refresh and the action itself.
  const pendingDialog = useRef<{ action: PublicationAction; view: BimesterPublicationView } | null>(null);
  const loading = read?.revision !== revision;
  const data = loading ? undefined : read?.data;
  const pendings = data ? hasPublicationPendings(data) : true;
  const inactive = busy || locked || loading || !data || refreshRequired;
  // /review and /publish are rejected with pendings (backend requireReady); the backend still decides.
  const allowed: Record<PublicationAction, boolean> = {
    review: canManage && !inactive && data?.status === 'ABIERTO' && !pendings,
    publish: canManage && !inactive && data?.status === 'EN_REVISION' && data.publishedAt === null && !pendings && !!data.preparationRevision,
    reopen: canManage && !inactive && data?.status === 'EN_REVISION' && data?.publishedAt === null,
  };

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const abort = new AbortController();
    bimesterPublicationService.getPublication(bimester.id, abort.signal)
      .then(view => { if (!abort.signal.aborted) setRead({ revision, data: view }); })
      .catch(failure => { if (!abort.signal.aborted) setRead({ revision, error: publicationReadErrorMessage(failure) }); });
    return () => abort.abort();
  }, [bimester.id, revision]);
  useEffect(() => {
    let current = true;
    loadNames(bimester.academicPeriodId).then(value => { if (current) setNames(value); }).catch(() => { if (current) setNamesFailed(true); });
    return () => { current = false; };
  }, [bimester.academicPeriodId]);

  function closeDialog() { if (!lock.current) { pendingDialog.current = null; setDialog(null); } }
  function refresh() {
    if (lock.current) return;
    pendingDialog.current = null; setDialog(null); setError(''); setNotice(''); setRefreshRequired(false); setRevision(n => n + 1);
  }
  function open(action: PublicationAction) {
    if (lock.current || !data || !allowed[action]) return;
    const next = { action, view: data };
    pendingDialog.current = next; setDialog(next); setError(''); setNotice('');
  }
  async function run(action: PublicationAction, post: (view: BimesterPublicationView) => Promise<unknown>) {
    // Only the view shown when the dialog opened may be acted upon; a reload or cancel invalidates it.
    const target = pendingDialog.current;
    if (lock.current || !canManage || locked || !target || target.action !== action) return;
    lock.current = true; pendingDialog.current = null; setDialog(null); setBusy(true); onBusyChange(true); setError(''); setNotice(''); setRefreshRequired(true);
    let accepted = false, failure = '';
    try {
      try { await post(target.view); accepted = true; } catch (cause) { failure = publicationActionErrorMessage(cause, action); }
      // Any outcome, even an ambiguous one, is followed by reads; nothing is retried.
      onChanged();
      try {
        const view = await bimesterPublicationService.getPublication(bimester.id);
        if (!mounted.current) return;
        setRead({ revision, data: view });
        const reached = confirmations[action].reached(view);
        setRefreshRequired(accepted && !reached);
        if (accepted && reached) setNotice(confirmations[action].success(bimester.name));
        else setError(failure || 'El servidor aceptó la operación, pero la recarga no la confirmó. Actualiza el panel.');
      } catch {
        if (mounted.current) setError(`${failure || 'El servidor aceptó la operación.'} No se pudo recargar el panel; actualízalo antes de continuar.`);
      }
    } finally { lock.current = false; onBusyChange(false); if (mounted.current) setBusy(false); }
  }

  return <section aria-labelledby="publication-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-6 shadow-sm flex flex-col gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="publication-title" className="text-base font-bold text-ink">Publicación · {bimester.name}</h2>
        <p className="text-xs text-muted mt-1">{canManage ? 'Revisión y publicación institucional del bimestre.' : 'Acceso DIRECTIVO: solo lectura.'}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy || loading} onClick={refresh}>Actualizar panel</button>
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => { if (!lock.current) onClose(); }}>Cerrar panel</button>
      </div>
    </div>
    {loading ? <p role="status" className="text-xs text-muted">Consultando el estado de publicación...</p>
      : read?.error ? <Failure message={read.error} retry={refresh} />
      : data && <>
        <PublicationSummary view={data} />
        {canManage && <div className="flex flex-wrap gap-2">
          {data.status === 'ABIERTO' && <button type="button" className={primaryButtonClass} disabled={!allowed.review} onClick={() => open('review')}>Pasar a revisión</button>}
          {data.status === 'EN_REVISION' && data.publishedAt === null && <>
            <button type="button" className={dangerButtonClass} disabled={!allowed.publish} onClick={() => open('publish')}>Publicar</button>
            <button type="button" className={destructiveButtonClass} disabled={!allowed.reopen} onClick={() => open('reopen')}>Reabrir</button>
          </>}
        </div>}
        {canManage && pendings && (data.status === 'ABIERTO' || (data.status === 'EN_REVISION' && data.publishedAt === null)) &&
          <p role="note" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{data.status === 'ABIERTO'
            ? 'No se puede pasar a revisión mientras haya cursos sin registro final o resultados pendientes. Complétalos y actualiza el panel.'
            : 'No se puede publicar mientras haya pendientes. Puedes reabrir el bimestre para que los docentes los completen.'}</p>}
        {data.publishedAt === null && <PublicationCourses view={data} names={names} namesFailed={namesFailed} />}
      </>}
    {busy && <p role="status" className="text-xs text-muted">Procesando y consultando el estado de publicación...</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {refreshRequired && !busy && <p role="alert" className="text-xs text-rose-700">Actualiza el panel antes de otra operación.</p>}
    {dialog?.action === 'review' && <ReviewDialog name={bimester.name} onCancel={closeDialog} onConfirm={() => { void run('review', () => bimesterPublicationService.review(bimester.id)); }} />}
    {dialog?.action === 'publish' && <PublishDialog name={bimester.name} view={dialog.view} onCancel={closeDialog}
      onConfirm={() => { void run('publish', view => bimesterPublicationService.publish(bimester.id, view.preparationRevision ?? '')); }} />}
    {dialog?.action === 'reopen' && <ReopenDialog name={bimester.name} onCancel={closeDialog} onConfirm={reason => { void run('reopen', () => bimesterPublicationService.reopen(bimester.id, reason)); }} />}
  </section>;
}

function PublicationSummary({ view }: { view: BimesterPublicationView }) {
  const applicable = view.courses.filter(c => c.applicable);
  return <div className="flex flex-col gap-2 text-xs">
    <p><span className="font-bold">Estado:</span> {bimesterStatusLabels[view.status]}</p>
    {view.publishedAt !== null
      ? <p className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold">Publicado el <time dateTime={view.publishedAt}>{publishedAtLabel(view.publishedAt)}</time> · revisión {view.revision}. La publicación es definitiva; las correcciones posteriores del Director quedan auditadas e incrementan la revisión.</p>
      : <p className="text-muted">{view.status === 'CERRADO' ? 'Cerrado sin publicación.' : 'Sin publicar.'} Cursos registrados: {applicable.filter(c => c.registered).length}/{applicable.length} · Pendientes: {view.details.length}.</p>}
  </div>;
}

function PublicationCourses({ view, names, namesFailed }: { view: BimesterPublicationView; names: Names | null; namesFailed: boolean }) {
  const courseName = (id: number) => names?.courses.get(id)?.label ?? `Curso-sección #${id}`;
  const known = new Set(view.courses.map(c => c.sectionCourseId));
  const byCourse = new Map<number, PublicationPending[]>();
  const institutional: PublicationPending[] = [];
  for (const p of view.details) {
    if (p.sectionCourseId !== null && known.has(p.sectionCourseId)) byCourse.set(p.sectionCourseId, [...byCourse.get(p.sectionCourseId) ?? [], p]);
    else institutional.push(p);
  }
  const reason = (p: PublicationPending) => p.reasons.map(r => publicationReasonLabel(r, id => names?.sections.get(id))).join('; ');
  const rows = [...view.courses].sort((a, b) => courseName(a.sectionCourseId).localeCompare(courseName(b.sectionCourseId), 'es') || a.sectionCourseId - b.sectionCourseId);
  return <div className="flex flex-col gap-3">
    {namesFailed && <p className="text-xs text-muted">No se pudieron cargar los nombres de las secciones; se muestran sus identificadores.</p>}
    {!rows.length ? <p className="text-xs text-muted">No hay cursos-sección activos en el periodo.</p>
      : <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-neutral/40 text-muted"><tr>
        <th scope="col" className="p-3">Curso-sección</th><th scope="col" className="p-3">Registro final</th><th scope="col" className="p-3">Pendientes</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map(c => {
          const items = byCourse.get(c.sectionCourseId) ?? [];
          return <tr key={c.sectionCourseId}><th scope="row" className="p-3">{courseName(c.sectionCourseId)}</th>
            <td className="p-3">{!c.applicable ? 'Sin alumnos (no aplica)' : c.registered ? <>Registrado{c.registeredAt && <> el <time dateTime={c.registeredAt}>{publishedAtLabel(c.registeredAt)}</time></>}</> : <strong className="text-rose-700">Sin registro final</strong>}</td>
            <td className="p-3">{items.length ? <ul className="flex flex-col gap-1">{items.map((p, i) => <li key={i}>{p.enrollmentId !== null ? `Matrícula #${p.enrollmentId}: ` : ''}{reason(p)}</li>)}</ul> : 'Ninguno'}</td></tr>;
        })}</tbody></table></div>}
    {institutional.length > 0 && <div><h3 className="text-xs font-bold">Institución</h3><ul className="text-xs flex flex-col gap-1 mt-2">
      {institutional.map((p, i) => <li key={i}>{p.sectionCourseId !== null ? `${courseName(p.sectionCourseId)}: ` : ''}{p.enrollmentId !== null ? `Matrícula #${p.enrollmentId}: ` : ''}{reason(p)}</li>)}</ul></div>}
  </div>;
}

function ReviewDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return <SectionDialog title={confirmations.review.title} busy={false} onClose={onCancel}>
    <div className="flex flex-col gap-4">
      <p className="text-sm">Pasar <strong>{name}</strong> a revisión.</p>
      <p className="text-xs text-muted">Los docentes ya no podrán registrar ni corregir notas; las correcciones pasan al Director, con motivo. Mientras no se publique, podrás reabrir el bimestre.</p>
      <div className="flex justify-end gap-2"><button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
        <button type="button" className={primaryButtonClass} onClick={onConfirm}>Confirmar paso a revisión</button></div>
    </div>
  </SectionDialog>;
}

function PublishDialog({ name, view, onCancel, onConfirm }: { name: string; view: BimesterPublicationView; onCancel: () => void; onConfirm: () => void }) {
  const [understood, setUnderstood] = useState(false);
  const [validation, setValidation] = useState('');
  const applicable = view.courses.filter(c => c.applicable);
  return <SectionDialog title={confirmations.publish.title} busy={false} onClose={onCancel}>
    <form aria-label="Publicación del bimestre" noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      if (!understood) { setValidation('Confirma que entiendes que la publicación es definitiva.'); return; }
      onConfirm();
    }}>
      <p className="text-sm">Publicar <strong>{name}</strong>: cursos registrados {applicable.filter(c => c.registered).length}/{applicable.length}, sin pendientes.</p>
      <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">La publicación es definitiva: el bimestre queda Cerrado y no se puede reabrir. Las libretas usarán estos resultados; las correcciones posteriores quedan auditadas.</p>
      <label className="text-xs font-bold text-rose-800 flex gap-2 items-center"><input aria-label="Entiendo que la publicación es definitiva" type="checkbox" checked={understood} onChange={event => { setUnderstood(event.target.checked); setValidation(''); }} />Entiendo que la publicación es definitiva.</label>
      {validation && <Failure message={validation} />}
      <div className="flex justify-end gap-2"><button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={dangerButtonClass}>Confirmar publicación</button></div>
    </form>
  </SectionDialog>;
}

function ReopenDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  return <SectionDialog title={confirmations.reopen.title} busy={false} onClose={onCancel}>
    <form aria-label="Reapertura del bimestre" noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      const invalid = reopenReasonError(reason);
      if (invalid) { setValidation(invalid); return; }
      onConfirm(reason.trim());
    }}>
      <p className="text-sm">Reabrir <strong>{name}</strong>: vuelve a Abierto para que los docentes completen o corrijan notas.</p>
      <p className="text-xs text-muted">Las notas y los registros de los docentes se conservan; un cambio posterior invalida el registro del curso afectado. El motivo queda en auditoría.</p>
      <label className={labelClass}>Motivo de la reapertura<textarea tabIndex={0} aria-label="Motivo de la reapertura" aria-describedby="reopen-reason-help" required rows={3} maxLength={maxReopenReasonLength} value={reason}
        className={`${inputClass} normal-case tracking-normal`} onChange={event => { setReason(event.target.value); setValidation(''); }} /></label>
      <p id="reopen-reason-help" className="text-xs text-muted">Obligatorio; máximo {maxReopenReasonLength} caracteres ({reason.trim().length}/{maxReopenReasonLength}).</p>
      {validation && <Failure message={validation} />}
      <div className="flex justify-end gap-2"><button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={destructiveButtonClass}>Confirmar reapertura</button></div>
    </form>
  </SectionDialog>;
}

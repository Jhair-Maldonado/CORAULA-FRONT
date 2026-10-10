'use client';

import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { teacherGradesService, teacherGradesErrorMessage } from '@/services/teacher/teacherGradesService';
import { activityTitleError, isAmbiguousActivityCreation, teacherActivitiesErrorMessage, teacherActivitiesService } from '@/services/teacher/teacherActivitiesService';
import { ACADEMIC_ACTIVITY_TYPES } from '@/types/teacherActivitiesApi';
import type { AcademicActivity, ActivityContext, CreateAcademicActivityRequest } from '@/types/teacherActivitiesApi';
import type { Bimester } from '@/types/evaluationApi';

const button = 'min-h-10 px-3 py-2 rounded-lg border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';
const input = 'w-full mt-2 p-3 rounded-lg border border-line bg-neutral/30 text-ink focus-visible:outline-accent';
type Result<T> = { key: string; data?: T; error?: string };
const emptyForm: CreateAcademicActivityRequest = { title: '', description: null, type: 'TAREA', cuentaParaPa: false };

export default function ActividadesDocente({ sectionCourseId }: { sectionCourseId: number }) {
  return <CourseActivities key={sectionCourseId} sectionCourseId={sectionCourseId} />;
}
function CourseActivities({ sectionCourseId }: { sectionCourseId: number }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<Bimester[]> | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const generation = useRef(0);
  const [epoch, setEpoch] = useState(0);
  const key = String(revision);
  const valid = Number.isSafeInteger(sectionCourseId) && sectionCourseId > 0;
  const loading = valid && result?.key !== key;
  const bimesters = !loading ? result?.data : undefined;
  const bimester = bimesters?.find(b => String(b.id) === selected);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    let current = true;
    teacherGradesService.getBimesters(sectionCourseId, controller.signal)
      .then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: teacherGradesErrorMessage(error) }); });
    return () => { current = false; controller.abort(); };
  }, [sectionCourseId, valid, key]);
  return <section className="bg-white p-5 sm:p-6 rounded-xl border border-line shadow-sm min-w-0" aria-labelledby="activities-title">
    <h2 id="activities-title" className="text-sm font-bold text-ink pb-3 border-b border-line">Actividades académicas</h2>
    <p className="text-xs text-muted mt-3">Prepara actividades para este curso y sección. Cuenta para PA es una configuración futura; no calcula calificaciones.</p>
    {!valid ? <p role="alert">Selecciona un curso asignado válido.</p> : loading ? <p role="status" className="py-4 text-sm text-muted">Cargando bimestres...</p>
      : result?.error ? <div role="alert" className="mt-4 text-sm text-rose-700"><p>{result.error}</p><button type="button" className={`${button} bg-white mt-3`} onClick={() => setRevision(n => n + 1)}>Reintentar bimestres</button></div>
      : bimesters?.length === 0 ? <p className="py-4 text-sm text-muted">No hay bimestres disponibles para este curso.</p>
      : <label className="block max-w-sm mt-4 text-xs font-bold text-muted">Bimestre<select aria-label="Bimestre de actividades" value={selected} disabled={busy} className={input} onChange={e => { setEpoch(++generation.current); setSelected(e.target.value); }}><option value="">Selecciona un bimestre</option>{bimesters?.map(b => <option key={b.id} value={b.id}>{b.name} · {b.status}</option>)}</select></label>}
    {bimester ? <ActivitySheet key={`${bimester.id}:${epoch}`} context={{ sectionCourseId, bimesterId: bimester.id }} parentBusy={busy} lockRef={mutationLock} generationRef={generation} epoch={epoch} setParentBusy={setBusy} /> : !loading && !result?.error && !!bimesters?.length && <p className="mt-4 text-sm text-muted">Elige un bimestre para consultar sus actividades.</p>}
  </section>;
}

function ActivitySheet({ context, parentBusy, lockRef, generationRef, epoch, setParentBusy }: { context: ActivityContext; parentBusy: boolean; lockRef: MutableRefObject<boolean>; generationRef: MutableRefObject<number>; epoch: number; setParentBusy: (busy: boolean) => void }) {
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<Result<AcademicActivity[]> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const [detail, setDetail] = useState<Result<AcademicActivity> | null>(null);
  const mounted = useRef(true);
  const key = String(revision), detailKey = JSON.stringify([selectedId, detailRevision]);
  const loading = list?.key !== key;
  const titleError = activityTitleError(form.title);
  const disabled = busy || parentBusy || loading || !!list?.error || ambiguous || refreshRequired;
  const { sectionCourseId, bimesterId } = context;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    teacherActivitiesService.getActivities({ sectionCourseId, bimesterId }, controller.signal)
      .then(data => { if (current) { setList({ key, data }); setRefreshRequired(false); } })
      .catch(error => { if (current) setList({ key, error: teacherActivitiesErrorMessage(error) }); });
    return () => { current = false; controller.abort(); };
  }, [sectionCourseId, bimesterId, key]);
  useEffect(() => {
    if (selectedId === null) return;
    let current = true;
    const controller = new AbortController();
    teacherActivitiesService.getActivity({ sectionCourseId, bimesterId }, selectedId, controller.signal)
      .then(data => { if (current) setDetail({ key: detailKey, data }); })
      .catch(error => { if (current) setDetail({ key: detailKey, error: teacherActivitiesErrorMessage(error) }); });
    return () => { current = false; controller.abort(); };
  }, [sectionCourseId, bimesterId, selectedId, detailKey]);

  async function createActivity() {
    if (!mounted.current || generationRef.current !== epoch || lockRef.current || disabled || titleError) return;
    lockRef.current = true; setBusy(true); setParentBusy(true); setError(null); setNotice(null); setRefreshRequired(true);
    let saved: AcademicActivity | null = null, failure: string | null = null;
    try {
      try { saved = await teacherActivitiesService.createActivity(context, form); }
      catch (error) {
        failure = teacherActivitiesErrorMessage(error);
        if (mounted.current && generationRef.current === epoch && isAmbiguousActivityCreation(error)) setAmbiguous(true);
      }
      try {
        const rows = await teacherActivitiesService.getActivities(context);
        if (!mounted.current || generationRef.current !== epoch) return;
        setList({ key, data: rows });
        const savedId = saved?.id;
        const confirmed = savedId !== undefined && rows.some(a => a.id === savedId);
        setRefreshRequired(!!saved && !confirmed);
        if (saved && !confirmed) setAmbiguous(true);
        if (saved && confirmed) { setNotice(`Actividad «${saved.title}» creada en estado PLANIFICADA y confirmada en el listado.`); setForm(emptyForm); }
        else setError(failure ?? 'El servidor aceptó la actividad, pero no se confirmó en el listado. Actualiza antes de continuar.');
      } catch {
        if (mounted.current && generationRef.current === epoch) { if (saved) setAmbiguous(true); setError(`${failure ?? 'El servidor aceptó la actividad.'} No se pudo recargar el listado. Actualiza antes de continuar.`); }
      }
    } finally { lockRef.current = false; setParentBusy(false); if (mounted.current) setBusy(false); }
  }
  function refresh() { if (!lockRef.current) { setSelectedId(null); setNotice(null); setRevision(n => n + 1); } }
  return <div className="flex flex-col gap-5 mt-5">
    <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="text-sm font-bold text-ink">Actividades del bimestre</h3><button type="button" disabled={busy || loading} className={`${button} bg-white hover:bg-neutral`} onClick={refresh}>Actualizar actividades</button></div>
    {loading ? <p role="status" className="text-sm text-muted">Cargando actividades...</p> : list?.error ? <div role="alert" className="text-sm text-rose-700"><p>{list.error}</p><button type="button" disabled={busy} className={`${button} bg-white mt-3`} onClick={refresh}>Reintentar actividades</button></div>
      : list?.data?.length === 0 ? <p className="p-5 text-sm text-muted border border-dashed border-line rounded-xl">No hay actividades registradas en este bimestre.</p>
      : <ul className="flex flex-col gap-3">{list?.data?.map(a => <li key={a.id} className="p-4 bg-neutral/30 border border-line rounded-lg flex flex-wrap justify-between items-start gap-3"><div className="min-w-0"><p className="font-bold text-sm text-ink break-words">{a.title}</p><p className="text-xs text-muted mt-1">{a.type} · {a.status} · Cuenta para PA: {a.cuentaParaPa ? 'Sí' : 'No'}</p><time className="text-xs text-muted" dateTime={a.createdAt}>{a.createdAt}</time></div><button type="button" disabled={busy} className={`${button} bg-white`} onClick={() => setSelectedId(a.id)}>Ver detalle #{a.id}</button></li>)}</ul>}
    {selectedId !== null && <section className="p-4 border border-line rounded-xl" aria-label="Detalle de actividad"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold text-sm text-ink">Detalle de actividad</h3><button type="button" className={`${button} bg-white`} onClick={() => setSelectedId(null)}>Cerrar detalle</button></div>
      {detail?.key !== detailKey ? <p role="status">Cargando detalle...</p> : detail.error ? <div role="alert" className="text-sm text-rose-700"><p>{detail.error}</p><button type="button" className={`${button} bg-white mt-3`} onClick={() => setDetailRevision(n => n + 1)}>Reintentar detalle</button></div> : detail.data && <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs break-words">{Object.entries({ Actividad: `#${detail.data.id} · ${detail.data.title}`, Descripción: detail.data.description ?? 'Sin descripción', Tipo: detail.data.type, Estado: detail.data.status, 'Cuenta para PA': detail.data.cuentaParaPa ? 'Sí' : 'No', 'Curso-sección': detail.data.sectionCourseId, Bimestre: detail.data.bimesterId, 'ID docente creador': detail.data.createdByTeacherId, Creación: detail.data.createdAt, Actualización: detail.data.updatedAt ?? 'Sin actualización' }).map(([label, value]) => <div key={label}><dt className="font-bold text-muted">{label}</dt><dd className="text-ink whitespace-pre-wrap mt-1">{value}</dd></div>)}</dl>}
    </section>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {busy && <p role="status" className="text-sm text-muted">Creando actividad y consultando el listado...</p>}
    {refreshRequired && !busy && <p role="alert" className="text-sm text-rose-700">Actualiza el listado antes de otra creación.</p>}
    {ambiguous && <div role="alert" className="p-4 bg-neutral/40 border border-line rounded-xl text-sm text-ink"><p>La creación no está confirmada. Revisa las actividades antes de enviar otra solicitud; repetirla podría crear un duplicado.</p><button type="button" disabled={busy || loading || !!list?.error || refreshRequired} className={`${button} bg-white mt-3`} onClick={() => { if (!lockRef.current) { setAmbiguous(false); setForm(emptyForm); setError(null); } }}>Revisé el listado; permitir una nueva actividad</button></div>}
    <form onSubmit={e => { e.preventDefault(); void createActivity(); }} className="p-4 sm:p-5 border border-line rounded-xl flex flex-col gap-4" aria-label="Crear actividad académica">
      <h3 className="font-bold text-sm text-ink">Crear actividad</h3>
      <fieldset disabled={disabled} className="flex flex-col gap-4 text-xs font-bold text-muted">
        <label>Título<input aria-label="Título de actividad" required maxLength={255} className={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} aria-invalid={!!form.title && !!titleError} /></label>
        {form.title && titleError && <p role="alert" className="text-rose-700">{titleError}</p>}
        <label>Descripción (opcional)<textarea aria-label="Descripción de actividad" rows={3} className={input} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label>Tipo<select aria-label="Tipo de actividad" className={input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CreateAcademicActivityRequest['type'] })}>{ACADEMIC_ACTIVITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="flex items-center gap-2 min-h-10"><input type="checkbox" checked={form.cuentaParaPa} onChange={e => setForm({ ...form, cuentaParaPa: e.target.checked })} />Cuenta para PA</label>
        <p className="font-normal">La actividad se crea PLANIFICADA. Esta pantalla no publica ni recibe entregas.</p>
      </fieldset>
      <button type="submit" disabled={disabled || !!titleError} className={`${button} bg-accent text-white w-fit`}>Crear actividad</button>
    </form>
  </div>;
}

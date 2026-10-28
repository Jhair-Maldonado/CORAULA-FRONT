'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionCoursesService } from '@/services/admin/sectionCoursesService';
import { evaluationService } from '@/services/admin/evaluationService';
import { adminGradesService, adminGradesErrorMessage, adminGradeCorrectionErrorMessage, correctableBimesterStatuses, correctionError, maxCorrectionReasonLength } from '@/services/admin/adminGradesService';
import type { AdminGradeContext } from '@/services/admin/adminGradesService';
import type { SectionResponse } from '@/types/sectionApi';
import ScheduleDialog from '../../(administrativo)/horario/components/ScheduleDialog';
import ResultadosBimestre from '@/components/evaluation/ResultadosBimestre';

const button = 'min-h-10 px-3 py-2 rounded-xl border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';
const input = 'w-full mt-2 p-3 rounded-xl border border-line bg-neutral/30 text-ink focus-visible:outline-accent';
function useRead<T>(load: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; revision: number; data?: T; error?: string }>();
  const loading = result?.load !== load || result?.revision !== revision;
  useEffect(() => {
    let current = true;
    load().then(data => { if (current) setResult({ load, revision, data }); })
      .catch(error => { if (current) setResult({ load, revision, error: adminGradesErrorMessage(error) }); });
    return () => { current = false; };
  }, [load, revision]);
  return { loading, data: loading ? undefined : result?.data, error: loading ? undefined : result?.error,
    refresh: () => setRevision(n => n + 1), publish: (data: T) => setResult({ load, revision, data }) };
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="p-4 text-sm text-rose-700"><p>{message}</p><button type="button" className={`${button} bg-white mt-3`} onClick={retry}>Reintentar</button></div>;
}
export default function VistaNotasAdmin() {
  const auth = useContext(AuthContext);
  if (auth?.status !== 'authenticated' || !auth.sessionValid || (auth.role !== 'ADMINISTRADOR' && auth.role !== 'DIRECTIVO')) return <p role="alert">No tienes acceso a la planilla administrativa.</p>;
  return <NotesContexts key={auth.role} canCorrect={auth.role === 'ADMINISTRADOR'} />;
}
function NotesContexts({ canCorrect }: { canCorrect: boolean }) {
  const load = useCallback(() => sectionsService.list({ active: true }), []);
  const sections = useRead(load);
  const [selected, setSelected] = useState('');
  const generation = useRef(0);
  const [epoch, setEpoch] = useState(0);
  const section = sections.data?.find(s => String(s.id) === selected && s.active);
  return <div className="bg-canvas p-6 md:p-8 font-sans text-ink flex flex-col gap-5">
    <header className="bg-white rounded-2xl p-6 border border-line shadow-sm"><h1 className="text-xl md:text-2xl font-bold">Calificaciones MANUAL</h1><p className="text-xs text-muted mt-2">Consulta de notas e historial. {canCorrect ? 'Las correcciones del Director requieren motivo y un bimestre EN_REVISION o CERRADO.' : 'Acceso DIRECTIVO: solo lectura.'}</p></header>
    <section className="bg-white p-5 rounded-xl border border-line">
      {sections.loading ? <p role="status">Cargando secciones...</p> : sections.error ? <Failure message={sections.error} retry={sections.refresh} /> : !sections.data?.length ? <p>No hay secciones activas.</p>
        : <label className="block max-w-md text-xs font-bold text-muted">Sección<select aria-label="Sección" className={input} value={selected} onChange={e => { setEpoch(++generation.current); setSelected(e.target.value); }}><option value="">Selecciona una sección</option>{sections.data.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · {s.grade}° {s.name} · Periodo {s.academicPeriodId}</option>)}</select></label>}
    </section>
    {section && <SectionContexts key={`${section.id}:${epoch}`} section={section} canCorrect={canCorrect} parentCurrent={() => generation.current === epoch} />}
  </div>;
}
function SectionContexts({ section, canCorrect, parentCurrent }: { section: SectionResponse; canCorrect: boolean; parentCurrent: () => boolean }) {
  const loadCourses = useCallback(() => sectionCoursesService.list(section.id), [section.id]);
  const loadBimesters = useCallback(() => evaluationService.getBimesters(section.academicPeriodId), [section.academicPeriodId]);
  const courses = useRead(loadCourses), bimesters = useRead(loadBimesters);
  const [courseId, setCourseId] = useState(''), [bimesterId, setBimesterId] = useState('');
  const generation = useRef(0), [epoch, setEpoch] = useState(0);
  const course = courses.data?.find(c => String(c.id) === courseId && c.sectionId === section.id && c.active);
  const bimester = bimesters.data?.find(b => String(b.id) === bimesterId && b.academicPeriodId === section.academicPeriodId);
  function change(value: string, setter: (value: string) => void) { setEpoch(++generation.current); setter(value); }
  return <>
    <section className="bg-white p-5 rounded-xl border border-line grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-muted">
      {courses.loading ? <p role="status">Cargando cursos...</p> : courses.error ? <Failure message={courses.error} retry={courses.refresh} /> : <label>Curso-sección<select aria-label="Curso-sección" value={courseId} className={input} onChange={e => change(e.target.value, setCourseId)}><option value="">Selecciona un curso</option>{courses.data?.filter(c => c.active && c.sectionId === section.id).map(c => <option key={c.id} value={c.id}>{c.courseName} · {c.courseCode}</option>)}</select>{!courses.data?.some(c => c.active && c.sectionId === section.id) && <p className="mt-2">No hay cursos activos.</p>}</label>}
      {bimesters.loading ? <p role="status">Cargando bimestres...</p> : bimesters.error ? <Failure message={bimesters.error} retry={bimesters.refresh} /> : <label>Bimestre<select aria-label="Bimestre" value={bimesterId} className={input} onChange={e => change(e.target.value, setBimesterId)}><option value="">Selecciona un bimestre</option>{bimesters.data?.map(b => <option key={b.id} value={b.id}>{b.name} · {b.status}</option>)}</select>{!bimesters.data?.length && <p className="mt-2">No hay bimestres.</p>}</label>}
    </section>
    {course && bimester && <AdminSheet key={`${course.id}:${bimester.id}:${epoch}`} canCorrect={canCorrect} isCurrent={() => parentCurrent() && generation.current === epoch} context={{ sectionCourseId: course.id, courseId: course.courseId, bimesterId: bimester.id, academicPeriodId: section.academicPeriodId }} />}
  </>;
}
type Target = { gradeId: number; grade: number; criterionId: number; enrollmentId: number; student: string; criterion: string };
function AdminSheet({ context, canCorrect, isCurrent }: { context: AdminGradeContext; canCorrect: boolean; isCurrent: () => boolean }) {
  const { sectionCourseId, courseId, bimesterId, academicPeriodId } = context;
  const load = useCallback(() => adminGradesService.getSheet({ sectionCourseId, courseId, bimesterId, academicPeriodId }), [sectionCourseId, courseId, bimesterId, academicPeriodId]);
  const sheet = useRead(load);
  const [target, setTarget] = useState<Target | null>(null), targetRef = useRef<Target | null>(null);
  const [newGrade, setNewGrade] = useState(''), [reason, setReason] = useState('');
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), lock = useRef(false), mounted = useRef(true);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [resultsRevision, setResultsRevision] = useState(0);
  const loadResults = useCallback((signal: AbortSignal) => adminGradesService.getResults(sectionCourseId, bimesterId, signal), [sectionCourseId, bimesterId]);
  const data = sheet.data;
  const disabled = busy || sheet.loading || !!sheet.error || refreshRequired;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function close() { if (!lock.current) { targetRef.current = null; setTarget(null); } }
  function refresh() { if (!lock.current) { close(); setHistoryId(null); setNotice(''); setRefreshRequired(false); sheet.refresh(); setResultsRevision(n => n + 1); } }
  function eligible(t: Target, s = data) {
    const cell = s?.students.find(student => student.enrollmentId === t.enrollmentId)?.grades.find(g => g.criterionId === t.criterionId);
    return canCorrect && !!s && correctableBimesterStatuses.includes(s.bimester.status) && s.criteria.some(c => c.id === t.criterionId && c.type === 'MANUAL' && c.active) && cell?.gradeId === t.gradeId && cell.grade === t.grade;
  }
  async function submit() {
    if (!mounted.current || !isCurrent() || lock.current || disabled || !target || targetRef.current !== target || !eligible(target) || correctionError(newGrade, reason, target.grade)) return;
    const original = target, proposed = Number(newGrade);
    lock.current = true; setBusy(true); targetRef.current = null; setTarget(null); setHistoryId(null); setError(''); setNotice(''); setRefreshRequired(true);
    let accepted = false, failure = '';
    try {
      try {
        const saved = await adminGradesService.correctGrade(original.gradeId, { grade: proposed, reason, expectedGrade: original.grade });
        if (saved.sectionCourseId !== sectionCourseId || saved.bimesterId !== bimesterId || saved.enrollmentId !== original.enrollmentId || saved.criterionId !== original.criterionId) throw new Error('Contexto de corrección inconsistente.');
        accepted = true;
      } catch (error) { failure = adminGradeCorrectionErrorMessage(error); }
      try {
        const reloaded = await load();
        if (!mounted.current || !isCurrent()) return;
        sheet.publish(reloaded);
        const cell = reloaded.students.find(s => s.enrollmentId === original.enrollmentId)?.grades.find(g => g.criterionId === original.criterionId);
        const confirmed = cell?.gradeId === original.gradeId && cell.grade === proposed;
        setRefreshRequired(accepted && !confirmed);
        if (accepted && confirmed) setNotice('Corrección confirmada en la planilla recargada.');
        else setError(failure || 'El servidor aceptó la corrección, pero la nueva nota no se corroboró en la recarga. Actualiza la planilla.');
      } catch {
        if (mounted.current && isCurrent()) setError(`${failure || 'El servidor aceptó la corrección.'} No se pudo recargar la planilla; actualiza antes de continuar.`);
      }
    } finally { lock.current = false; if (mounted.current) { setBusy(false); if (accepted) setResultsRevision(n => n + 1); } }
  }
  const criteria = data?.criteria.filter(c => c.type === 'MANUAL').sort((a, b) => a.order - b.order || a.id - b.id) ?? [];
  return <section className="bg-white rounded-2xl border border-line p-5 shadow-sm flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Planilla {data?.bimester.name} {data && `· ${data.bimester.status}`}</h2><button type="button" disabled={busy || sheet.loading} onClick={refresh} className={`${button} bg-white`}>Actualizar planilla</button></div>
    {sheet.loading ? <p role="status">Cargando planilla...</p> : sheet.error ? <Failure message={sheet.error} retry={refresh} /> : data && <>
      {data.bimester.status === 'ABIERTO' ? <p role="note" className="text-xs text-muted">Mientras el bimestre está abierto, las notas las corrige el docente. El Director corrige en revisión o después del cierre.</p>
        : !correctableBimesterStatuses.includes(data.bimester.status) && <p className="text-xs text-muted">Bimestre de solo lectura: las correcciones del Director requieren EN_REVISION o CERRADO.</p>}
      {!criteria.length && <p className="text-xs text-muted">No hay criterios MANUAL.</p>}
      <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-neutral/40 text-muted"><tr><th scope="col" className="p-3">Estudiante</th>{criteria.map(c => <th key={c.id} scope="col" className="p-3">{c.name}{!c.active && ' (inactivo)'}</th>)}<th scope="col" className="p-3">PA · solo lectura</th></tr></thead><tbody className="divide-y divide-line">{data.students.map(s => <tr key={s.enrollmentId}><th scope="row" className="p-3">{s.fullName}</th>{criteria.map(c => {
        const cell = s.grades.find(g => g.criterionId === c.id);
        const t: Target | null = cell?.gradeId != null && cell.grade != null ? { gradeId: cell.gradeId, grade: cell.grade, criterionId: c.id, enrollmentId: s.enrollmentId, student: s.fullName, criterion: c.name } : null;
        return <td key={c.id} className="p-3"><span>{cell?.grade ?? 'Pendiente'}</span>{t && <div className="flex flex-wrap gap-2 mt-2">{eligible(t) && <button type="button" disabled={disabled} className={`${button} bg-accent text-white`} onClick={() => { if (lock.current || !isCurrent()) return; targetRef.current = t; setTarget(t); setNewGrade(''); setReason(''); setError(''); setNotice(''); }}>Corregir {s.fullName} · {c.name}</button>}<button type="button" disabled={busy} className={`${button} bg-white`} onClick={() => setHistoryId(t.gradeId)}>Historial #{t.gradeId}</button></div>}</td>;
      })}<td className="p-3 text-muted">Pendiente</td></tr>)}</tbody></table></div>
      {!data.students.length && <p className="text-sm text-muted">No hay matrículas activas en esta planilla.</p>}
    </>}
    {busy && <p role="status">Corrigiendo y consultando la planilla...</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {refreshRequired && !busy && <p role="alert" className="text-xs text-rose-700">Actualiza la planilla antes de otra corrección.</p>}
    {target && <ScheduleDialog title="Corregir nota MANUAL" busy={busy} onClose={close}><p className="text-sm">{target.student} · {target.criterion}</p><p className="text-sm mt-2">Nota actual: <strong>{target.grade}</strong></p><form className="flex flex-col gap-4 mt-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <label className="text-xs font-bold">Nueva nota<input aria-label="Nueva nota" required inputMode="decimal" className={input} value={newGrade} onChange={e => setNewGrade(e.target.value)} /></label>
      <label className="text-xs font-bold">Motivo obligatorio<textarea aria-label="Motivo" aria-describedby="correction-reason-help" required rows={3} maxLength={maxCorrectionReasonLength} className={input} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <p id="correction-reason-help" className="text-xs text-muted">Máximo {maxCorrectionReasonLength} caracteres ({reason.trim().length}/{maxCorrectionReasonLength}). Queda en el historial de la nota.</p>
      {correctionError(newGrade, reason, target.grade) && <p role="status" className="text-xs text-muted">{correctionError(newGrade, reason, target.grade)}</p>}
      <div className="flex gap-3"><button type="submit" disabled={disabled || !!correctionError(newGrade, reason, target.grade)} className={`${button} bg-accent text-white`}>Confirmar corrección</button><button type="button" className={`${button} bg-white`} onClick={close}>Cancelar</button></div>
    </form></ScheduleDialog>}
    {data && <ResultadosBimestre load={loadResults} reloadKey={resultsRevision} criterionName={criterionId => data.criteria.find(c => c.id === criterionId)?.name} />}
    {historyId !== null && <GradeHistoryView key={historyId} gradeId={historyId} close={() => setHistoryId(null)} />}
  </section>;
}
function GradeHistoryView({ gradeId, close }: { gradeId: number; close: () => void }) {
  const load = useCallback(() => adminGradesService.getHistory(gradeId), [gradeId]);
  const history = useRead(load);
  return <ScheduleDialog title={`Historial de nota #${gradeId}`} onClose={close}>{history.loading ? <p role="status">Cargando historial...</p> : history.error ? <Failure message={history.error} retry={history.refresh} /> : !history.data?.length ? <p>No hay correcciones registradas.</p> : <ol className="flex flex-col gap-3 text-xs">{history.data.map(h => <li key={h.id} className="p-3 rounded-xl border border-line"><p className="font-bold">{h.previousValue} → {h.newValue}</p><p className="whitespace-pre-wrap break-words mt-2">{h.reason}</p><p className="text-muted mt-2">Usuario #{h.changedByUserId} · <time dateTime={h.occurredAt}>{h.occurredAt}</time></p></li>)}</ol>}</ScheduleDialog>;
}

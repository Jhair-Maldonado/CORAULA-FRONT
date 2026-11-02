'use client';

import { useEffect, useRef, useState } from 'react';
import TablaAlertasTempranas from '@/components/earlyAlerts/TablaAlertasTempranas';
import { EARLY_ALERTS_PAGE_SIZE } from '@/lib/earlyWarningsContract';
import {
  MANAGEMENT_EARLY_ALERTS_EMPTY_MESSAGE, evaluationNotice, isUnconfirmedEvaluation, managementEarlyAlertsErrorCode,
  managementEarlyAlertsErrorMessage, managementEarlyAlertsService,
} from '@/services/admin/managementEarlyAlertsService';
import { EARLY_ALERTS_EMPTY_MESSAGE } from '@/services/teacher/teacherEarlyAlertsService';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionCoursesService } from '@/services/admin/sectionCoursesService';
import type { Bimester } from '@/types/evaluationApi';
import type { EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';
import type { SectionResponse } from '@/types/sectionApi';
import type { SectionCourseResponse } from '@/types/sectionCourseApi';
import { Failure, SectionDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, sectionName } from '../secciones/sectionUi';

type Load<T> = { key: string; data?: T; error?: string };
export const FILTER_SECTIONS_ERROR = 'No se pudieron cargar las secciones del filtro; se muestran todos los cursos.';
export const FILTER_COURSES_ERROR = 'No se pudieron cargar los cursos de la sección; se muestran todos los cursos.';
export const EVALUATION_CONFIRM_MESSAGE = 'Se evaluarán todos los cursos del bimestre. Solo se generan alertas si está abierto y hoy está entre los días 15 y 21 desde su inicio.';

// Early alerts of a bimester for management (BACK #52). ADMINISTRADOR and DIRECTIVO read them, optionally
// filtered by course-section; only ADMINISTRADOR can request an immediate evaluation of an ABIERTO bimester.
export default function BimesterEarlyAlertsPanel({ bimester, periodId, canManage, locked, onClose, onBusyChange }: {
  bimester: Bimester; periodId: number; canManage: boolean; locked: boolean; onClose: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const bimesterId = bimester.id;
  const [sections, setSections] = useState<Load<SectionResponse[]>>();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [courses, setCourses] = useState<Load<SectionCourseResponse[]>>();
  const [sectionCourseId, setSectionCourseId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [alerts, setAlerts] = useState<Load<EarlyWarningsPage>>();
  const [confirming, setConfirming] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const sectionsKey = String(periodId);
  useEffect(() => {
    let current = true;
    sectionsService.list({ academicPeriodId: periodId })
      .then(data => { if (current) setSections({ key: sectionsKey, data }); })
      .catch(() => { if (current) setSections({ key: sectionsKey, error: FILTER_SECTIONS_ERROR }); });
    return () => { current = false; };
  }, [periodId, sectionsKey]);

  const coursesKey = String(sectionId);
  useEffect(() => {
    if (sectionId === null) return;
    let current = true;
    sectionCoursesService.list(sectionId)
      .then(data => { if (current) setCourses({ key: coursesKey, data }); })
      .catch(() => { if (current) setCourses({ key: coursesKey, error: FILTER_COURSES_ERROR }); });
    return () => { current = false; };
  }, [sectionId, coursesKey]);

  const alertsKey = JSON.stringify([bimesterId, sectionCourseId, page, revision]);
  useEffect(() => {
    const abort = new AbortController();
    managementEarlyAlertsService.list(bimesterId, sectionCourseId, page, EARLY_ALERTS_PAGE_SIZE, abort.signal)
      .then(data => { if (!abort.signal.aborted) setAlerts({ key: alertsKey, data }); })
      .catch(error => { if (!abort.signal.aborted) setAlerts({ key: alertsKey, error: managementEarlyAlertsErrorMessage(error, 'list') }); });
    return () => abort.abort();
  }, [bimesterId, sectionCourseId, page, alertsKey]);

  const sectionsLoading = sections?.key !== sectionsKey;
  const coursesLoading = sectionId !== null && courses?.key !== coursesKey;
  const sectionList = sectionsLoading ? undefined : sections?.data;
  const courseList = coursesLoading || sectionId === null ? undefined : courses?.data;
  const filterError = (!sectionsLoading && sections?.error) || (sectionId !== null && !coursesLoading && courses?.error) || null;
  const loading = alerts?.key !== alertsKey;
  const data = loading ? undefined : alerts?.data;
  const canEvaluate = canManage && bimester.status === 'ABIERTO';
  const busy = evaluating || locked;

  const chooseSection = (value: string) => {
    setSectionId(value ? Number(value) : null); setSectionCourseId(null); setPage(0); setNotice(null);
  };
  const chooseCourse = (value: string) => { setSectionCourseId(value ? Number(value) : null); setPage(0); setNotice(null); };
  const refresh = () => { setNotice(null); setActionError(null); setRevision(n => n + 1); };

  // A single POST: the lock blocks repeated clicks until the answer arrives.
  async function evaluate() {
    if (lock.current || !canEvaluate) return;
    lock.current = true; setConfirming(false); setEvaluating(true); onBusyChange(true); setNotice(null); setActionError(null);
    try {
      const result = await managementEarlyAlertsService.evaluate(bimesterId);
      if (!mounted.current) return;
      setNotice(evaluationNotice(result.createdCount));
      setPage(0); setRevision(n => n + 1);
    } catch (error) {
      if (!mounted.current) return;
      setActionError(managementEarlyAlertsErrorMessage(error, 'evaluate'));
      if (isUnconfirmedEvaluation(error) || managementEarlyAlertsErrorCode(error) === 'ALERT_CONTEXT_UNAVAILABLE') setRevision(n => n + 1);
    } finally {
      lock.current = false; onBusyChange(false);
      if (mounted.current) setEvaluating(false);
    }
  }

  return <section aria-labelledby="early-alerts-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-6 shadow-sm flex flex-col gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="early-alerts-title" className="text-base font-bold text-ink">Alertas tempranas · {bimester.name}</h2>
        <p className="text-xs text-muted mt-1">Alumnos con PA acumulada menor que 11 al evaluarse el bimestre. Se muestran los valores registrados al detectar la alerta.</p>
        {!canManage && <p className="text-xs text-muted mt-1">Acceso DIRECTIVO: solo lectura.</p>}</div>
      <div className="flex flex-wrap gap-2">
        {canEvaluate && <button type="button" className={primaryButtonClass} disabled={busy || loading} onClick={() => { setNotice(null); setActionError(null); setConfirming(true); }}>{evaluating ? 'Evaluando...' : 'Evaluar ahora'}</button>}
        <button type="button" className={secondaryButtonClass} disabled={busy || loading} onClick={refresh}>Actualizar alertas</button>
        <button type="button" className={secondaryButtonClass} disabled={evaluating} onClick={() => { if (!lock.current) onClose(); }}>Cerrar panel</button>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className={labelClass}>Sección
        <select aria-label="Filtrar por sección" className={inputClass} value={sectionId ?? ''} disabled={busy || sectionsLoading || !!sections?.error} onChange={e => chooseSection(e.target.value)}>
          <option value="">Todas las secciones</option>
          {sectionList?.map(s => <option key={s.id} value={s.id}>{`${s.grade}° ${s.level === 'PRIMARY' ? 'primaria' : 'secundaria'} · ${sectionName(s.name)}`}</option>)}
        </select>
      </label>
      <label className={labelClass}>Curso
        <select aria-label="Filtrar por curso" className={inputClass} value={sectionCourseId ?? ''} disabled={busy || !courseList} onChange={e => chooseCourse(e.target.value)}>
          <option value="">Todos los cursos</option>
          {courseList?.map(c => <option key={c.id} value={c.id}>{c.active ? c.courseName : `${c.courseName} (inactivo)`}</option>)}
        </select>
      </label>
    </div>
    {filterError && <p role="alert" className="text-xs text-amber-800">{filterError}</p>}
    {notice && <p role="status" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold">{notice}</p>}
    {actionError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">{actionError}</p>}
    {loading ? <p role="status" className="text-xs text-muted">Consultando alertas tempranas...</p>
      : alerts?.error ? <Failure message={alerts.error} retry={refresh} />
      : data && data.totalElements === 0 && data.content.length === 0
        ? <p role="status" className="text-xs text-muted">{sectionCourseId === null ? MANAGEMENT_EARLY_ALERTS_EMPTY_MESSAGE : EARLY_ALERTS_EMPTY_MESSAGE}</p>
      : data && <TablaAlertasTempranas data={data} caption={`Alertas tempranas de ${bimester.name}`} showCourse onPageChange={setPage} />}
    {confirming && <SectionDialog title="Evaluar alertas ahora" busy={false} onClose={() => setConfirming(false)}>
      <p className="text-sm leading-relaxed">{EVALUATION_CONFIRM_MESSAGE}</p>
      <div className="flex flex-wrap justify-end gap-2 mt-5">
        <button type="button" className={secondaryButtonClass} onClick={() => setConfirming(false)}>Cancelar</button>
        <button type="button" className={primaryButtonClass} disabled={evaluating} onClick={() => { void evaluate(); }}>Confirmar evaluación</button>
      </div>
    </SectionDialog>}
  </section>;
}

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import {
  Calendar,
  Search,
  Plus,
  X,
  RefreshCw,
  FileText
} from 'lucide-react';
import { teacherGradesService, teacherGradesErrorMessage } from '@/services/teacher/teacherGradesService';
import {
  activityTitleError,
  activityChanges,
  activityMatchesChanges,
  annulmentReasonError,
  isAmbiguousActivityCreation,
  isUncertainActivityResult,
  teacherActivitiesErrorMessage,
  teacherActivitiesService
} from '@/services/teacher/teacherActivitiesService';
import NotasActividadDocente from './NotasActividadDocente';
import ModalNuevaActividad from './ModalNuevaActividad';
import TarjetaActividad from './TarjetaActividad';
import { ACADEMIC_ACTIVITY_TYPES, academicActivityStatusLabels } from '@/types/teacherActivitiesApi';
import type { AcademicActivity, ActivityContext, CreateAcademicActivityRequest } from '@/types/teacherActivitiesApi';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';

const button =
  'min-h-10 px-3 py-2 rounded-lg border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 transition-colors cursor-pointer';
const input =
  'w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink focus-visible:outline-accent text-xs';

type Result<T> = { key: string; data?: T; error?: string };

const emptyForm: CreateAcademicActivityRequest = {
  title: '',
  description: null,
  type: 'TAREA',
  cuentaParaPa: false
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getBimesterMonths(bimester?: Bimester): { index: number; name: string }[] {
  if (!bimester?.startDate || !bimester?.endDate) {
    return [
      { index: 0, name: 'Enero' },
      { index: 1, name: 'Febrero' }
    ];
  }
  const start = new Date(bimester.startDate + 'T00:00:00');
  const end = new Date(bimester.endDate + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [
      { index: 0, name: 'Enero' },
      { index: 1, name: 'Febrero' }
    ];
  }
  const months: { index: number; name: string }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push({ index: cur.getMonth(), name: MONTH_NAMES[cur.getMonth()] });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.length > 0 ? months : [
    { index: 0, name: 'Enero' },
    { index: 1, name: 'Febrero' }
  ];
}

function formatHumanDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  let day: number, monthIndex: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    day = parseInt(parts[2], 10);
    monthIndex = parseInt(parts[1], 10) - 1;
  } else {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    day = d.getDate();
    monthIndex = d.getMonth();
  }
  const monthName = MONTH_NAMES[monthIndex] || '';
  return `${day} ${monthName}`;
}

function formatDisplayDate(dateStr?: string | null): string {
  return formatHumanDate(dateStr);
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDateRangeLabel(startDate: Date, endDate: Date): string {
  const startDay = startDate.getDate();
  const startMonth = MONTH_NAMES[startDate.getMonth()]?.toLowerCase() || '';
  const endDay = endDate.getDate();
  const endMonth = MONTH_NAMES[endDate.getMonth()]?.toLowerCase() || '';

  if (startMonth === endMonth) {
    return `${startDay} al ${endDay} de ${startMonth}`;
  }
  return `${startDay} de ${startMonth} al ${endDay} de ${endMonth}`;
}

interface WeekGroup {
  weekKey: string;
  weekNumber: number;
  dateRange: string;
  startDate: Date;
  activities: AcademicActivity[];
}

function getEffectiveActivityDate(
  act: AcademicActivity,
  activityDates: Record<number, { startDate?: string; endDate?: string }>,
  bimester?: Bimester
): { start: Date; end: Date; displayStart: string; displayEnd: string } {
  const custom = activityDates[act.id];
  const bStart = bimester?.startDate ? new Date(bimester.startDate + 'T00:00:00') : null;
  const bEnd = bimester?.endDate ? new Date(bimester.endDate + 'T23:59:59') : null;

  if (custom?.startDate) {
    const s = new Date(custom.startDate);
    const e = custom.endDate ? new Date(custom.endDate) : s;
    return {
      start: isNaN(s.getTime()) ? new Date() : s,
      end: isNaN(e.getTime()) ? s : e,
      displayStart: formatDisplayDate(custom.startDate),
      displayEnd: formatDisplayDate(custom.endDate || custom.startDate)
    };
  }

  let created = new Date(act.createdAt);
  if (isNaN(created.getTime())) created = new Date();

  // Si la actividad fue creada fuera del rango del bimestre (por ejemplo noviembre en el 1° Bimestre)
  if (bStart && bEnd && (created < bStart || created > bEnd)) {
    return {
      start: bStart,
      end: bStart,
      displayStart: formatDisplayDate(bimester?.startDate),
      displayEnd: formatDisplayDate(bimester?.startDate)
    };
  }

  return {
    start: created,
    end: created,
    displayStart: formatDisplayDate(act.createdAt),
    displayEnd: formatDisplayDate(act.createdAt)
  };
}

function groupActivitiesByWeek(
  activities: AcademicActivity[],
  activityDates: Record<number, { startDate?: string; endDate?: string }>,
  bimester?: Bimester
): WeekGroup[] {
  if (!activities || activities.length === 0) return [];

  let bimesterStartMonday: Date | null = null;
  let maxBimesterWeeks = 10;
  if (bimester?.startDate) {
    const bStart = new Date(bimester.startDate + 'T00:00:00');
    if (!isNaN(bStart.getTime())) {
      bimesterStartMonday = getMondayOfWeek(bStart);
    }
    if (bimester.endDate && bimesterStartMonday) {
      const bEnd = new Date(bimester.endDate + 'T23:59:59');
      if (!isNaN(bEnd.getTime())) {
        maxBimesterWeeks = Math.max(1, Math.ceil((bEnd.getTime() - bimesterStartMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      }
    }
  }

  const map = new Map<string, WeekGroup>();

  for (const act of activities) {
    const { start: actDate } = getEffectiveActivityDate(act, activityDates, bimester);

    const monday = getMondayOfWeek(actDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekKey = `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;

    let weekNumber = 1;
    if (bimesterStartMonday) {
      const diffMs = monday.getTime() - bimesterStartMonday.getTime();
      const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
      weekNumber = Math.min(Math.max(1, diffWeeks + 1), maxBimesterWeeks);
    }

    if (!map.has(weekKey)) {
      map.set(weekKey, {
        weekKey,
        weekNumber,
        dateRange: getWeekDateRangeLabel(monday, sunday),
        startDate: monday,
        activities: [act]
      });
    } else {
      map.get(weekKey)!.activities.push(act);
    }
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (!bimesterStartMonday) {
    groups.forEach((g, idx) => {
      g.weekNumber = idx + 1;
    });
  }

  return groups;
}

export default function ActividadesDocente({
  sectionCourseId,
  autoSelectCurrent = false
}: {
  sectionCourseId: number;
  autoSelectCurrent?: boolean;
}) {
  return <CourseActivities key={sectionCourseId} sectionCourseId={sectionCourseId} autoSelectCurrent={autoSelectCurrent} />;
}

function CourseActivities({
  sectionCourseId,
  autoSelectCurrent = false
}: {
  sectionCourseId: number;
  autoSelectCurrent?: boolean;
}) {
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
    teacherGradesService
      .getBimesters(sectionCourseId, controller.signal)
      .then(data => {
        if (current) {
          setResult({ key, data });
          if (autoSelectCurrent && data?.length) {
            const currentBimester = data.find(b => b.status === 'ABIERTO') ?? data.find(b => b.status !== 'ANULADO');
            if (currentBimester) {
              setSelected(String(currentBimester.id));
            }
          }
        }
      })
      .catch(error => {
        if (current) setResult({ key, error: teacherGradesErrorMessage(error) });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [sectionCourseId, valid, key, autoSelectCurrent]);

  return (
    <section className="bg-white p-5 sm:p-6 rounded-xl border border-line shadow-sm min-w-0" aria-labelledby="activities-title">
      {/* Cabecera Única y Compacta (Sin repeticiones ni doble título) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 id="activities-title" className="text-base font-bold text-ink">
            Actividades y Materiales
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Planificación semanal y materiales de clase.
          </p>
          <p className="sr-only">
            Prepara, publica y califica actividades de este curso y sección. Las notas de actividades publicadas que cuentan para PA
            forman el promedio de actividades (PA), calculado por el servidor y de solo lectura.
          </p>
        </div>

        {valid && !!bimesters?.length && (
          <div className="shrink-0 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-xs font-bold text-ink bg-neutral/30 px-3 py-1.5 rounded-lg border border-line">
              <span className="text-muted font-medium">Bimestre:</span>
              <select
                aria-label="Bimestre de actividades"
                value={selected}
                disabled={busy}
                className="bg-transparent font-bold text-xs text-ink focus-visible:outline-accent cursor-pointer py-1"
                onChange={e => {
                  setEpoch(++generation.current);
                  setSelected(e.target.value);
                }}
              >
                <option value="">Selecciona un bimestre</option>
                {bimesters.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {bimesterStatusLabels[b.status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {!valid ? (
        <p role="alert" className="mt-4 text-xs text-rose-700">
          Selecciona un curso asignado válido.
        </p>
      ) : loading ? (
        <p role="status" className="py-6 text-sm text-muted">
          Cargando bimestres...
        </p>
      ) : result?.error ? (
        <div role="alert" className="mt-4 text-sm text-rose-700">
          <p>{result.error}</p>
          <button type="button" className={`${button} bg-white mt-3`} onClick={() => setRevision(n => n + 1)}>
            Reintentar bimestres
          </button>
        </div>
      ) : bimesters?.length === 0 ? (
        <p className="py-6 text-sm text-muted">No hay bimestres disponibles para este curso.</p>
      ) : null}

      {bimester ? (
        <ActivitySheet
          key={`${bimester.id}:${epoch}`}
          bimester={bimester}
          context={{ sectionCourseId, bimesterId: bimester.id }}
          parentBusy={busy}
          lockRef={mutationLock}
          generationRef={generation}
          epoch={epoch}
          setParentBusy={setBusy}
        />
      ) : (
        !loading &&
        !result?.error &&
        !!bimesters?.length && (
          <p className="mt-6 p-8 text-center text-sm text-muted border border-dashed border-line rounded-xl">
            Elige un bimestre para consultar o crear sus actividades y materiales.
          </p>
        )
      )}
    </section>
  );
}

function ActivitySheet({
  bimester,
  context,
  parentBusy,
  lockRef,
  generationRef,
  epoch,
  setParentBusy
}: {
  bimester: Bimester;
  context: ActivityContext;
  parentBusy: boolean;
  lockRef: MutableRefObject<boolean>;
  generationRef: MutableRefObject<number>;
  epoch: number;
  setParentBusy: (busy: boolean) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<Result<AcademicActivity[]> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [editing, setEditing] = useState<{ original: AcademicActivity; values: CreateAcademicActivityRequest } | null>(null);
  const editRef = useRef<AcademicActivity | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const [detail, setDetail] = useState<Result<AcademicActivity> | null>(null);
  const [confirming, setConfirming] = useState<{ kind: 'publish' | 'annul'; activity: AcademicActivity } | null>(null);
  const [annulReason, setAnnulReason] = useState('');

  // Modal de nueva actividad
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fechas personalizadas de actividades por ID
  const [activityDates, setActivityDates] = useState<Record<number, { startDate?: string; endDate?: string }>>({});

  // Sub-filtro de meses y búsqueda en tiempo real
  const bimesterMonths = getBimesterMonths(bimester);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const mounted = useRef(true);
  const key = String(revision);
  const detailKey = JSON.stringify([selectedId, detailRevision]);
  const loading = list?.key !== key;
  const titleError = activityTitleError(form.title);
  // An annulled bimester is read-only: no creation, material request or edit.
  const annulled = bimester.status === 'ANULADO';
  const disabled = annulled || busy || parentBusy || loading || !!list?.error || ambiguous || refreshRequired;
  const { sectionCourseId, bimesterId } = context;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    teacherActivitiesService
      .getActivities({ sectionCourseId, bimesterId }, controller.signal)
      .then(data => {
        if (current) {
          setList({ key, data });
          setRefreshRequired(false);
        }
      })
      .catch(error => {
        if (current) setList({ key, error: teacherActivitiesErrorMessage(error) });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [sectionCourseId, bimesterId, key]);

  useEffect(() => {
    if (selectedId === null) return;
    let current = true;
    const controller = new AbortController();
    teacherActivitiesService
      .getActivity({ sectionCourseId, bimesterId }, selectedId, controller.signal)
      .then(data => {
        if (current) setDetail({ key: detailKey, data });
      })
      .catch(error => {
        if (current) setDetail({ key: detailKey, error: teacherActivitiesErrorMessage(error) });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [sectionCourseId, bimesterId, selectedId, detailKey]);

  async function createActivity() {
    if (!mounted.current || generationRef.current !== epoch || lockRef.current || disabled || editing || titleError) return;
    lockRef.current = true;
    setBusy(true);
    setParentBusy(true);
    setError(null);
    setNotice(null);
    setRefreshRequired(true);
    let saved: AcademicActivity | null = null;
    let failure: string | null = null;
    try {
      try {
        saved = await teacherActivitiesService.createActivity(context, form);
      } catch (err) {
        failure = teacherActivitiesErrorMessage(err);
        if (mounted.current && generationRef.current === epoch && isAmbiguousActivityCreation(err)) setAmbiguous(true);
      }
      try {
        const rows = await teacherActivitiesService.getActivities(context);
        if (!mounted.current || generationRef.current !== epoch) return;
        setList({ key, data: rows });
        const savedId = saved?.id;
        const confirmed = savedId !== undefined && rows.some(a => a.id === savedId);
        setRefreshRequired(!!saved && !confirmed);
        if (saved && !confirmed) setAmbiguous(true);
        if (saved && confirmed) {
          setNotice(`Actividad «${saved.title}» creada en estado PLANIFICADA y confirmada en el listado.`);
          if (startDate || endDate) {
            setActivityDates(prev => ({
              ...prev,
              [savedId]: { startDate, endDate }
            }));
          }
          setForm(emptyForm);
          setStartDate('');
          setEndDate('');
          setIsCreateModalOpen(false);
        } else {
          setError(failure ?? 'El servidor aceptó la actividad, pero no se confirmó en el listado. Actualiza antes de continuar.');
        }
      } catch {
        if (mounted.current && generationRef.current === epoch) {
          if (saved) setAmbiguous(true);
          setError(`${failure ?? 'El servidor aceptó la actividad.'} No se pudo recargar el listado. Actualiza antes de continuar.`);
        }
      }
    } finally {
      lockRef.current = false;
      setParentBusy(false);
      if (mounted.current) setBusy(false);
    }
  }

  function cancelEdit() {
    if (!lockRef.current) {
      editRef.current = null;
      setEditing(null);
    }
  }

  async function startEdit(activityId: number) {
    if (!mounted.current || generationRef.current !== epoch || lockRef.current || disabled || editing) return;
    lockRef.current = true;
    setBusy(true);
    setParentBusy(true);
    setNotice(null);
    setError(null);
    setSelectedId(null);
    try {
      const original = await teacherActivitiesService.getActivity(context, activityId);
      if (!mounted.current || generationRef.current !== epoch) return;
      if (original.status !== 'PLANIFICADA') {
        setError(`La actividad ya está ${academicActivityStatusLabels[original.status].toLowerCase()} y no admite esta edición. Actualiza la lista.`);
        return;
      }
      editRef.current = original;
      setEditing({
        original,
        values: {
          title: original.title,
          description: original.description,
          type: original.type,
          cuentaParaPa: original.cuentaParaPa
        }
      });
    } catch (err) {
      if (mounted.current && generationRef.current === epoch) setError(teacherActivitiesErrorMessage(err));
    } finally {
      lockRef.current = false;
      setParentBusy(false);
      if (mounted.current) setBusy(false);
    }
  }

  let editError: string | null = null;
  let changed = false;
  if (editing) {
    try {
      changed = Object.keys(activityChanges(editing.original, editing.values)).length > 0;
    } catch {
      editError = 'Revisa el título (obligatorio, hasta 255 caracteres), tipo y configuración.';
    }
  }

  async function saveEdit() {
    if (
      !mounted.current ||
      generationRef.current !== epoch ||
      lockRef.current ||
      disabled ||
      !editing ||
      editRef.current !== editing.original ||
      editError ||
      !changed
    )
      return;
    const original = editing.original;
    const changes = activityChanges(original, editing.values);
    lockRef.current = true;
    setBusy(true);
    setParentBusy(true);
    editRef.current = null;
    setEditing(null);
    setNotice(null);
    setError(null);
    setSelectedId(null);
    setRefreshRequired(true);
    let accepted = false;
    let failure: string | null = null;
    try {
      try {
        const saved = await teacherActivitiesService.updateActivity(context, original.id, changes);
        if (saved.createdAt !== original.createdAt || saved.createdByTeacherId !== original.createdByTeacherId) {
          throw new Error('Datos inmutables inconsistentes.');
        }
        accepted = true;
      } catch (err) {
        failure = teacherActivitiesErrorMessage(err);
      }
      const [fresh, collection] = await Promise.allSettled([
        teacherActivitiesService.getActivity(context, original.id),
        teacherActivitiesService.getActivities(context)
      ]);
      if (!mounted.current || generationRef.current !== epoch) return;
      if (collection.status === 'fulfilled') setList({ key, data: collection.value });
      if (fresh.status === 'fulfilled') setDetail({ key: JSON.stringify([original.id, detailRevision]), data: fresh.value });
      const row = collection.status === 'fulfilled' ? collection.value.find(a => a.id === original.id) : undefined;
      const verified =
        fresh.status === 'fulfilled' && row && activityMatchesChanges(fresh.value, changes) && activityMatchesChanges(row, changes);
      setRefreshRequired(fresh.status !== 'fulfilled' || collection.status !== 'fulfilled' || (accepted && !verified));
      if (accepted && verified) setNotice('Edición confirmada mediante detalle y listado recargados.');
      else
        setError(
          `${failure ?? 'La edición no se corroboró en el servidor.'} ${
            fresh.status !== 'fulfilled' || collection.status !== 'fulfilled'
              ? 'Falló la recarga; actualiza antes de continuar.'
              : 'Revisa los valores actuales antes de otra edición.'
          }`
        );
    } finally {
      lockRef.current = false;
      setParentBusy(false);
      if (mounted.current) setBusy(false);
    }
  }

  // Publish/annul require an open bimester; the server re-checks state and window.
  const windowOpen = bimester.status === 'ABIERTO';

  async function transition() {
    if (!mounted.current || generationRef.current !== epoch || lockRef.current || disabled || !windowOpen || !confirming) return;
    const { kind, activity } = confirming;
    if (kind === 'annul' && annulmentReasonError(annulReason)) return;
    const expected = kind === 'publish' ? 'PUBLICADA' : 'ANULADA';
    lockRef.current = true;
    setBusy(true);
    setParentBusy(true);
    setConfirming(null);
    setNotice(null);
    setError(null);
    let failure: unknown = null;
    try {
      try {
        if (kind === 'publish') await teacherActivitiesService.publishActivity(context, activity.id);
        else await teacherActivitiesService.annulActivity(context, activity.id, annulReason);
      } catch (err) {
        failure = err;
      }
      // Always reload: the state shown comes from the server, never from the request.
      const [fresh, collection] = await Promise.allSettled([
        teacherActivitiesService.getActivity(context, activity.id),
        teacherActivitiesService.getActivities(context)
      ]);
      if (!mounted.current || generationRef.current !== epoch) return;
      if (collection.status === 'fulfilled') setList({ key, data: collection.value });
      if (fresh.status === 'fulfilled') setDetail({ key: JSON.stringify([activity.id, detailRevision]), data: fresh.value });
      const row = collection.status === 'fulfilled' ? collection.value.find(a => a.id === activity.id) : undefined;
      const confirmed = fresh.status === 'fulfilled' && fresh.value.status === expected && row?.status === expected;
      setRefreshRequired(fresh.status !== 'fulfilled' || collection.status !== 'fulfilled');
      if (!failure && confirmed) {
        setAnnulReason('');
        setNotice(kind === 'publish' ? `Actividad «${activity.title}» publicada y confirmada en el listado.` : `Actividad «${activity.title}» anulada y confirmada en el listado. Sus notas se conservan.`);
      } else if (failure && isUncertainActivityResult(failure)) {
        setError(`No se pudo confirmar la ${kind === 'publish' ? 'publicación' : 'anulación'}. Se volvió a consultar el estado: ${confirmed ? 'la operación sí se aplicó' : 'revísalo antes de reintentar'}.`);
      } else {
        setError(failure ? teacherActivitiesErrorMessage(failure) : 'La operación no se corroboró en el listado recargado. Actualiza antes de continuar.');
      }
    } finally {
      lockRef.current = false;
      setParentBusy(false);
      if (mounted.current) setBusy(false);
    }
  }

  function refresh() {
    if (!lockRef.current) {
      setConfirming(null);
      cancelEdit();
      setSelectedId(null);
      setNotice(null);
      setRevision(n => n + 1);
    }
  }

  // Determinación de mes coherente para actividades
  function getActivityMonth(a: AcademicActivity): number {
    const { start } = getEffectiveActivityDate(a, activityDates, bimester);
    return start.getMonth();
  }

  // Filtrado compuesto: Mes seleccionado + Búsqueda por nombre en tiempo real (onChange)
  const filteredActivities = useMemo(() => {
    return list?.data?.filter(a => {
      if (selectedMonth !== 'ALL' && getActivityMonth(a) !== selectedMonth) {
        return false;
      }
      if (searchQuery.trim() && !a.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [list?.data, selectedMonth, searchQuery, activityDates, bimester]);

  // Agrupamiento semanal estilo Google Classroom (coherente con las semanas del bimestre)
  const weeklyGroups = useMemo(() => {
    return groupActivitiesByWeek(filteredActivities || [], activityDates, bimester);
  }, [filteredActivities, activityDates, bimester]);

  const hasAnyItems = !!list?.data && list.data.length > 0;
  const hasFilteredItems = !!filteredActivities && filteredActivities.length > 0;

  return (
    <div className="flex flex-col gap-5 mt-5">
      {annulled && (
        <p role="status" className="text-xs font-medium text-amber-800 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          Este bimestre está anulado. Solo puedes consultar sus actividades; no se pueden crear ni editar.
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs font-medium text-emerald-700 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-700 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          {error}
        </p>
      )}
      {busy && <p role="status" className="text-xs text-muted">Procesando y sincronizando con el servidor...</p>}
      {refreshRequired && !busy && (
        <p role="alert" className="text-xs text-rose-700">Actualiza el listado antes de otra operación.</p>
      )}

      {ambiguous && (
        <div role="alert" className="p-4 bg-neutral/40 border border-line rounded-xl text-xs text-ink">
          <p>La creación no está confirmada. Revisa las actividades antes de enviar otra solicitud; repetirla podría crear un duplicado.</p>
          <button
            type="button"
            disabled={busy || loading || !!list?.error || refreshRequired}
            className={`${button} bg-white mt-3`}
            onClick={() => {
              if (!lockRef.current) {
                setAmbiguous(false);
                setForm(emptyForm);
                setError(null);
              }
            }}
          >
            Revisé el listado; permitir una nueva actividad
          </button>
        </div>
      )}

      {/* Barra de Acciones y Filtros Unificada (Limpia y Compacta) */}
      <div className="p-3.5 bg-neutral/20 border border-line rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Lado izquierdo: Filtro por meses del bimestre */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-muted mr-1">Filtrar por mes:</span>
          <button
            type="button"
            onClick={() => setSelectedMonth('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedMonth === 'ALL'
                ? 'bg-accent text-white shadow-xs'
                : 'bg-white text-muted hover:text-ink hover:bg-neutral border border-line'
            }`}
          >
            Todos
          </button>
          {bimesterMonths.map(m => (
            <button
              key={m.index}
              type="button"
              onClick={() => setSelectedMonth(m.index)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedMonth === m.index
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-white text-muted hover:text-ink hover:bg-neutral border border-line'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Lado derecho: Búsqueda en tiempo real + Botón Crear Actividad + Actualizar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar actividad por nombre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-line bg-white text-xs text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs p-0.5 rounded-full cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
            className="min-h-9 px-3.5 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus size={15} />
            <span>Crear Actividad o Material</span>
          </button>

          <button
            type="button"
            disabled={busy || loading}
            className={`${button} bg-white hover:bg-neutral flex items-center gap-1.5 min-h-9 py-1.5`}
            onClick={refresh}
            title="Actualizar listado de actividades"
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            <span>Actualizar actividades</span>
          </button>
        </div>
      </div>

      {/* Componente Modal de Nueva Actividad o Material */}
      <ModalNuevaActividad
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        disabled={disabled}
        form={form}
        setForm={setForm}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onSubmit={createActivity}
        sectionCourseId={sectionCourseId}
        bimester={bimester}
        titleError={titleError}
      />

      {/* Modal de Edición de Actividad */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="bg-white rounded-2xl border border-line shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 relative flex flex-col gap-4">
            <form
              aria-label="Editar actividad académica"
              className="flex flex-col gap-4"
              onSubmit={e => {
                e.preventDefault();
                void saveEdit();
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 id="edit-modal-title" className="font-bold text-base text-ink">
                  Editar actividad #{editing.original.id}
                </h3>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-neutral transition-colors cursor-pointer"
                  aria-label="Cerrar modal de edición"
                >
                  <X size={18} />
                </button>
              </div>

              <fieldset disabled={disabled} className="flex flex-col gap-3 text-xs font-bold text-muted">
                <label>
                  Título
                  <input
                    aria-label="Título editado"
                    autoFocus
                    required
                    maxLength={255}
                    className={input}
                    value={editing.values.title}
                    onChange={e => setEditing({ ...editing, values: { ...editing.values, title: e.target.value } })}
                  />
                </label>
                <label>
                  Descripción (opcional)
                  <textarea
                    aria-label="Descripción editada"
                    rows={3}
                    className={input}
                    value={editing.values.description ?? ''}
                    onChange={e => setEditing({ ...editing, values: { ...editing.values, description: e.target.value || null } })}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    aria-label="Tipo editado"
                    className={input}
                    value={editing.values.type}
                    onChange={e =>
                      setEditing({ ...editing, values: { ...editing.values, type: e.target.value as CreateAcademicActivityRequest['type'] } })
                    }
                  >
                    {ACADEMIC_ACTIVITY_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 min-h-8 cursor-pointer select-none">
                  <input
                    aria-label="Cuenta para PA editada"
                    type="checkbox"
                    checked={editing.values.cuentaParaPa}
                    onChange={e => setEditing({ ...editing, values: { ...editing.values, cuentaParaPa: e.target.checked } })}
                  />
                  Cuenta para PA
                </label>
              </fieldset>

              {editError && <p role="alert" className="text-xs text-rose-700">{editError}</p>}
              {!editError && !changed && <p className="text-xs text-muted">No hay cambios efectivos.</p>}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-line">
                <button type="button" disabled={busy} className={`${button} bg-white`} onClick={cancelEdit}>
                  Cancelar edición
                </button>
                <button type="submit" disabled={disabled || !!editError || !changed} className={`${button} bg-accent text-white`}>
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detalle y Planilla de Calificaciones (cuando se selecciona una actividad) */}
      {selectedId !== null && (
        <section className="p-5 border-2 border-accent/30 rounded-2xl bg-white shadow-md" aria-label="Detalle de actividad">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-accent/10 text-accent">
                <FileText size={18} />
              </span>
              <h4 className="font-bold text-base text-ink">
                Detalle y Calificaciones de Actividad #{selectedId}
              </h4>
            </div>
            <button
              type="button"
              disabled={busy}
              className={`${button} bg-white hover:bg-neutral`}
              onClick={() => {
                setConfirming(null);
                setSelectedId(null);
              }}
            >
              Cerrar detalle
            </button>
          </div>

          {detail?.key !== detailKey ? (
            <p role="status" className="text-xs text-muted py-4">
              Cargando detalle...
            </p>
          ) : detail.error ? (
            <div role="alert" className="text-xs text-rose-700 py-3">
              <p>{detail.error}</p>
              <button type="button" className={`${button} bg-white mt-2`} onClick={() => setDetailRevision(n => n + 1)}>
                Reintentar detalle
              </button>
            </div>
          ) : detail.data ? (
            <>
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs break-words">
                {Object.entries({
                  Actividad: `#${detail.data.id} · ${detail.data.title}`,
                  Descripción: detail.data.description ?? 'Sin descripción',
                  Tipo: detail.data.type,
                  Estado: academicActivityStatusLabels[detail.data.status],
                  'Cuenta para PA': detail.data.cuentaParaPa ? 'Sí' : 'No',
                  'Curso-sección': detail.data.sectionCourseId,
                  Bimestre: detail.data.bimesterId,
                  'ID docente': detail.data.createdByTeacherId,
                  Creación: detail.data.createdAt,
                  Actualización: detail.data.updatedAt ?? 'Sin actualización',
                  Publicación: detail.data.publishedAt ?? 'Sin publicar',
                  ...(detail.data.status === 'ANULADA'
                    ? { Anulación: detail.data.annulledAt, 'Motivo de anulación': detail.data.annulmentReason }
                    : {})
                }).map(([lbl, val]) => (
                  <div key={lbl} className="p-2.5 bg-neutral/30 border border-line/60 rounded-lg">
                    <dt className="font-bold text-muted text-[10px] uppercase tracking-wider">{lbl}</dt>
                    <dd className="text-ink whitespace-pre-wrap mt-0.5">{val}</dd>
                  </div>
                ))}
              </dl>

              {detail.data.status !== 'ANULADA' && (
                <div className="mt-4 flex flex-col gap-2">
                  {windowOpen ? (
                    confirming?.activity.id === detail.data.id ? (
                      <div
                        role="group"
                        aria-label={confirming.kind === 'publish' ? 'Confirmar publicación' : 'Confirmar anulación'}
                        className="p-3 border border-amber-200 bg-amber-50 rounded-lg text-xs text-amber-900 flex flex-col gap-2"
                      >
                        <p>
                          {confirming.kind === 'publish'
                            ? `¿Publicar «${confirming.activity.title}»? Se habilitan sus notas y, si cuenta para PA, entra al cálculo. No se puede despublicar.`
                            : `¿Anular «${confirming.activity.title}»? Sale del cálculo del PA y conserva sus notas. No se puede reactivar.`}
                        </p>
                        {confirming.kind === 'annul' && (
                          <label className="font-bold">
                            Motivo de anulación
                            <textarea
                              aria-label="Motivo de anulación"
                              rows={2}
                              maxLength={1000}
                              className={input}
                              value={annulReason}
                              onChange={e => setAnnulReason(e.target.value)}
                            />
                          </label>
                        )}
                        {confirming.kind === 'annul' && annulReason && annulmentReasonError(annulReason) && (
                          <p role="alert" className="text-rose-700">{annulmentReasonError(annulReason)}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={disabled || (confirming.kind === 'annul' && !!annulmentReasonError(annulReason))}
                            className={`${button} ${confirming.kind === 'publish' ? 'bg-accent' : 'bg-rose-700'} text-white`}
                            onClick={() => void transition()}
                          >
                            {confirming.kind === 'publish' ? 'Confirmar publicación' : 'Confirmar anulación'}
                          </button>
                          <button type="button" disabled={busy} className={`${button} bg-white`} onClick={() => setConfirming(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detail.data.status === 'PLANIFICADA' && (
                          <button
                            type="button"
                            disabled={disabled || !!editing}
                            className={`${button} bg-accent text-white`}
                            onClick={() => detail.data && setConfirming({ kind: 'publish', activity: detail.data })}
                          >
                            Publicar actividad
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={disabled || !!editing}
                          className={`${button} bg-white text-rose-700`}
                          onClick={() => {
                            setAnnulReason('');
                            if (detail.data) setConfirming({ kind: 'annul', activity: detail.data });
                          }}
                        >
                          Anular actividad
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-[11px] text-muted">Publicar o anular requiere el bimestre abierto.</p>
                  )}
                </div>
              )}

              {detail.data.status === 'PLANIFICADA' ? (
                <p className="mt-4 p-4 text-center text-xs text-muted border border-dashed border-line rounded-xl">
                  Publica la actividad para registrar sus notas.
                </p>
              ) : (
                <div className="mt-5 pt-4 border-t border-line">
                  <NotasActividadDocente
                    key={`${detail.data.id}:${detail.data.status}:${detailKey}`}
                    context={context}
                    activityId={detail.data.id}
                    disabled={disabled}
                    lockRef={lockRef}
                  />
                </div>
              )}
            </>
          ) : null}
        </section>
      )}

      {/* Flujo Principal Semanal de Actividades (Ancho Completo y Tarjetas Limpias) */}
      <div className="min-w-0 flex flex-col gap-4">
        {loading ? (
          <p role="status" className="text-xs text-muted py-6 text-center">
            Cargando actividades...
          </p>
        ) : list?.error ? (
          <div role="alert" className="text-xs text-rose-700 p-4 border border-rose-200 bg-rose-50 rounded-xl">
            <p>{list.error}</p>
            <button type="button" disabled={busy} className={`${button} bg-white mt-3`} onClick={refresh}>
              Reintentar actividades
            </button>
          </div>
        ) : !hasAnyItems ? (
          <p className="p-8 text-sm text-muted border border-dashed border-line rounded-xl text-center">
            No hay actividades registradas en este bimestre.
          </p>
        ) : !hasFilteredItems ? (
          <div className="p-8 text-sm text-muted border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-3">
            <p>
              {searchQuery.trim()
                ? `No se encontraron actividades que coincidan con la búsqueda «${searchQuery}».`
                : 'No hay actividades registradas para el mes seleccionado.'}
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`${button} bg-white`}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {weeklyGroups.map(wg => (
              <div
                key={wg.weekKey}
                className="border border-line rounded-xl bg-white shadow-xs overflow-hidden transition-all"
              >
                {/* Cabecera de la Semana (Estilo Bloque Limpio) */}
                <div className="bg-neutral/30 px-5 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-accent/10 text-accent font-bold" aria-hidden="true">
                      <Calendar size={16} />
                    </span>
                    <h4 className="font-bold text-sm text-ink">
                      Semana {wg.weekNumber}
                    </h4>
                    <span className="text-muted/40 font-bold" aria-hidden="true">&bull;</span>
                    <span className="text-xs text-muted font-medium">
                      {wg.dateRange}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-muted border border-line">
                    {wg.activities.length} {wg.activities.length === 1 ? 'actividad' : 'actividades'}
                  </span>
                </div>

                {/* Lista de Actividades de la Semana usando el Componente TarjetaActividad */}
                <ul className="divide-y divide-line/60">
                  {wg.activities.map(a => {
                    const { displayStart, displayEnd } = getEffectiveActivityDate(a, activityDates, bimester);
                    const isSelected = selectedId === a.id;

                    return (
                      <TarjetaActividad
                        key={a.id}
                        activity={a}
                        isSelected={isSelected}
                        onSelect={() => {
                          if (typeof window !== 'undefined' && window.location) {
                            window.location.assign(`/docente/cursos/${sectionCourseId}/detallesDelCurso/${a.id}?bimesterId=${bimester.id}`);
                          }
                          setConfirming(null);
                          setSelectedId(isSelected ? null : a.id);
                        }}
                        onEdit={() => {
                          void startEdit(a.id);
                        }}
                        disabled={disabled || !!editing}
                        displayStartDate={displayStart}
                        displayEndDate={displayEnd}
                      />
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

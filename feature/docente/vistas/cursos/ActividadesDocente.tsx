'use client';

import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import {
  Upload,
  FileText,
  Clock,
  X,
  Calendar,
  Award,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { validateMaterialFile } from '@/services/materialesService';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';
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
import { ACADEMIC_ACTIVITY_TYPES, academicActivityStatusLabels } from '@/types/teacherActivitiesApi';
import type { AcademicActivity, ActivityContext, CreateAcademicActivityRequest } from '@/types/teacherActivitiesApi';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';

const button =
  'min-h-10 px-3 py-2 rounded-lg border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 transition-colors';
const input =
  'w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink focus-visible:outline-accent text-xs';

type Result<T> = { key: string; data?: T; error?: string };

interface MaterialSubmission {
  id: string;
  title: string;
  date: string;
  fileName?: string;
  fileSize?: string;
  status: 'EN_PROCESO';
  createdAt: string;
}

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 id="activities-title" className="text-base font-bold text-ink">
            Actividades académicas y materiales
          </h2>
          <p className="text-xs text-muted mt-0.5">
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

  // Estados para formulario dual y fechas
  const [creationMode, setCreationMode] = useState<'actividad' | 'material'>('actividad');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDate, setMaterialDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialFileSize, setMaterialFileSize] = useState<string | null>(null);
  const [materialFileError, setMaterialFileError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialSubmission[]>([]);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Fechas personalizadas de actividades por ID
  const [activityDates, setActivityDates] = useState<Record<number, { startDate?: string; endDate?: string }>>({});

  // Sub-filtro de meses
  const bimesterMonths = getBimesterMonths(bimester);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setMaterialFile(null);
      setMaterialFileSize(null);
      setMaterialFileError(null);
      return;
    }
    const result = validateMaterialFile(file);
    if (!result.valid) {
      setMaterialFile(null);
      setMaterialFileSize(null);
      setMaterialFileError(result.error);
    } else {
      setMaterialFile(file);
      setMaterialFileSize(result.formattedSize);
      setMaterialFileError(null);
    }
  }

  function handleMaterialSubmit() {
    if (!materialTitle.trim() || disabled) return;
    if (!materialFile) {
      setMaterialFileError('Debe adjuntar un archivo para el material de clase.');
      return;
    }
    const validation = validateMaterialFile(materialFile);
    if (!validation.valid) {
      setMaterialFileError(validation.error);
      return;
    }
    const newSubmission: MaterialSubmission = {
      id: `mat-${materials.length + 1}-${materialTitle.trim().toLowerCase().slice(0, 10).replace(/\s+/g, '_')}`,
      title: materialTitle.trim(),
      date: materialDate || new Date().toISOString().slice(0, 10),
      fileName: materialFile.name,
      fileSize: validation.formattedSize,
      status: 'EN_PROCESO',
      createdAt: new Date().toISOString()
    };
    setMaterials(prev => [newSubmission, ...prev]);
    // La subida de material es siempre local hasta BACK #53.
    setToastNotice('Simulación: el material no se subió (módulo en construcción).');
    setMaterialTitle('');
    setMaterialFile(null);
    setMaterialFileSize(null);
    setMaterialFileError(null);
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

  // Determinación de mes para actividades
  function getActivityMonth(a: AcademicActivity): number {
    const custom = activityDates[a.id];
    const dateStr = custom?.startDate || a.createdAt;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getMonth();
  }

  // Filtrado por mes seleccionado
  const filteredActivities = list?.data?.filter(a => {
    if (selectedMonth === 'ALL') return true;
    return getActivityMonth(a) === selectedMonth;
  });

  const filteredMaterials = materials.filter(m => {
    if (selectedMonth === 'ALL') return true;
    const d = new Date(m.date);
    return isNaN(d.getTime()) ? true : d.getMonth() === selectedMonth;
  });

  const hasAnyItems = (list?.data && list.data.length > 0) || materials.length > 0;
  const hasFilteredItems = (filteredActivities && filteredActivities.length > 0) || filteredMaterials.length > 0;

  return (
    <div className="flex flex-col gap-5 mt-5">
      {/* Toast Alert para confirmación de solicitud de material */}
      {toastNotice && (
        <div
          role="status"
          className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-start justify-between gap-3 shadow-sm animate-in fade-in"
        >
          <div className="flex items-start gap-2.5">
            <Clock size={18} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Solicitud de aprobación</p>
              <p className="text-xs mt-0.5">{toastNotice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-amber-700 hover:text-amber-950 p-1"
            aria-label="Cerrar alerta"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {annulled && <p role="status" className="text-xs font-medium text-amber-800 p-3 bg-amber-50 border border-amber-200 rounded-lg">Este bimestre está anulado. Solo puedes consultar sus actividades; no se pueden crear ni editar.</p>}
      {notice && <p role="status" className="text-xs font-medium text-emerald-700 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">{notice}</p>}
      {error && <p role="alert" className="text-xs font-medium text-rose-700 p-3 bg-rose-50 border border-rose-200 rounded-lg">{error}</p>}
      {busy && <p role="status" className="text-xs text-muted">Procesando y sincronizando con el servidor...</p>}
      {refreshRequired && !busy && <p role="alert" className="text-xs text-rose-700">Actualiza el listado antes de otra operación.</p>}

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

      {/* Grid de dos columnas: Izquierda creación (Actividad o Material) / Derecha lista de actividades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Formulario (Actividad con fechas / Subir material) */}
        <div className="lg:col-span-5 min-w-0">
          {editing ? (
            <form
              aria-label="Editar actividad académica"
              className="p-5 rounded-xl border border-line border-t-4 border-t-accent bg-neutral/10 flex flex-col gap-4"
              onSubmit={e => {
                e.preventDefault();
                void saveEdit();
              }}
            >
              <h3 className="font-bold text-sm text-ink">Editar actividad #{editing.original.id}</h3>
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
              <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                <button type="submit" disabled={disabled || !!editError || !changed} className={`${button} bg-accent text-white`}>
                  Guardar cambios
                </button>
                <button type="button" disabled={busy} className={`${button} bg-white`} onClick={cancelEdit}>
                  Cancelar edición
                </button>
              </div>
            </form>
          ) : (
            <div className="p-5 border border-line rounded-xl bg-neutral/10 flex flex-col gap-4">
              {/* Selector de pestañas: Actividad vs Subir material */}
              <div className="flex border-b border-line gap-2">
                <button
                  type="button"
                  onClick={() => setCreationMode('actividad')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                    creationMode === 'actividad'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  Actividad
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('material')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                    creationMode === 'material'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  Subir material
                </button>
              </div>

              {/* Formulario Unificado */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (creationMode === 'actividad') {
                    void createActivity();
                  } else {
                    handleMaterialSubmit();
                  }
                }}
                className="flex flex-col gap-4"
                aria-label="Crear actividad académica"
              >
                <fieldset disabled={disabled} className="flex flex-col gap-3 text-xs font-bold text-muted">
                  {creationMode === 'actividad' ? (
                    <>
                      <label>
                        Título
                        <input
                          aria-label="Título de actividad"
                          required
                          maxLength={255}
                          className={input}
                          placeholder="Ej. Práctica calificada de ecuaciones"
                          value={form.title}
                          onChange={e => setForm({ ...form, title: e.target.value })}
                          aria-invalid={!!form.title && !!titleError}
                        />
                      </label>
                      {form.title && titleError && <p role="alert" className="text-rose-700 text-xs">{titleError}</p>}

                      {/* Fechas de inicio y finalización */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label>
                          Fecha de inicio
                          <input
                            type="date"
                            className={input}
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                          />
                        </label>
                        <label>
                          Fecha de finalización
                          <input
                            type="date"
                            className={input}
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                          />
                        </label>
                      </div>

                      <label>
                        Tipo
                        <select
                          aria-label="Tipo de actividad"
                          className={input}
                          value={form.type}
                          onChange={e =>
                            setForm({ ...form, type: e.target.value as CreateAcademicActivityRequest['type'] })
                          }
                        >
                          {ACADEMIC_ACTIVITY_TYPES.map(type => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Descripción (opcional)
                        <textarea
                          aria-label="Descripción de actividad"
                          rows={3}
                          className={input}
                          placeholder="Instrucciones o detalles de la actividad..."
                          value={form.description ?? ''}
                          onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                      </label>

                      <label className="flex items-center gap-2 min-h-8 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.cuentaParaPa}
                          onChange={e => setForm({ ...form, cuentaParaPa: e.target.checked })}
                        />
                        Cuenta para PA
                      </label>

                      <p className="font-normal text-[11px] text-muted">
                        La actividad se crea PLANIFICADA. Publícala desde su detalle para registrar notas; no recibe entregas de estudiantes.
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Hasta que FRONT #52 conecte la subida con BACK #53 (#121). */}
                      <AvisoModuloSimulado activo={true} className="mb-0" detalle="los materiales todavía no se guardan en el servidor; los que envíes aquí son de demostración y se pierden al recargar." />
                      <label>
                        Título del material
                        <input
                          required
                          maxLength={255}
                          className={input}
                          placeholder="Ej. Diapositivas - Módulo 2"
                          value={materialTitle}
                          onChange={e => setMaterialTitle(e.target.value)}
                        />
                      </label>

                      <label>
                        Fecha
                        <input
                          type="date"
                          required
                          className={input}
                          value={materialDate}
                          onChange={e => setMaterialDate(e.target.value)}
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-bold text-muted">Subir documento</span>
                        <div className={`mt-1.5 flex justify-center px-4 pt-4 pb-5 border-2 border-dashed rounded-lg bg-white transition-colors ${
                          materialFileError ? 'border-rose-300 bg-rose-50/20' : 'border-line hover:border-accent/50'
                        }`}>
                          <div className="space-y-1 text-center">
                            <Upload className={`mx-auto h-7 w-7 ${materialFileError ? 'text-rose-500' : 'text-muted'}`} aria-hidden="true" />
                            <div className="text-xs text-muted">
                              <label className="relative cursor-pointer rounded-md font-bold text-accent hover:underline">
                                <span>Seleccionar archivo</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*"
                                  onChange={handleFileChange}
                                />
                              </label>
                              {materialFile ? (
                                <p className="text-xs text-ink font-semibold mt-1 truncate max-w-xs">
                                  {materialFile.name} <span className="text-muted font-normal">({materialFileSize})</span>
                                </p>
                              ) : (
                                <p className="text-[11px] text-muted">PDF, Word, PowerPoint, Excel o ZIP (Máx. 15 MB)</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {materialFileError && (
                          <div role="alert" className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span>{materialFileError}</span>
                          </div>
                        )}
                      </label>

                      <p className="font-normal text-[11px] text-muted">
                        Al enviar la solicitud, pasará por aprobación administrativa y se listará con estado en proceso.
                      </p>
                    </>
                  )}
                </fieldset>

                <button
                  type="submit"
                  disabled={
                    creationMode === 'actividad'
                      ? disabled || !!titleError
                      : !materialTitle.trim() || !materialFile || !!materialFileError || disabled
                  }
                  className={`${button} bg-accent text-white disabled:bg-neutral/60 disabled:text-muted disabled:border-line disabled:opacity-100 w-full sm:w-auto mt-1`}
                >
                  {creationMode === 'actividad' ? 'Crear actividad' : 'Enviar solicitud'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Columna Derecha: Lista de todas las actividades con filtro de mes */}
        <div className="lg:col-span-7 min-w-0 flex flex-col gap-4">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-line">
            <h3 className="text-sm font-bold text-ink">Actividades del bimestre</h3>
            <button
              type="button"
              disabled={busy || loading}
              className={`${button} bg-white hover:bg-neutral`}
              onClick={refresh}
            >
              Actualizar actividades
            </button>
          </div>

          {/* Sub-filtro horizontal por meses del bimestre */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-muted mr-1">Filtrar por mes:</span>
            <button
              type="button"
              onClick={() => setSelectedMonth('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedMonth === 'ALL'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-neutral/60 text-muted hover:text-ink hover:bg-neutral'
              }`}
            >
              Todos
            </button>
            {bimesterMonths.map(m => (
              <button
                key={m.index}
                type="button"
                onClick={() => setSelectedMonth(m.index)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  selectedMonth === m.index
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-neutral/60 text-muted hover:text-ink hover:bg-neutral'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {loading ? (
            <p role="status" className="text-xs text-muted py-4">
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
            <p className="p-6 text-sm text-muted border border-dashed border-line rounded-xl text-center">
              No hay actividades registradas en este bimestre.
            </p>
          ) : !hasFilteredItems ? (
            <p className="p-6 text-sm text-muted border border-dashed border-line rounded-xl text-center">
              No hay actividades registradas para el mes seleccionado.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {/* Materiales en proceso de aprobación */}
              {filteredMaterials.map(m => (
                <li
                  key={m.id}
                  className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg flex flex-wrap justify-between items-start gap-3 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-amber-700 shrink-0" aria-hidden="true" />
                      <p className="font-bold text-sm text-ink break-words">{m.title}</p>
                    </div>
                    <div className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        En proceso
                      </span>
                      <span>Material pedagógico</span>
                      <span>· Fecha: {formatDisplayDate(m.date)}</span>
                    </div>
                    {m.fileName && (
                      <p className="text-[11px] text-muted mt-1 font-mono">
                        Archivo: {m.fileName} {m.fileSize && `· ${m.fileSize}`}
                      </p>
                    )}
                  </div>
                </li>
              ))}

              {/* Actividades académicas con distinción destacada de EXAMEN */}
              {filteredActivities?.map(a => {
                const isExam = a.type === 'EXAMEN';
                const customDates = activityDates[a.id];
                const rawStart = customDates?.startDate || a.createdAt;
                const rawEnd = customDates?.endDate || customDates?.startDate || a.createdAt;
                const startFormatted = formatDisplayDate(rawStart);
                const endFormatted = formatDisplayDate(rawEnd);

                return (
                  <li
                    key={a.id}
                    className={`p-4 rounded-xl flex flex-wrap justify-between items-start gap-3 transition-all ${
                      isExam
                        ? 'border-l-4 border-l-rose-600 border border-rose-200 bg-rose-50/20 shadow-xs hover:bg-rose-50/35'
                        : 'border border-line bg-neutral/30 hover:bg-neutral/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Título de la actividad */}
                      <div className="flex items-center gap-2">
                        {isExam && (
                          <span className="text-rose-600" title="Examen programado">
                            <Award size={17} aria-hidden="true" />
                          </span>
                        )}
                        <h4 className={`font-bold text-sm break-words ${isExam ? 'text-rose-950 font-extrabold' : 'text-ink'}`}>
                          {a.title}
                        </h4>
                      </div>

                      {/* Debajo: Un solo icono de calendario y formato limpio de fechas */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted mt-1.5 font-medium">
                        <Calendar size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
                        <span>
                          Inicio: <strong className="text-ink font-semibold">{startFormatted}</strong>
                        </span>
                        <span className="text-muted/40 mx-1" aria-hidden="true">&bull;</span>
                        <span>
                          Fin: <strong className="text-ink font-semibold">{endFormatted}</strong>
                        </span>
                      </div>

                      {/* Badges indicando tipo y estado temporal */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {isExam ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-rose-100 text-rose-800 border border-rose-300 uppercase shadow-2xs">
                            Examen
                          </span>
                        ) : a.type === 'TAREA' ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            Tarea
                          </span>
                        ) : a.type === 'PRACTICA' ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            Práctica
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                            {a.type}
                          </span>
                        )}

                        {a.cuentaParaPa && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Cuenta para PA
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            a.status === 'PUBLICADA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : a.status === 'ANULADA'
                                ? 'bg-neutral text-muted border-line line-through'
                                : 'bg-white text-ink border-line'
                          }`}
                        >
                          Estado: {academicActivityStatusLabels[a.status]}
                        </span>
                      </div>
                    </div>

                    {/* Acción de ingreso tipo flecha */}
                    <div className="flex items-center gap-2 shrink-0 self-center">
                      <button
                        type="button"
                        disabled={busy || !!editing}
                        className="p-2.5 rounded-xl border border-line bg-white hover:bg-neutral text-muted hover:text-accent transition-all shadow-xs group focus-visible:outline-2 focus-visible:outline-accent"
                        onClick={() => {
                          setConfirming(null);
                          setSelectedId(a.id);
                        }}
                        title="Ingresar a la actividad"
                        aria-label={`Ver detalle #${a.id}`}
                      >
                        <ChevronRight size={18} className="stroke-[2.5]" aria-hidden="true" />
                        <span className="sr-only">Ver detalle #{a.id}</span>
                      </button>
                      {a.status === 'PLANIFICADA' && (
                        <button
                          type="button"
                          disabled={disabled || !!editing}
                          className="sr-only"
                          onClick={() => {
                            void startEdit(a.id);
                          }}
                        >
                          Editar #{a.id}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Modal / Card de Detalle de Actividad */}
          {selectedId !== null && (
            <section className="p-4 border border-line rounded-xl bg-white shadow-sm mt-2" aria-label="Detalle de actividad">
              <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-line">
                <h4 className="font-bold text-sm text-ink">Detalle de actividad</h4>
                <button
                  type="button"
                  disabled={busy}
                  className={`${button} bg-white`}
                  onClick={() => {
                    setConfirming(null);
                    setSelectedId(null);
                  }}
                >
                  Cerrar detalle
                </button>
              </div>
              {detail?.key !== detailKey ? (
                <p role="status" className="text-xs text-muted py-3">
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
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs break-words">
                    {Object.entries({
                      Actividad: `#${detail.data.id} · ${detail.data.title}`,
                      Descripción: detail.data.description ?? 'Sin descripción',
                      Tipo: detail.data.type,
                      Estado: academicActivityStatusLabels[detail.data.status],
                      'Cuenta para PA': detail.data.cuentaParaPa ? 'Sí' : 'No',
                      'Curso-sección': detail.data.sectionCourseId,
                      Bimestre: detail.data.bimesterId,
                      'ID docente creador': detail.data.createdByTeacherId,
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
                    <div className="mt-3 flex flex-col gap-2">
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
                    <p className="mt-3 text-[11px] text-muted">Publica la actividad para registrar sus notas.</p>
                  ) : (
                    <NotasActividadDocente
                      key={`${detail.data.id}:${detail.data.status}:${detailKey}`}
                      context={context}
                      activityId={detail.data.id}
                      disabled={disabled}
                      lockRef={lockRef}
                    />
                  )}
                </>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Edit3,
  GraduationCap,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { teacherCoursesService } from '@/services/teacher/teacherCoursesService';
import { teacherGradesService } from '@/services/teacher/teacherGradesService';
import {
  activityTitleError,
  annulmentReasonError,
  isUncertainActivityResult,
  teacherActivitiesErrorMessage,
  teacherActivitiesService
} from '@/services/teacher/teacherActivitiesService';
import NotasActividadDocente from './NotasActividadDocente';
import { ACADEMIC_ACTIVITY_TYPES } from '@/types/teacherActivitiesApi';
import type { AcademicActivity, AcademicActivityType, ActivityContext, UpdateAcademicActivityRequest } from '@/types/teacherActivitiesApi';
import type { TeacherCourseDetailResponse } from '@/types/teacherCoursesApi';
import type { Bimester } from '@/types/evaluationApi';

const button =
  'min-h-10 px-4 py-2 rounded-xl border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 transition-colors cursor-pointer';
const input =
  'w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink focus-visible:outline-accent text-xs';

export default function VistaDetalleActividadDocente() {
  const params = useParams<{ id: string; actividadId: string }>();
  const searchParams = useSearchParams();

  const sectionCourseId = Number(params?.id);
  const activityId = Number(params?.actividadId);
  const bimesterIdParam = searchParams?.get('bimesterId');

  const validCourse = Number.isSafeInteger(sectionCourseId) && sectionCourseId > 0;
  const validActivity = Number.isSafeInteger(activityId) && activityId > 0;

  if (!validCourse || !validActivity) {
    return (
      <div className="p-6 bg-white border border-line rounded-xl">
        <p className="text-sm text-rose-700">Parámetros de curso o actividad inválidos.</p>
        <Link href="/docente" className={`${button} bg-neutral/30 mt-4 inline-block`}>
          Volver a mis cursos
        </Link>
      </div>
    );
  }

  return (
    <ActivityDetailContainer
      sectionCourseId={sectionCourseId}
      activityId={activityId}
      initialBimesterId={bimesterIdParam ? Number(bimesterIdParam) : undefined}
    />
  );
}

function ActivityDetailContainer({
  sectionCourseId,
  activityId,
  initialBimesterId
}: {
  sectionCourseId: number;
  activityId: number;
  initialBimesterId?: number;
}) {
  const [course, setCourse] = useState<TeacherCourseDetailResponse | null>(null);
  const [resolvedBimester, setResolvedBimester] = useState<Bimester | null>(null);
  const [activity, setActivity] = useState<AcademicActivity | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'revisa_en_clase' | 'sube_imagen'>('revisa_en_clase');

  useEffect(() => {
    if (!activity) return;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`coraula_act_delivery_${activity.id}`);
      if (saved === 'sube_imagen' || saved === 'revisa_en_clase') {
        setDeliveryMode(saved);
        return;
      }
    }
    const text = `${activity.title} ${activity.description || ''}`.toLowerCase();
    if (
      text.includes('sube imagen') ||
      text.includes('subir imagen') ||
      text.includes('foto') ||
      text.includes('subir') ||
      text.includes('virtual') ||
      text.includes('tarea virtual')
    ) {
      setDeliveryMode('sube_imagen');
    } else {
      setDeliveryMode('revisa_en_clase');
    }
  }, [activity?.id, activity?.description, activity?.title]);

  const toggleDeliveryMode = () => {
    if (!activity) return;
    const next = deliveryMode === 'revisa_en_clase' ? 'sube_imagen' : 'revisa_en_clase';
    setDeliveryMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`coraula_act_delivery_${activity.id}`, next);
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Estados de confirmación de publicación y anulación
  const [confirming, setConfirming] = useState<'publish' | 'annul' | null>(null);
  const [annulReason, setAnnulReason] = useState('');
  const mutationLock = useRef(false);

  // Estados para Edición de Actividad
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    type: AcademicActivityType;
    cuentaParaPa: boolean;
  }>({
    title: '',
    description: '',
    type: 'TAREA',
    cuentaParaPa: false
  });
  const [editError, setEditError] = useState<string | null>(null);

  // 1. Cargar curso y resolver bimestre
  useEffect(() => {
    let current = true;
    const controller = new AbortController();

    Promise.allSettled([
      teacherCoursesService.getCourse(sectionCourseId),
      teacherGradesService.getBimesters(sectionCourseId, controller.signal)
    ]).then(([courseRes, bimestersRes]) => {
      if (!current) return;
      if (courseRes.status === 'fulfilled') {
        setCourse(courseRes.value);
      }
      if (bimestersRes.status === 'fulfilled') {
        const bList = bimestersRes.value;

        // Si tenemos initialBimesterId, usarlo
        if (initialBimesterId) {
          const match = bList.find(b => b.id === initialBimesterId);
          if (match) {
            setResolvedBimester(match);
            return;
          }
        }

        // Si no, buscar en qué bimestre existe esta actividad
        void (async () => {
          for (const b of bList) {
            try {
              const act = await teacherActivitiesService.getActivity(
                { sectionCourseId, bimesterId: b.id },
                activityId,
                controller.signal
              );
              if (current && act) {
                setResolvedBimester(b);
                setActivity(act);
                setLoading(false);
                return;
              }
            } catch {
              // Probar siguiente bimestre
            }
          }
          if (current) {
            setLoading(false);
            setError('No se encontró la actividad en los bimestres de este curso.');
          }
        })();
      } else {
        setError('Error al cargar bimestres del curso.');
        setLoading(false);
      }
    });

    return () => {
      current = false;
      controller.abort();
    };
  }, [sectionCourseId, activityId, initialBimesterId]);

  // 2. Cargar detalle de la actividad una vez resuelto el bimestre
  useEffect(() => {
    if (!resolvedBimester) return;
    let current = true;
    const controller = new AbortController();
    setLoading(true);

    teacherActivitiesService
      .getActivity({ sectionCourseId, bimesterId: resolvedBimester.id }, activityId, controller.signal)
      .then(act => {
        if (current) {
          setActivity(act);
          setLoading(false);
        }
      })
      .catch(err => {
        if (current) {
          setError(teacherActivitiesErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [sectionCourseId, activityId, resolvedBimester]);

  // Transiciones de publicación o anulación
  async function handleTransition(kind: 'publish' | 'annul') {
    if (!resolvedBimester || !activity || mutationLock.current || busy) return;
    if (kind === 'annul' && annulmentReasonError(annulReason)) return;

    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    setConfirming(null);

    const context: ActivityContext = { sectionCourseId, bimesterId: resolvedBimester.id };
    try {
      if (kind === 'publish') {
        await teacherActivitiesService.publishActivity(context, activity.id);
      } else {
        await teacherActivitiesService.annulActivity(context, activity.id, annulReason);
      }

      // Recargar actividad
      const updated = await teacherActivitiesService.getActivity(context, activity.id);
      setActivity(updated);
      setNotice(
        kind === 'publish'
          ? `Actividad «${updated.title}» publicada exitosamente. Ahora puedes registrar notas.`
          : `Actividad «${updated.title}» anulada. Sus notas se conservan como historial.`
      );
      if (kind === 'annul') setAnnulReason('');
    } catch (err) {
      if (isUncertainActivityResult(err)) {
        setError('La solicitud tardó en responder. Comprueba el estado actualizado de la actividad.');
      } else {
        setError(teacherActivitiesErrorMessage(err));
      }
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }

  // Abrir modal de edición con los datos vigentes
  function openEditModal() {
    if (!activity) return;
    setEditForm({
      title: activity.title,
      description: activity.description ?? '',
      type: activity.type,
      cuentaParaPa: activity.cuentaParaPa
    });
    setEditError(null);
    setIsEditModalOpen(true);
  }

  // Guardar edición
  async function handleSaveEdit() {
    if (!activity || !resolvedBimester || mutationLock.current || busy) return;
    const isPlan = activity.status === 'PLANIFICADA';
    const titleErr = activityTitleError(editForm.title);
    if (isPlan && titleErr) {
      setEditError(titleErr);
      return;
    }

    mutationLock.current = true;
    setBusy(true);
    setEditError(null);
    setError(null);
    setNotice(null);

    const context: ActivityContext = { sectionCourseId, bimesterId: resolvedBimester.id };
    try {
      const changes: UpdateAcademicActivityRequest = isPlan
        ? {
            title: editForm.title.trim(),
            description: editForm.description.trim() || null,
            type: editForm.type,
            cuentaParaPa: editForm.cuentaParaPa
          }
        : {
            cuentaParaPa: editForm.cuentaParaPa
          };

      const updated = await teacherActivitiesService.updateActivity(context, activity.id, changes);
      setActivity(updated);
      setIsEditModalOpen(false);
      setNotice(`Actividad «${updated.title}» actualizada correctamente.`);
    } catch (err) {
      setEditError(teacherActivitiesErrorMessage(err));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }

  const isExam = activity?.type === 'EXAMEN';
  const isPublished = activity?.status === 'PUBLICADA';
  const isAnnulled = activity?.status === 'ANULADA';
  const isPlanned = activity?.status === 'PLANIFICADA';
  const windowOpen = resolvedBimester?.status === 'ABIERTO';

  return (
    <div className="flex flex-col gap-6">
      {/* Botón Volver al curso */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/docente/cursos/${sectionCourseId}`}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-line rounded-lg shadow-xs text-xs font-bold text-muted hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeft size={16} />
          <span>Volver al curso {course ? `(${course.name} - ${course.grade}° ${course.sectionName})` : ''}</span>
        </Link>

        {course && (
          <span className="text-xs text-muted font-medium bg-neutral/20 px-3 py-1.5 rounded-lg border border-line">
            {course.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · {course.grade}° grado · Sección {course.sectionName}
          </span>
        )}
      </div>

      {/* Alertas de notificación y error */}
      {notice && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p>{notice}</p>
        </div>
      )}
      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs font-medium text-rose-800">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-muted bg-white border border-line rounded-xl">
          Cargando información de la actividad...
        </div>
      ) : activity && resolvedBimester ? (
        <>
          {/* Tarjeta Superior de Detalle de la Actividad (Header Limpio con Ojito y Edición) */}
          <section className="bg-white p-6 rounded-2xl border border-line shadow-xs flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  {isExam ? (
                    <span className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0 mt-0.5" title="Examen programado">
                      <Award size={24} />
                    </span>
                  ) : (
                    <span className="p-2.5 rounded-xl bg-accent/10 text-accent shrink-0 mt-0.5">
                      <FileText size={24} />
                    </span>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {/* Título de la actividad con el badge de ojito 'Publicada / Borrador' inmediatamente al lado */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-lg sm:text-2xl font-bold text-ink break-words">
                        {activity.title}
                      </h1>

                      {/* Badge con ojito Publicada / Borrador */}
                      {isPublished ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1.5 shadow-2xs">
                          <Eye size={14} className="text-emerald-600" aria-hidden="true" />
                          <span>Publicada</span>
                          <span className="sr-only">Estado: Publicada</span>
                        </span>
                      ) : isPlanned ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-1.5 shadow-2xs">
                          <EyeOff size={14} className="text-amber-600" aria-hidden="true" />
                          <span>Borrador</span>
                          <span className="sr-only">Estado: Planificada</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-line bg-neutral text-muted flex items-center gap-1.5 line-through">
                          <EyeOff size={14} className="text-muted" aria-hidden="true" />
                          <span>Anulada</span>
                          <span className="sr-only">Estado: Anulada</span>
                        </span>
                      )}

                      {/* Badge de Tipo */}
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-neutral/40 text-ink border border-line uppercase">
                        {activity.type}
                      </span>

                      {/* Badge de Ponderación para PA */}
                      {activity.cuentaParaPa ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          ⭐ Cuenta para PA
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-neutral/20 text-muted border border-line">
                          Formativa (Sin PA)
                        </span>
                      )}

                      {/* Badge de Modalidad: Revisa en clase vs Sube imagen */}
                      {deliveryMode === 'sube_imagen' ? (
                        <button
                          type="button"
                          onClick={toggleDeliveryMode}
                          title="Modalidad: El estudiante debe subir su tarea o imagen. Clic para alternar a revisión en clase."
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100 transition-colors shadow-2xs"
                        >
                          <ImageIcon size={12} aria-hidden="true" />
                          <span>Sube imagen</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={toggleDeliveryMode}
                          title="Modalidad: Se revisa en clase presencial. Clic para alternar a subida de imagen."
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5 cursor-pointer hover:bg-teal-100 transition-colors shadow-2xs"
                        >
                          <GraduationCap size={12} aria-hidden="true" />
                          <span>Revisa en clase</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{resolvedBimester.name} · {course?.name}</span>
                      <span className="text-muted/40 font-bold">&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>Creada el {new Date(activity.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {activity.description && (
                  <div className="text-xs text-muted/90 mt-4 whitespace-pre-wrap bg-neutral/20 p-4 rounded-xl border border-line/60">
                    <p className="font-semibold text-[11px] text-muted uppercase tracking-wider mb-1">Instrucciones / Descripción:</p>
                    <p>{activity.description}</p>
                  </div>
                )}
              </div>

              {/* Acciones principales: Editar actividad / Publicar / Anular */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start">
                {!isAnnulled && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={openEditModal}
                    className={`${button} bg-white hover:bg-neutral text-ink flex items-center gap-1.5 shadow-xs`}
                  >
                    <Edit3 size={15} />
                    <span>Editar actividad</span>
                  </button>
                )}

                {windowOpen && isPlanned && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming('publish')}
                    className="min-h-10 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    Publicar actividad
                  </button>
                )}

                {windowOpen && !isAnnulled && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming('annul')}
                    className={`${button} bg-white text-rose-700 hover:bg-rose-50 border-rose-200`}
                  >
                    Anular actividad
                  </button>
                )}
              </div>
            </div>

            {/* Diálogo de Confirmación para Publicar o Anular */}
            {confirming && (
              <div
                role="group"
                className="p-4 border border-amber-200 bg-amber-50 rounded-xl text-xs text-amber-950 flex flex-col gap-3"
              >
                <p className="font-semibold">
                  {confirming === 'publish'
                    ? `¿Publicar «${activity.title}»? Habilitará la planilla para calificar a los estudiantes y, si cuenta para PA, entrará al cálculo del promedio.`
                    : `¿Anular «${activity.title}»? Saldrá del cálculo del promedio de actividades (PA) y no admitirá nuevas calificaciones.`}
                </p>

                {confirming === 'annul' && (
                  <label className="font-bold">
                    Motivo de anulación (obligatorio):
                    <textarea
                      aria-label="Motivo de anulación"
                      rows={2}
                      maxLength={1000}
                      className={input}
                      placeholder="Indica el motivo..."
                      value={annulReason}
                      onChange={e => setAnnulReason(e.target.value)}
                    />
                  </label>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy || (confirming === 'annul' && !annulReason.trim())}
                    className={`${button} ${confirming === 'publish' ? 'bg-accent' : 'bg-rose-700'} text-white`}
                    onClick={() => void handleTransition(confirming)}
                  >
                    {confirming === 'publish' ? 'Confirmar publicación' : 'Confirmar anulación'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={`${button} bg-white`}
                    onClick={() => setConfirming(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Modal para Editar la Actividad */}
          {isEditModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-activity-modal-title"
            >
              <div className="bg-white rounded-2xl border border-line shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 relative flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <h3 id="edit-activity-modal-title" className="font-bold text-base text-ink">
                    Editar Actividad #{activity.id}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-neutral transition-colors cursor-pointer"
                    aria-label="Cerrar modal de edición"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    void handleSaveEdit();
                  }}
                  className="flex flex-col gap-4"
                >
                  <fieldset disabled={busy} className="flex flex-col gap-3 text-xs font-bold text-muted">
                    {isPlanned ? (
                      <>
                        <label>
                          Título de la actividad
                          <input
                            required
                            maxLength={255}
                            className={input}
                            value={editForm.title}
                            onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </label>

                        <label>
                          Tipo de actividad
                          <select
                            className={input}
                            value={editForm.type}
                            onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value as AcademicActivityType }))}
                          >
                            {ACADEMIC_ACTIVITY_TYPES.map(t => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Descripción / Instrucciones (opcional)
                          <textarea
                            rows={3}
                            className={input}
                            value={editForm.description}
                            onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </label>

                        <label className="flex items-center gap-2 min-h-8 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editForm.cuentaParaPa}
                            onChange={e => setEditForm(prev => ({ ...prev, cuentaParaPa: e.target.checked }))}
                          />
                          Cuenta para PA (Promedio de Actividades)
                        </label>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-normal">
                          Esta actividad está <strong>Publicada</strong>. El título y tipo están bloqueados para proteger la integridad de las notas registradas. Puedes modificar si promedia en el PA.
                        </div>

                        <div>
                          <span className="text-[11px] text-muted font-bold uppercase">Título:</span>
                          <p className="text-sm font-bold text-ink mt-0.5">{activity.title}</p>
                        </div>

                        <div>
                          <span className="text-[11px] text-muted font-bold uppercase">Tipo:</span>
                          <p className="text-xs font-semibold text-ink mt-0.5">{activity.type}</p>
                        </div>

                        <label className="flex items-center gap-2 min-h-8 cursor-pointer select-none pt-2 border-t border-line">
                          <input
                            type="checkbox"
                            checked={editForm.cuentaParaPa}
                            onChange={e => setEditForm(prev => ({ ...prev, cuentaParaPa: e.target.checked }))}
                          />
                          Cuenta para PA (Promedio de Actividades)
                        </label>
                      </>
                    )}
                  </fieldset>

                  {editError && <p role="alert" className="text-rose-700 text-xs font-medium">{editError}</p>}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-line">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setIsEditModalOpen(false)}
                      className={`${button} bg-white hover:bg-neutral`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className={`${button} bg-accent text-white hover:bg-accent/90`}
                    >
                      Guardar cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Sección de Calificaciones de los Alumnos */}
          <section className="bg-white p-6 rounded-2xl border border-line shadow-xs flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-ink">
                Planilla de Calificaciones
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Ingresa y guarda las notas de los estudiantes para esta actividad.
              </p>
            </div>

            {isPlanned ? (
              <div className="p-8 border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-3 bg-neutral/10">
                <p className="text-xs text-muted max-w-md">
                  Esta actividad está guardada como <strong>Borrador</strong>. Debes <strong>Publicarla</strong> para habilitar la planilla de calificaciones y registrar notas a los alumnos.
                </p>
                {windowOpen && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming('publish')}
                    className="min-h-10 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Publicar actividad ahora
                  </button>
                )}
              </div>
            ) : (
              <NotasActividadDocente
                context={{ sectionCourseId, bimesterId: resolvedBimester.id }}
                activityId={activity.id}
                disabled={busy}
                lockRef={mutationLock}
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

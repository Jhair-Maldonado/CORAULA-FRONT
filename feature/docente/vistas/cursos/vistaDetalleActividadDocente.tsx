'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Award,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import { teacherGradesService, teacherGradesErrorMessage } from '@/services/teacher/teacherGradesService';
import {
  annulmentReasonError,
  isUncertainActivityResult,
  teacherActivitiesErrorMessage,
  teacherActivitiesService
} from '@/services/teacher/teacherActivitiesService';
import NotasActividadDocente from './NotasActividadDocente';
import { academicActivityStatusLabels } from '@/types/teacherActivitiesApi';
import type { AcademicActivity, ActivityContext } from '@/types/teacherActivitiesApi';
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
  const [bimesters, setBimesters] = useState<Bimester[]>([]);
  const [resolvedBimester, setResolvedBimester] = useState<Bimester | null>(null);
  const [activity, setActivity] = useState<AcademicActivity | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [confirming, setConfirming] = useState<'publish' | 'annul' | null>(null);
  const [annulReason, setAnnulReason] = useState('');
  const mutationLock = useRef(false);

  // 1. Cargar curso y bimestres
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
        setBimesters(bList);

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
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-line rounded-lg shadow-xs text-xs font-bold text-muted hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-accent"
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
          {/* Tarjeta Superior de Detalle de la Actividad */}
          <section className="bg-white p-6 rounded-2xl border border-line shadow-xs flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-line">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  {isExam ? (
                    <span className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                      <Award size={22} />
                    </span>
                  ) : (
                    <span className="p-2 rounded-xl bg-accent/10 text-accent shrink-0">
                      <FileText size={22} />
                    </span>
                  )}
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-ink break-words">
                      {activity.title}
                    </h1>
                    <p className="text-xs text-muted mt-0.5">
                      {resolvedBimester.name} · {course?.name}
                    </p>
                  </div>
                </div>

                {activity.description && (
                  <p className="text-xs text-muted/90 mt-3 whitespace-pre-wrap bg-neutral/20 p-3.5 rounded-xl border border-line/60">
                    {activity.description}
                  </p>
                )}
              </div>

              {/* Acciones principales de la actividad (Publicar / Anular) */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start">
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

            {/* Fila de Metadatos y Badges */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Badge de Estado con punto de color */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : isAnnulled
                      ? 'bg-neutral text-muted border-line line-through'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isPublished ? 'bg-emerald-600' : isAnnulled ? 'bg-muted' : 'bg-amber-500'
                  }`}
                  aria-hidden="true"
                />
                <span>{academicActivityStatusLabels[activity.status]}</span>
              </span>

              {/* Badge de Tipo */}
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-neutral/30 text-ink border border-line uppercase">
                {activity.type}
              </span>

              {/* Cómputo para PA */}
              {activity.cuentaParaPa ? (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Cuenta para PA
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium text-muted border border-line">
                  No cuenta para PA
                </span>
              )}

              <span className="text-muted/40 font-bold mx-1">&bull;</span>

              <span className="text-xs text-muted flex items-center gap-1">
                <Clock size={13} className="text-slate-400" />
                <span>Creada el {new Date(activity.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </span>
            </div>
          </section>

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
                  Esta actividad está <strong>Planificada</strong>. Debes <strong>Publicarla</strong> para habilitar el registro de notas y calificar a los alumnos.
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

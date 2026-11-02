'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Quote,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { MensajeDocenteItem } from '@/types/docentes';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import {
  teacherIncidentsService,
  teacherIncidentsErrorMessage,
  isUncertainIncidentRegistration,
  incidentLocationError,
  incidentDescriptionError,
  nowLimaDateTimeLocal,
  limaDateTimeToIso,
  UNCERTAIN_INCIDENT_MESSAGE
} from '@/services/teacher/teacherIncidentsService';
import type { TeacherCourseStudentResponse, TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';
import { INCIDENT_LOCATION_MAX, INCIDENT_TEXT_MAX } from '@/types/incidenciasApi';
import type { GravedadIncidencia, IncidenciaResponse } from '@/types/incidenciasApi';

export type { GravedadIncidencia };

interface ModalReportarIncidenciaProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentSubtitle?: string;
  mensaje: MensajeDocenteItem | null;
  /** Se invoca solo cuando el backend confirmó el registro. */
  onReported: (incident: IncidenciaResponse, mensajeId: string) => void;
}

const LUGAR_CHAT = 'Chat / Canal virtual';

const GRAVEDADES: {
  value: GravedadIncidencia;
  label: string;
  badgeClass: string;
  description: string;
}[] = [
  {
    value: 'LEVE',
    label: 'Leve',
    badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-500',
    description: 'Distracción, retraso o falta menor sin reincidencia.'
  },
  {
    value: 'MODERADA',
    label: 'Moderada',
    badgeClass: 'border-amber-300 bg-amber-50 text-amber-800 focus:ring-amber-500',
    description: 'Incumplimiento reiterado, evasión o falta de respeto leve.'
  },
  {
    value: 'GRAVE',
    label: 'Grave',
    badgeClass: 'border-rose-300 bg-rose-50 text-rose-800 focus:ring-rose-500',
    description: 'Agresión, hostigamiento, daño o falta grave al reglamento.'
  }
];

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export default function ModalReportarIncidencia({
  isOpen,
  onClose,
  studentName,
  studentSubtitle,
  mensaje,
  onReported
}: ModalReportarIncidenciaProps) {
  const [gravedad, setGravedad] = useState<GravedadIncidencia>('MODERADA');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState(LUGAR_CHAT);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Contexto real del docente: el contacto del chat es simulado y no aporta matrícula.
  const [courses, setCourses] = useState<TeacherCourseSummaryResponse[]>([]);
  const [coursesError, setCoursesError] = useState('');
  const [sectionCourseId, setSectionCourseId] = useState<number | ''>('');
  const [students, setStudents] = useState<TeacherCourseStudentResponse[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [enrollmentId, setEnrollmentId] = useState<number | ''>('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setCoursesError('');
    teacherCoursesService
      .getCourses()
      .then(data => {
        if (!active) return;
        setCourses(data);
        setSectionCourseId(prev => (prev !== '' && data.some(c => c.sectionCourseId === prev) ? prev : data[0]?.sectionCourseId ?? ''));
      })
      .catch(err => {
        if (active) setCoursesError(teacherCoursesErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || sectionCourseId === '') {
      setStudents([]);
      setEnrollmentId('');
      return;
    }
    let active = true;
    setStudentsLoading(true);
    setStudentsError('');
    setEnrollmentId('');
    teacherCoursesService
      .getStudents(sectionCourseId)
      .then(data => {
        if (!active) return;
        setStudents(data);
        // Preselección por coincidencia exacta de nombre; el docente puede corregirla.
        const matches = data.filter(s => normalize(s.fullName) === normalize(studentName));
        setEnrollmentId(matches.length === 1 ? matches[0].enrollmentId : '');
      })
      .catch(err => {
        if (active) setStudentsError(teacherCoursesErrorMessage(err));
      })
      .finally(() => {
        if (active) setStudentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, sectionCourseId, studentName]);

  if (!isOpen || !mensaje) return null;

  const handleClose = () => {
    setError('');
    setUncertain(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setUncertain(false);
    if (sectionCourseId === '' || enrollmentId === '') {
      setError('Selecciona el curso y el estudiante implicado.');
      return;
    }
    const textError = incidentLocationError(lugar) ?? incidentDescriptionError(descripcion);
    if (textError) {
      setError(textError);
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const saved = await teacherIncidentsService.registerIncident({
        sectionCourseId,
        enrollmentId,
        occurredAt: limaDateTimeToIso(nowLimaDateTimeLocal()),
        location: lugar,
        severity: gravedad,
        description: descripcion,
        actionsTaken: null
      });
      setSuccess(true);
      onReported(saved, mensaje.id);
      setTimeout(() => {
        setSuccess(false);
        setDescripcion('');
        setGravedad('MODERADA');
        setLugar(LUGAR_CHAT);
        onClose();
      }, 1400);
    } catch (err) {
      if (isUncertainIncidentRegistration(err)) setUncertain(true);
      else setError(teacherIncidentsErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-line animate-in zoom-in-95 duration-150">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-line flex items-start justify-between gap-3 bg-white">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shrink-0 mt-0.5">
              <ShieldAlert size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="report-modal-title" className="text-base sm:text-lg font-bold text-ink">
                Reportar Incidencia Disciplinaria
              </h3>
              <p className="text-xs text-muted truncate mt-0.5">
                Contacto del chat: <strong className="text-ink">{studentName}</strong>
                {studentSubtitle ? ` · ${studentSubtitle}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-muted hover:text-ink hover:bg-neutral/40 rounded-lg transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Contexto: Mensaje del chat (mensajería simulada) */}
            <div className="bg-neutral/20 border border-line rounded-xl p-3 sm:p-4">
              <AvisoModuloSimulado activo={true} className="mb-2" detalle="la mensajería del chat es de demostración; el mensaje no se adjunta como evidencia de la incidencia." />
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                <Quote size={13} className="text-accent shrink-0" aria-hidden="true" />
                <span>Mensaje del chat</span>
                <span className="ml-auto font-normal text-muted lowercase">
                  ({mensaje.hora})
                </span>
              </div>
              <p className="text-xs text-ink font-medium italic bg-white p-2.5 rounded-lg border border-line/60 break-words">
                &ldquo;{mensaje.texto}&rdquo;
              </p>
            </div>

            {/* Curso y estudiante reales del docente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-ink">
                Curso / Sección <span className="text-rose-600">*</span>
                <select
                  aria-label="Curso de la incidencia"
                  value={sectionCourseId}
                  onChange={e => setSectionCourseId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-white text-ink text-xs font-semibold focus-visible:outline-accent"
                >
                  {courses.length === 0 && <option value="">No hay cursos asignados</option>}
                  {courses.map(c => (
                    <option key={c.sectionCourseId} value={c.sectionCourseId}>
                      {c.name} — {c.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} {c.grade}° {c.sectionName}
                    </option>
                  ))}
                </select>
                {coursesError && <span className="block mt-1 text-[11px] font-normal text-rose-600">{coursesError}</span>}
              </label>
              <label className="block text-xs font-bold text-ink">
                Estudiante implicado <span className="text-rose-600">*</span>
                <select
                  aria-label="Estudiante de la incidencia"
                  value={enrollmentId}
                  disabled={studentsLoading}
                  onChange={e => setEnrollmentId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-white text-ink text-xs font-semibold focus-visible:outline-accent"
                >
                  <option value="">{studentsLoading ? 'Cargando alumnos...' : 'Selecciona un estudiante'}</option>
                  {students.map(s => (
                    <option key={s.enrollmentId} value={s.enrollmentId}>
                      {s.fullName}{s.studentCode ? ` (${s.studentCode})` : ''}
                    </option>
                  ))}
                </select>
                {studentsError && <span className="block mt-1 text-[11px] font-normal text-rose-600">{studentsError}</span>}
              </label>
            </div>

            <label className="block text-xs font-bold text-ink">
              Lugar / Contexto <span className="text-rose-600">*</span>
              <input
                type="text"
                required
                maxLength={INCIDENT_LOCATION_MAX}
                value={lugar}
                onChange={e => setLugar(e.target.value)}
                className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-white text-ink text-xs font-semibold focus-visible:outline-accent"
              />
            </label>

            {/* Selector de Gravedad */}
            <div>
              <label className="block text-xs font-bold text-ink mb-2">
                Nivel de gravedad <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GRAVEDADES.map((g) => {
                  const isSelected = gravedad === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGravedad(g.value)}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? `${g.badgeClass} ring-2 shadow-xs`
                          : 'border-line bg-white hover:bg-neutral/20 text-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">{g.label}</span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-accent bg-accent'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <span className="text-[10px] leading-tight text-muted mt-1">
                        {g.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo: ¿Qué pasó? / Descripción obligatoria */}
            <div>
              <label htmlFor="incidencia-descripcion" className="block text-xs font-bold text-ink mb-1.5">
                ¿Qué pasó? / Descripción detallada <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="incidencia-descripcion"
                rows={4}
                required
                maxLength={INCIDENT_TEXT_MAX}
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Indica qué ocurrió, antecedentes, si hubo provocación o detalles disciplinarios a registrar en el historial..."
                className="w-full p-3 rounded-xl border border-line bg-white text-xs text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent transition-all resize-none"
              />
              <p className="text-[11px] text-muted text-right mt-1">
                {descripcion.length}/{INCIDENT_TEXT_MAX} caracteres
              </p>
            </div>

            {/* Notificaciones de éxito, error o resultado incierto */}
            {error && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {uncertain && (
              <div role="alert" className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <span>{UNCERTAIN_INCIDENT_MESSAGE}</span>
              </div>
            )}

            {success && (
              <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>Incidencia registrada en el historial.</span>
              </div>
            )}
          </div>

          {/* Pie de acciones */}
          <div className="p-4 border-t border-line bg-neutral/10 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-line bg-white hover:bg-neutral text-xs font-bold text-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || success || !descripcion.trim() || enrollmentId === ''}
              className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Registrar incidencia</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Check, CheckCircle2, Calendar, Loader2, ShieldAlert, FileText } from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import { teacherAttendanceService, teacherAttendanceErrorMessage } from '@/services/teacher/teacherAttendanceService';
import type { TeacherCourseStudentResponse } from '@/types/teacherCoursesApi';
import type { TeacherAttendanceStatus, TeacherContingencyCause, TeacherAttendanceSessionResponse } from '@/types/teacherAttendanceApi';

interface ModalAsistenciaCursoProps {
  isOpen: boolean;
  onClose: () => void;
  sectionCourseId: number;
  courseName: string;
  gradeSectionSubtitle: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CONTINGENCY_CAUSES: { value: TeacherContingencyCause; label: string }[] = [
  { value: 'LECTOR_NO_DISPONIBLE', label: 'Lector biométrico no disponible' },
  { value: 'FALLA_CONECTIVIDAD', label: 'Falla de conectividad' },
  { value: 'HUELLA_NO_RECONOCIDA', label: 'Huella no reconocida' },
  { value: 'CAIDA_SISTEMA', label: 'Caída del sistema' }
];

const NO_SESSION_TODAY_MESSAGE =
  'Este curso no tiene una sesión de clase programada para hoy. La asistencia no se registró.';

function getTodayInfo(): { iso: string; readable: string } {
  const now = new Date();
  const day = now.getDate();
  const monthName = MONTH_NAMES[now.getMonth()] || '';
  const year = now.getFullYear();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${year}-${pad(now.getMonth() + 1)}-${pad(day)}`;
  return {
    iso,
    readable: `Hoy, ${day} de ${monthName}`
  };
}

export default function ModalAsistenciaCurso({
  isOpen,
  onClose,
  sectionCourseId,
  courseName,
  gradeSectionSubtitle
}: ModalAsistenciaCursoProps) {
  const [students, setStudents] = useState<TeacherCourseStudentResponse[]>([]);
  const [activeSession, setActiveSession] = useState<TeacherAttendanceSessionResponse | null>(null);
  const [initialStatuses, setInitialStatuses] = useState<Record<number, TeacherAttendanceStatus | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceDraft, setAttendanceDraft] = useState<Record<number, TeacherAttendanceStatus>>({});
  
  // Sin integración con el lector biométrico, toda toma desde esta pantalla es manual:
  // primera toma = contingencia (causa + motivo); corrección = solo motivo.
  // Contingencia & Justificación (RF-16 / RF-42)
  const [contingencyCause, setContingencyCause] = useState<TeacherContingencyCause>('LECTOR_NO_DISPONIBLE');
  const [reason, setReason] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const todayInfo = getTodayInfo();

  useEffect(() => {
    if (!isOpen || !sectionCourseId) return;

    let active = true;
    setLoading(true);
    setError('');
    setSaveSuccess('');
    setSaveError('');
    setReason('');
    setContingencyCause('LECTOR_NO_DISPONIBLE');

    Promise.all([
      teacherCoursesService.getStudents(sectionCourseId),
      teacherAttendanceService.getAttendance(sectionCourseId, todayInfo.iso).catch(() => null)
    ])
      .then(([studentsData, attendanceData]) => {
        if (!active) return;
        setStudents(studentsData);

        const session = attendanceData?.sessions?.[0] || null;
        setActiveSession(session);

        const initialMap: Record<number, TeacherAttendanceStatus | null> = {};
        const draftMap: Record<number, TeacherAttendanceStatus> = {};

        if (session && session.students?.length > 0) {
          session.students.forEach(st => {
            initialMap[st.enrollmentId] = st.status;
            // Se conserva el estado guardado; sin registro, PRESENTE como antes de #123
            draftMap[st.enrollmentId] = st.status || 'PRESENTE';
          });
        }

        studentsData.forEach(s => {
          if (initialMap[s.enrollmentId] === undefined) {
            initialMap[s.enrollmentId] = null;
          }
          if (!draftMap[s.enrollmentId]) {
            draftMap[s.enrollmentId] = 'PRESENTE';
          }
        });

        setInitialStatuses(initialMap);
        setAttendanceDraft(draftMap);
      })
      .catch(err => {
        if (active) setError(teacherCoursesErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, sectionCourseId, todayInfo.iso]);

  // Determinar si es primera toma o corrección
  const isFirstCapture = useMemo(() => {
    if (students.length === 0) return true;
    // Si algún estudiante no tenía registro guardado previo, es primera toma
    return students.some(s => initialStatuses[s.enrollmentId] == null);
  }, [students, initialStatuses]);

  // Determinar si hubo cambios con respecto a lo guardado
  const hasChanges = useMemo(() => {
    return students.some(s => {
      const prev = initialStatuses[s.enrollmentId] ?? null;
      const cur = attendanceDraft[s.enrollmentId] ?? 'PRESENTE';
      return prev !== cur;
    });
  }, [students, initialStatuses, attendanceDraft]);

  // Primera toma: causa y motivo obligatorios. Corrección con cambios: solo motivo.
  const isReasonRequired = isFirstCapture || hasChanges;
  const trimmedReason = reason.trim();
  const isReasonValid = !isReasonRequired || (trimmedReason.length > 0 && trimmedReason.length <= 255);

  if (!isOpen) return null;

  const markAll = (status: TeacherAttendanceStatus) => {
    const updated: Record<number, TeacherAttendanceStatus> = {};
    students.forEach(s => {
      updated[s.enrollmentId] = status;
    });
    setAttendanceDraft(updated);
  };

  const handleSave = async () => {
    if (students.length === 0 || saving) return;
    if (isReasonRequired && trimmedReason.length === 0) {
      setSaveError('El motivo es obligatorio al registrar o corregir asistencia manualmente.');
      return;
    }
    if (trimmedReason.length > 255) {
      setSaveError('El motivo no puede superar los 255 caracteres.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      let targetSession = activeSession;
      if (!targetSession) {
        const attendanceData = await teacherAttendanceService.getAttendance(sectionCourseId, todayInfo.iso);
        targetSession = attendanceData?.sessions?.[0] || null;
      }

      // Sin sesión programada no hay dónde guardar: nunca se anuncia un registro que no ocurrió.
      if (!targetSession) {
        setSaveError(NO_SESSION_TODAY_MESSAGE);
        return;
      }

      const records = students.map(s => ({
        enrollmentId: s.enrollmentId,
        status: attendanceDraft[s.enrollmentId] || 'PRESENTE'
      }));

      await teacherAttendanceService.saveAttendance(sectionCourseId, targetSession.scheduleId, todayInfo.iso, {
        records,
        reason: trimmedReason || undefined,
        contingencyCause: isFirstCapture ? contingencyCause : undefined
      });

      setSaveSuccess('Asistencia registrada exitosamente.');
      setTimeout(() => {
        onClose();
        setSaveSuccess('');
      }, 1200);
    } catch (err) {
      setSaveError(teacherAttendanceErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registrar asistencia"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-line animate-in zoom-in-95 duration-150">
        {/* Cabecera Limpia */}
        <div className="p-4 sm:p-5 border-b border-line flex items-start justify-between gap-3 bg-white">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-ink">Registrar Asistencia</h3>
            <p className="text-xs text-muted truncate mt-0.5">
              {courseName} &bull; {gradeSectionSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-ink hover:bg-neutral/40 rounded-lg transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Subbarra de Acción Rápida y Fecha del Día */}
        <div className="px-4 py-3 bg-neutral/20 border-b border-line flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => markAll('PRESENTE')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <Check size={14} aria-hidden="true" />
            Marcar todos presentes
          </button>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-line shadow-2xs">
            <Calendar size={13} className="text-accent shrink-0" aria-hidden="true" />
            <span>{todayInfo.readable}</span>
          </div>
        </div>

        {/* Notificaciones de Éxito o Error */}
        {saveSuccess && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {saveError}
          </div>
        )}
        {/* Lista Compacta de Estudiantes */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {loading ? (
            <p className="text-center py-8 text-xs text-muted">Cargando estudiantes...</p>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs text-center">
              <p>{error}</p>
            </div>
          ) : students.length === 0 ? (
            <p className="text-center py-8 text-xs text-muted">No hay estudiantes matriculados en esta sección.</p>
          ) : (
            <>
              {students.map((student, idx) => {
                const currentStatus = attendanceDraft[student.enrollmentId] || 'PRESENTE';
                return (
                  <div
                    key={student.enrollmentId}
                    className="px-3.5 py-2.5 rounded-xl border border-line bg-white hover:bg-neutral/15 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold text-muted w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-semibold text-xs sm:text-sm text-ink truncate">
                        {student.fullName}
                      </span>
                    </div>

                    {/* Selector P / T / F */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setAttendanceDraft(prev => ({ ...prev, [student.enrollmentId]: 'PRESENTE' }))
                        }
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center border-2 ${
                          currentStatus === 'PRESENTE'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50'
                        }`}
                        title="Presente"
                        aria-label={`Marcar Presente a ${student.fullName}`}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAttendanceDraft(prev => ({ ...prev, [student.enrollmentId]: 'TARDANZA' }))
                        }
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center border-2 ${
                          currentStatus === 'TARDANZA'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-200'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/50'
                        }`}
                        title="Tardanza"
                        aria-label={`Marcar Tardanza a ${student.fullName}`}
                      >
                        T
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAttendanceDraft(prev => ({ ...prev, [student.enrollmentId]: 'INASISTENCIA' }))
                        }
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center border-2 ${
                          currentStatus === 'INASISTENCIA'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-rose-500 hover:text-rose-700 hover:bg-rose-50/50'
                        }`}
                        title="Falta / Inasistencia"
                        aria-label={`Marcar Falta a ${student.fullName}`}
                      >
                        F
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Contingencia (primera toma) o corrección manual */}
              <div className="mt-2 pt-3 border-t border-line space-y-3 bg-neutral/10 p-3 rounded-xl animate-in fade-in duration-150">
                {isFirstCapture ? (
                  <div>
                    <label
                      htmlFor="contingency-cause-select"
                      className="flex items-center gap-1.5 text-xs font-bold text-ink mb-1.5"
                    >
                      <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                      <span>Causa de contingencia</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="contingency-cause-select"
                      value={contingencyCause}
                      onChange={e => setContingencyCause(e.target.value as TeacherContingencyCause)}
                      className="w-full text-xs font-semibold text-ink bg-white border border-line rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-accent focus:outline-none"
                    >
                      {CONTINGENCY_CAUSES.map(c => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <ShieldAlert size={14} className="text-blue-500 shrink-0" />
                    <span>Modo corrección de asistencia (se conserva causa original de contingencia)</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="attendance-reason-input"
                      className="flex items-center gap-1.5 text-xs font-bold text-ink"
                    >
                      <FileText size={14} className="text-accent shrink-0" />
                      <span>Motivo / Justificación</span>
                      {isReasonRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <span className={`text-[10px] font-bold ${reason.length > 255 ? 'text-rose-600' : 'text-muted'}`}>
                      {reason.length}/255
                    </span>
                  </div>
                  <input
                    id="attendance-reason-input"
                    type="text"
                    maxLength={255}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={
                      isFirstCapture
                        ? 'Ej. Registro regular de asistencia en aula por falta de lector'
                        : 'Ej. Corrección por ingreso justificado del estudiante'
                    }
                    className={`w-full text-xs text-ink bg-white border rounded-lg px-2.5 py-2 placeholder:text-muted/70 focus:outline-none focus:ring-2 ${
                      reason.length > 255
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-line focus:ring-accent'
                    }`}
                  />
                  {isReasonRequired && trimmedReason.length === 0 && (
                    <p className="text-[10px] text-muted mt-1">
                      El motivo es obligatorio en el registro manual de asistencia.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="p-4 border-t border-line bg-neutral/10 flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-muted">
            {students.length > 0 ? `${students.length} alumnos en lista` : ''}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-line bg-white hover:bg-neutral text-xs font-bold text-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || students.length === 0 || !isReasonValid || (isReasonRequired && trimmedReason.length === 0)}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar asistencia</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

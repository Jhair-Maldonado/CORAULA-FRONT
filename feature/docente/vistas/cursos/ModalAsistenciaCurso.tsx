'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Check, CheckCircle2, Calendar, Loader2 } from 'lucide-react';
import JustificacionAsistencia from '@/components/attendance/JustificacionAsistencia';
import SelectorEstadoAsistencia from '@/components/attendance/SelectorEstadoAsistencia';
import {
  ATTENDANCE_REASON_MAX_LENGTH,
  DEFAULT_CONTINGENCY_CAUSE,
  REASON_REQUIRED_MESSAGE,
  REASON_TOO_LONG_MESSAGE,
  hasAttendanceChanges,
  isFirstCapture as firstCaptureOf,
  isReasonValid as reasonValid
} from '@/lib/attendanceJustification';
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
  const [contingencyCause, setContingencyCause] = useState<TeacherContingencyCause>(DEFAULT_CONTINGENCY_CAUSE);
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
    setContingencyCause(DEFAULT_CONTINGENCY_CAUSE);

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
  const enrollmentIds = useMemo(() => students.map(s => s.enrollmentId), [students]);
  const isFirstCapture = useMemo(() => firstCaptureOf(enrollmentIds, initialStatuses), [enrollmentIds, initialStatuses]);

  // Determinar si hubo cambios con respecto a lo guardado
  const hasChanges = useMemo(
    () => hasAttendanceChanges(enrollmentIds, initialStatuses, attendanceDraft),
    [enrollmentIds, initialStatuses, attendanceDraft]
  );

  // Primera toma: causa y motivo obligatorios. Corrección con cambios: solo motivo.
  const isReasonRequired = isFirstCapture || hasChanges;
  const trimmedReason = reason.trim();
  const isReasonValid = reasonValid(reason, isReasonRequired);

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
      setSaveError(REASON_REQUIRED_MESSAGE);
      return;
    }
    if (trimmedReason.length > ATTENDANCE_REASON_MAX_LENGTH) {
      setSaveError(REASON_TOO_LONG_MESSAGE);
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
                    <SelectorEstadoAsistencia
                      studentName={student.fullName}
                      status={currentStatus}
                      onChange={status => setAttendanceDraft(prev => ({ ...prev, [student.enrollmentId]: status }))}
                    />
                  </div>
                );
              })}

              {/* Contingencia (primera toma) o corrección manual */}
              <JustificacionAsistencia
                firstCapture={isFirstCapture}
                reasonRequired={isReasonRequired}
                contingencyCause={contingencyCause}
                onContingencyCauseChange={setContingencyCause}
                reason={reason}
                onReasonChange={setReason}
              />
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

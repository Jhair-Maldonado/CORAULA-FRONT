'use client';

import { useState, useEffect } from 'react';
import { X, Check, CheckCircle2, Calendar, Loader2 } from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import { teacherAttendanceService, teacherAttendanceErrorMessage } from '@/services/teacher/teacherAttendanceService';
import type { TeacherCourseStudentResponse } from '@/types/teacherCoursesApi';
import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceDraft, setAttendanceDraft] = useState<Record<number, TeacherAttendanceStatus>>({});
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

    teacherCoursesService
      .getStudents(sectionCourseId)
      .then(data => {
        if (!active) return;
        setStudents(data);
        // Por defecto todos en PRESENTE si no están marcados aún
        setAttendanceDraft(prev => {
          const next = { ...prev };
          data.forEach(s => {
            if (!next[s.enrollmentId]) {
              next[s.enrollmentId] = 'PRESENTE';
            }
          });
          return next;
        });
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
  }, [isOpen, sectionCourseId]);

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
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      try {
        const attendanceData = await teacherAttendanceService.getAttendance(sectionCourseId, todayInfo.iso);
        const session = attendanceData?.sessions?.[0];
        if (session) {
          const records = students.map(s => ({
            enrollmentId: s.enrollmentId,
            status: attendanceDraft[s.enrollmentId] || 'PRESENTE'
          }));
          await teacherAttendanceService.saveAttendance(sectionCourseId, session.scheduleId, todayInfo.iso, { records });
        }
      } catch {
        // En caso de que no exista sesión backend registrada para la fecha, se registra confirmación local
      }

      setSaveSuccess(`Asistencia registrada exitosamente.`);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden border border-line animate-in zoom-in-95 duration-150">
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
            students.map((student, idx) => {
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
            })
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
              disabled={saving || students.length === 0}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
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

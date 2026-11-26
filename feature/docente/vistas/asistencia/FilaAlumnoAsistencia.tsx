'use client';

import { Lock } from 'lucide-react';
import SelectorEstadoAsistencia from '@/components/attendance/SelectorEstadoAsistencia';
import { ATTENDANCE_STATUS_NONE, attendanceStatusUi } from '@/lib/attendanceStatusUi';
import { isAttendanceLocked } from '@/lib/attendanceDraft';
import type { TeacherAttendanceStatus, TeacherAttendanceStudentResponse } from '@/types/teacherAttendanceApi';

/** Iniciales de las dos primeras palabras del nombre completo. */
export function initialsOf(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
}

/** Fila de un estudiante: avatar, código, estado efectivo y selector. La justificación aprobada bloquea el cambio. */
export default function FilaAlumnoAsistencia({ student, selected, disabled, onChange }: {
  student: TeacherAttendanceStudentResponse;
  selected: TeacherAttendanceStatus | null;
  disabled: boolean;
  onChange: (status: TeacherAttendanceStatus) => void;
}) {
  const ui = selected ? attendanceStatusUi(selected) : null;
  const locked = isAttendanceLocked(student);
  return <article className="bg-white rounded-xl border border-line p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-accent/30 hover:shadow-xs transition-all">
    <div className="flex items-center gap-3.5 min-w-0 flex-1">
      <span className="w-10 h-10 rounded-full bg-accent-soft text-accent font-extrabold text-xs flex items-center justify-center shrink-0 border border-accent/20 shadow-xs" aria-hidden="true">{initialsOf(student.fullName)}</span>
      <div className="min-w-0">
        <h2 className="font-bold text-sm text-ink break-words">{student.fullName}</h2>
        <p className="text-[11px] text-muted break-words">Código: {student.studentCode ?? 'No registrado'}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className={`w-fit text-[11px] font-bold px-2 py-1 rounded-full border ${ui ? ui.soft : ATTENDANCE_STATUS_NONE.soft}`}>{ui?.label ?? ATTENDANCE_STATUS_NONE.label}</span>
      {locked && <span className="w-fit inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border bg-neutral text-ink border-line"><Lock size={12} aria-hidden="true" />Justificación aprobada</span>}
    </div>
    <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line">
      <SelectorEstadoAsistencia studentName={student.fullName} status={selected} disabled={disabled || locked} onChange={onChange} showLabel />
    </div>
  </article>;
}

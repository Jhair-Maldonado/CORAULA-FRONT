'use client';

import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';
import { ATTENDANCE_STATUS_UI } from '@/lib/attendanceStatusUi';

const IDLE = 'bg-white text-ink border-line hover:border-ink/40 hover:bg-neutral';

// Selector P / T / F compartido por el docente (FRONT #101, #158) y el Director (FRONT #108).
// `status` puede ser null (sin estado): ningún botón queda presionado. `showLabel` añade el nombre del estado.
export default function SelectorEstadoAsistencia({ studentName, status, onChange, disabled = false, showLabel = false }: {
  studentName: string;
  status: TeacherAttendanceStatus | null;
  onChange: (status: TeacherAttendanceStatus) => void;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 shrink-0">
      {ATTENDANCE_STATUS_UI.map(option => {
        const selected = status === option.status;
        return (
          <button
            key={option.status}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.status)}
            className={`${showLabel ? 'min-h-10 min-w-10 px-2.5 gap-1' : 'w-8 h-8'} rounded-lg text-xs font-black transition-all flex items-center justify-center border-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? option.active : IDLE}`}
            title={option.status === 'INASISTENCIA' ? 'Falta / Inasistencia' : option.label}
            aria-label={`Marcar ${option.verb} a ${studentName}`}
          >
            {option.letter}
            {showLabel && <span className="hidden xl:inline font-bold">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

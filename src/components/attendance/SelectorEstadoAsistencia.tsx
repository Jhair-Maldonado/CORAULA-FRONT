'use client';

import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';

// Selector P / T / F compartido por el docente (FRONT #101) y el Director (FRONT #108).
const OPTIONS: { status: TeacherAttendanceStatus; letter: string; title: string; verb: string; active: string; idle: string }[] = [
  {
    status: 'PRESENTE', letter: 'P', title: 'Presente', verb: 'Presente',
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200',
    idle: 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50'
  },
  {
    status: 'TARDANZA', letter: 'T', title: 'Tardanza', verb: 'Tardanza',
    active: 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-200',
    idle: 'bg-white text-slate-800 border-slate-300 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/50'
  },
  {
    status: 'INASISTENCIA', letter: 'F', title: 'Falta / Inasistencia', verb: 'Falta',
    active: 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200',
    idle: 'bg-white text-slate-800 border-slate-300 hover:border-rose-500 hover:text-rose-700 hover:bg-rose-50/50'
  }
];

export default function SelectorEstadoAsistencia({ studentName, status, onChange, disabled = false }: {
  studentName: string;
  status: TeacherAttendanceStatus;
  onChange: (status: TeacherAttendanceStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {OPTIONS.map(option => (
        <button
          key={option.status}
          type="button"
          disabled={disabled}
          aria-pressed={status === option.status}
          onClick={() => onChange(option.status)}
          className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center border-2 disabled:cursor-not-allowed ${
            status === option.status ? option.active : option.idle
          }`}
          title={option.title}
          aria-label={`Marcar ${option.verb} a ${studentName}`}
        >
          {option.letter}
        </button>
      ))}
    </div>
  );
}

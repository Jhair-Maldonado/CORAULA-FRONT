'use client';

import { ShieldAlert, FileText } from 'lucide-react';
import type { TeacherContingencyCause } from '@/types/teacherAttendanceApi';
import { ATTENDANCE_REASON_MAX_LENGTH, CONTINGENCY_CAUSES } from '@/lib/attendanceJustification';

// Causa de contingencia (primera toma) y motivo (primera toma o corrección), RF-16 / RF-42.
// Compartido por el docente (FRONT #101) y el Director (FRONT #108).
export default function JustificacionAsistencia({
  firstCapture,
  reasonRequired,
  contingencyCause,
  onContingencyCauseChange,
  reason,
  onReasonChange,
  disabled = false
}: {
  firstCapture: boolean;
  reasonRequired: boolean;
  contingencyCause: TeacherContingencyCause;
  onContingencyCauseChange: (cause: TeacherContingencyCause) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  disabled?: boolean;
}) {
  const trimmedReason = reason.trim();
  return (
    <div className="mt-2 pt-3 border-t border-line space-y-3 bg-neutral/10 p-3 rounded-xl animate-in fade-in duration-150">
      {firstCapture ? (
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
            disabled={disabled}
            onChange={e => onContingencyCauseChange(e.target.value as TeacherContingencyCause)}
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
            {reasonRequired && <span className="text-rose-500">*</span>}
          </label>
          <span className={`text-[10px] font-bold ${reason.length > ATTENDANCE_REASON_MAX_LENGTH ? 'text-rose-600' : 'text-muted'}`}>
            {reason.length}/{ATTENDANCE_REASON_MAX_LENGTH}
          </span>
        </div>
        <input
          id="attendance-reason-input"
          type="text"
          maxLength={ATTENDANCE_REASON_MAX_LENGTH}
          value={reason}
          disabled={disabled}
          onChange={e => onReasonChange(e.target.value)}
          placeholder={
            firstCapture
              ? 'Ej. Registro regular de asistencia en aula por falta de lector'
              : 'Ej. Corrección por ingreso justificado del estudiante'
          }
          className={`w-full text-xs text-ink bg-white border rounded-lg px-2.5 py-2 placeholder:text-muted/70 focus:outline-none focus:ring-2 ${
            reason.length > ATTENDANCE_REASON_MAX_LENGTH
              ? 'border-rose-400 focus:ring-rose-400'
              : 'border-line focus:ring-accent'
          }`}
        />
        {reasonRequired && trimmedReason.length === 0 && (
          <p className="text-[10px] text-muted mt-1">
            El motivo es obligatorio en el registro manual de asistencia.
          </p>
        )}
      </div>
    </div>
  );
}

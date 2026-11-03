// Contrato: docs/guardian-attendance.md (#55) y docs/guardian-attendance-justifications.md (#57, solo aditivo).
export type GuardianAttendanceStatus = 'PRESENTE' | 'TARDANZA' | 'INASISTENCIA';
export type JustificationStatus = 'PENDIENTE' | 'OBSERVADA' | 'APROBADA' | 'RECHAZADA';

export interface GuardianAttendanceRecord {
  date: string;
  courseName: string;
  startTime: string;
  endTime: string;
  status: GuardianAttendanceStatus;
  /** Id del registro de asistencia, para presentar una justificación (#57). */
  attendanceId: number;
  /** true si una justificación aprobada cubre la sesión. */
  justified: boolean;
  /** Última solicitud de justificación de la sesión; null si no hay. */
  justification: null | { id: number; status: JustificationStatus };
}

export interface GuardianAttendanceResponse {
  studentId: number;
  from: string;
  to: string;
  summary: { total: number; present: number; late: number; absent: number };
  records: GuardianAttendanceRecord[];
}

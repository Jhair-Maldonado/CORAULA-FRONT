// Contrato: docs/guardian-attendance.md (backend).
export type GuardianAttendanceStatus = 'PRESENTE' | 'TARDANZA' | 'INASISTENCIA';

export interface GuardianAttendanceRecord {
  date: string;
  courseName: string;
  startTime: string;
  endTime: string;
  status: GuardianAttendanceStatus;
  justification: null | { status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' };
}

export interface GuardianAttendanceResponse {
  studentId: number;
  from: string;
  to: string;
  summary: { total: number; present: number; late: number; absent: number };
  records: GuardianAttendanceRecord[];
}

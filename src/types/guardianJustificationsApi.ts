// Contrato: docs/guardian-attendance-justifications.md (#57). Tipos compartidos por el apoderado y por gestión.
import type { JustificationStatus } from './guardianAttendanceApi';

export type { JustificationStatus } from './guardianAttendanceApi';
export type JustifiableAttendanceStatus = 'INASISTENCIA' | 'TARDANZA';

export interface AttendanceJustificationChange {
  from: JustificationStatus | null;
  to: JustificationStatus;
  comment: string | null;
  at: string;
}

/** AttendanceJustificationView: respuesta de las lecturas, del envío, de la respuesta y de la decisión. */
export interface AttendanceJustification {
  id: number;
  attendanceId: number;
  studentId: number;
  /** Opcionales: gestión los muestra si el backend los envía; si faltan se usa «Estudiante #id». */
  studentName?: string | null;
  studentCode?: string | null;
  date: string;
  courseName: string;
  attendanceStatus: JustifiableAttendanceStatus;
  reason: string;
  status: JustificationStatus;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  attachmentSizeBytes: number | null;
  reviewComment: string | null;
  response: string | null;
  createdAt: string;
  updatedAt: string;
  history: AttendanceJustificationChange[];
}

export interface AttendanceJustificationsPage {
  content: AttendanceJustification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** POST .../attachment/download-url: URL firmada por 5 minutos. */
export interface JustificationAttachmentUrl {
  url: string;
  expiresInSeconds: number;
}

/** POST /v1/management/attendance-justifications/{id}/decision (solo DIRECTIVO). Servicio en el PR de la bandeja. */
export interface JustificationDecisionRequest {
  decision: Exclude<JustificationStatus, 'PENDIENTE'>;
  comment: string;
}

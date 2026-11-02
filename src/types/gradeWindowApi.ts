// Shapes match the backend #39 contract in docs/grade-window.md
// (GET /management/bimesters/{id}/grade-window, PUT .../registration-date, POST .../extension).
// Dates are YYYY-MM-DD calendar days in America/Lima.

export interface GradeWindow {
  bimesterId: number;
  /** Current registration date D: the configured one, or the bimester endDate. */
  registrationDate: string;
  registrationDateConfigured: boolean;
  /** Latest administrative extension, or null. */
  extendedDeadline: string | null;
  /** Inclusive: the later of D+7 and extendedDeadline. */
  deadline: string;
  expired: boolean;
  timeZone: 'America/Lima';
}

export interface SetRegistrationDateRequest {
  registrationDate: string;
  reason: string;
}

export interface ExtendGradeWindowRequest {
  deadline: string;
  reason: string;
}

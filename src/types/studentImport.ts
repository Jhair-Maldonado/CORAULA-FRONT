export interface StudentImportIssue {
  field: string;
  code: string;
  message: string;
}

export interface StudentImportRowData {
  studentDni: string | null;
  studentEmail: string | null;
  firstNames: string | null;
  lastNames: string | null;
  phone: string | null;
  guardianDni: string | null;
  guardianEmail: string | null;
  guardianFirstNames: string | null;
  guardianLastNames: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  guardianPrimary: boolean | null;
  guardianAuthorizedPickup: boolean | null;
  academicPeriod: string | null;
  level: string | null;
  grade: number | null;
  section: string | null;
  enrollmentDate: string | null;
  studentCode: null;
}

export interface StudentImportRowPreview {
  rowNumber: number;
  valid: boolean;
  data: StudentImportRowData;
  errors: StudentImportIssue[];
  warnings: StudentImportIssue[];
}

export interface StudentImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: StudentImportRowPreview[];
}

export interface StudentImportConfirmation {
  totalRows: number;
  studentsCreated: number;
  guardiansCreated: number;
  // Reuses per relationship, not a count of unique guardians.
  guardiansReused: number;
  usersCreated: number;
  relationshipsCreated: number;
  enrollmentsCreated: number;
}

/** Optional fields cover structural, concurrent and refreshed-preview failures. */
export interface StudentImportHttpError {
  error?: string;
  code?: string;
  message?: string;
  preview?: StudentImportPreview;
}

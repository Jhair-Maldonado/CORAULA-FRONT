import type { JustificationStatus } from '@/types/guardianAttendanceApi';
import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';

// Borrador de asistencia del docente (FRONT #158): lo elegido en pantalla frente a lo guardado en el servidor.

export type AttendanceDraft = Readonly<Record<number, TeacherAttendanceStatus | undefined>>;

export interface AttendanceDraftRow {
  enrollmentId: number;
  /** Estado guardado en el servidor; null si aún no hay registro. */
  status: TeacherAttendanceStatus | null;
  justificationStatus?: JustificationStatus | null;
}

/** DECISION(BACK #139): con la justificación APROBADA el backend rechaza el cambio (409); la fila queda bloqueada. */
export function isAttendanceLocked(row: AttendanceDraftRow): boolean {
  return row.justificationStatus === 'APROBADA';
}

/** Estado efectivo: el del borrador o, si no hay, el guardado. null = pendiente de seleccionar. */
export function effectiveStatus(row: AttendanceDraftRow, draft: AttendanceDraft): TeacherAttendanceStatus | null {
  return draft[row.enrollmentId] ?? row.status;
}

/**
 * Hay algo por guardar: algún estado efectivo distinto del guardado.
 * Sin borrador no cuenta como PRESENTE (a diferencia de `hasAttendanceChanges`, pensado para el modal).
 */
export function isAttendanceDirty(rows: readonly AttendanceDraftRow[], draft: AttendanceDraft): boolean {
  return rows.some(row => {
    const current = effectiveStatus(row, draft);
    return current !== null && current !== row.status;
  });
}

export interface BulkPlan {
  /** Sin estado efectivo: se llenan siempre. */
  fill: number[];
  /** Con otro estado: solo cambian si el docente confirma. */
  overwrite: number[];
  /** Justificación aprobada con un estado distinto al pedido: nunca se tocan y se avisa. Si ya tienen ese estado no cuentan. */
  locked: number[];
}

/** Reparte a los alumnos para «Todos X»: a quién se asigna sin preguntar, a quién se pregunta y a quién se excluye. */
export function planBulkStatus(rows: readonly AttendanceDraftRow[], draft: AttendanceDraft, status: TeacherAttendanceStatus): BulkPlan {
  const plan: BulkPlan = { fill: [], overwrite: [], locked: [] };
  for (const row of rows) {
    if (isAttendanceLocked(row)) {
      if (effectiveStatus(row, draft) !== status) plan.locked.push(row.enrollmentId);
      continue;
    }
    const current = effectiveStatus(row, draft);
    if (current === null) plan.fill.push(row.enrollmentId);
    else if (current !== status) plan.overwrite.push(row.enrollmentId);
  }
  return plan;
}

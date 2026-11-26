import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';

/**
 * Presentación de los tres estados de asistencia, compartida por el selector P / T / F, los botones masivos
 * y el chip de estado. Solo usa tokens de `globals.css` (R7). El color nunca va solo: cada estado lleva letra y texto.
 *
 * Contraste (texto sobre fondo): activo Presente 5,02, Tardanza 4,92, Inasistencia 6,29, todos con texto blanco.
 */
export interface AttendanceStatusUi {
  status: TeacherAttendanceStatus;
  /** Letra del selector compacto. La inasistencia es «F» (falta), como en el selector del Director. */
  letter: string;
  /** Etiqueta visible: «Presente», «Tardanza», «Inasistencia». */
  label: string;
  /** Verbo del `aria-label` («Marcar Falta a …»). */
  verb: string;
  /** Texto del botón masivo. */
  bulkLabel: string;
  /** Estado elegido. */
  active: string;
  /** Estado suave: botones masivos y chip. */
  soft: string;
}

export const ATTENDANCE_STATUS_UI: readonly AttendanceStatusUi[] = [
  {
    status: 'PRESENTE', letter: 'P', label: 'Presente', verb: 'Presente', bulkLabel: 'Todos Presentes',
    active: 'bg-success-ink text-white border-success-ink',
    soft: 'bg-success text-success-ink border-success-ink/30'
  },
  {
    status: 'TARDANZA', letter: 'T', label: 'Tardanza', verb: 'Tardanza', bulkLabel: 'Todos Tardanza',
    active: 'bg-warning-ink text-white border-warning-ink',
    soft: 'bg-white text-warning-ink border-warning-ink/40'
  },
  {
    status: 'INASISTENCIA', letter: 'F', label: 'Inasistencia', verb: 'Falta', bulkLabel: 'Todos Inasistencia',
    active: 'bg-accent text-white border-accent',
    soft: 'bg-accent-soft text-accent border-accent/30'
  }
];

/** Estado sin elegir. */
export const ATTENDANCE_STATUS_NONE = { label: 'Sin seleccionar', soft: 'bg-neutral text-ink border-line' } as const;

/**
 * Presentación (letra, etiqueta, verbo del `aria-label`, texto del botón masivo y clases de token) de un estado de asistencia.
 * Es la fuente única del selector P / T / F, de los botones «Todos X», del chip de estado y del resumen.
 *
 * @param status uno de `PRESENTE`, `TARDANZA` o `INASISTENCIA` (los únicos que acepta el backend).
 * @returns la entrada de `ATTENDANCE_STATUS_UI` de ese estado.
 */
export function attendanceStatusUi(status: TeacherAttendanceStatus): AttendanceStatusUi {
  return ATTENDANCE_STATUS_UI.find(option => option.status === status)!;
}

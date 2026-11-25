import type { StudentStatusTone } from './studentAdapter';

/**
 * Clases del chip de estado del alumno por tono, con tokens de globals.css.
 * El texto del estado siempre se muestra: el color nunca es el único canal (R7).
 */
export const studentStatusToneClass: Record<StudentStatusTone, string> = {
  success: 'bg-success text-success-ink border-success',
  warning: 'bg-white text-warning-ink border-line',
  neutral: 'bg-neutral text-ink border-line',
};

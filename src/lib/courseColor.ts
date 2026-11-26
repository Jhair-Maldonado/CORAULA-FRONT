/**
 * Paleta de tokens para la barra de color de cada curso (R7). Va como arreglo literal para que Tailwind
 * detecte cada clase en el código fuente.
 */
export const COURSE_BAR_PALETTE = ['bg-accent', 'bg-success-ink', 'bg-warning-ink', 'bg-ink'];

/** Clase de color estable para un curso: depende solo de su `sectionCourseId`. */
export function courseBarClass(sectionCourseId: number): string {
  return COURSE_BAR_PALETTE[Math.abs(Math.trunc(sectionCourseId)) % COURSE_BAR_PALETTE.length];
}

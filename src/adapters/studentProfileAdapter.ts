import type { StudentMeResponse } from '@/types/studentProfileApi';
import { studentLevelLabels } from './studentAdapter';

/** Texto que se muestra cuando el backend no entrega un dato o la consulta falla (R3). */
export const SIN_DATO = 'Sin dato';

/** Datos del estudiante listos para el encabezado del portal: nunca IDs ni enums crudos (R8). */
export interface StudentProfileView {
  fullName: string;
  /** Hasta dos letras; «–» cuando no hay nombre. */
  initials: string;
  /** Ej.: «5.° de Secundaria · Sección B», o «Sin dato». */
  sectionLabel: string;
}

const clean = (value: string | null | undefined): string => (typeof value === 'string' ? value.trim() : '');

/** Iniciales de las dos primeras palabras; una sola palabra aporta sus dos primeras letras. */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '–';
  const letters = words.length >= 2 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2);
  return letters.toLocaleUpperCase('es-PE');
}

/** Etiqueta «grado · sección» con lo que haya; «Sin dato» si no hay nada utilizable. */
export function studentSectionLabel(me: Partial<StudentMeResponse> | null | undefined): string {
  const levelLabel = me?.level ? studentLevelLabels[me.level] : undefined;
  const hasGrade = typeof me?.grade === 'number' && Number.isFinite(me.grade) && me.grade > 0;
  const sectionName = clean(me?.sectionName);
  const parts = [
    hasGrade && levelLabel ? `${me!.grade}.° de ${levelLabel}` : null,
    sectionName ? `Sección ${sectionName}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : SIN_DATO;
}

/** Convierte el perfil del backend (o su ausencia) en datos de presentación. */
export function toStudentProfileView(me: StudentMeResponse | null | undefined): StudentProfileView {
  const fullName = clean(me?.fullName) || SIN_DATO;
  return {
    fullName,
    initials: fullName === SIN_DATO ? '–' : initialsOf(fullName),
    sectionLabel: studentSectionLabel(me),
  };
}

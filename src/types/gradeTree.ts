import type { StudentLevel } from './studentApi';

/**
 * Árbol «nivel → grado → sección» que consume el panel «Niveles y Grados».
 * Lo construye `toGradeTree` (src/adapters/vacancyAdapter.ts) a partir de GET /v1/management/vacancies;
 * los textos ya vienen listos para pintarse (R8: nunca se muestran enums crudos).
 */

/** Sección con su ocupación (matriculados / capacidad). */
export interface SectionNode {
  /** Id de la sección (el mismo que recibe la ruta `grado/[id]`). */
  id: number;
  /** Ruta de la lista de alumnos de la sección. */
  href: string;
  /** Texto visible, p. ej. «Sección A». */
  nombre: string;
  /** Insignia corta, p. ej. «A» («?» si la sección no tiene nombre). */
  letra: string;
  /** Matrículas activas (entero ≥ 0). */
  matriculados: number;
  /** Capacidad máxima, o null si el backend envió un valor inválido. */
  capacidad: number | null;
  /** Texto visual: «4 / 30», o «4» si no hay capacidad válida. */
  ocupacion: string;
  /** Texto para lectores de pantalla: «4 de 30 alumnos». */
  ocupacionAria: string;
  /** false si la sección está inactiva. */
  activa: boolean;
}

/** Grado con sus secciones. */
export interface GradeNode {
  /** Clave estable «PRIMARY:5» (o «OTHER:5» si el nivel es desconocido). */
  key: string;
  grado: number;
  /** «5° grado». */
  nombre: string;
  /** «5° grado · Primaria». */
  etiqueta: string;
  /** Suma de matriculados de sus secciones. */
  matriculados: number;
  secciones: SectionNode[];
}

/** Nivel educativo con sus grados. */
export interface LevelNode {
  /** Nivel conocido, o null para un nivel que el front no reconoce. */
  nivel: StudentLevel | null;
  etiqueta: 'Primaria' | 'Secundaria' | 'Otro nivel';
  grados: GradeNode[];
}

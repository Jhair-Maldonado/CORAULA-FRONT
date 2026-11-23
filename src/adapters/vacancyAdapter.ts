import type { GradeNode, LevelNode, SectionNode } from '@/types/gradeTree';
import type { StudentLevel } from '@/types/studentApi';
import type { VacancyGradeResponse, VacancySectionResponse } from '@/types/vacanciesApi';
import { studentLevelLabels } from '@/adapters/studentAdapter';

const NO_NAME = 'Sección sin nombre';
const NO_LETTER = '?';
const LEVEL_ORDER: readonly (StudentLevel | null)[] = ['PRIMARY', 'SECONDARY', null];
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const isLevel = (value: unknown): value is StudentLevel => value === 'PRIMARY' || value === 'SECONDARY';
const isPositiveInt = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const asCount = (value: unknown): number => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0);

/** Nombre de la sección sin el prefijo «Sección» (misma regla que `toSectionLabels`). */
const bareName = (name: unknown): string => (typeof name === 'string' ? name.trim().replace(/^sección\b\s*/i, '').trim() : '');

function toSectionNode(section: VacancySectionResponse): SectionNode {
  const bare = bareName(section.sectionName);
  const capacidad = isPositiveInt(section.maxCapacity) ? section.maxCapacity : null;
  const matriculados = asCount(section.activeEnrollmentCount);
  return {
    id: section.sectionId,
    href: `/administrador/alumnos/grado/${section.sectionId}`,
    nombre: bare ? `Sección ${bare}` : NO_NAME,
    letra: bare ? [...bare].slice(0, 2).join('').toUpperCase() : NO_LETTER,
    matriculados,
    capacidad,
    // La sobreocupación se muestra tal cual (p. ej. «31 / 30»): es un dato real del backend.
    ocupacion: capacidad === null ? String(matriculados) : `${matriculados} / ${capacidad}`,
    ocupacionAria: capacidad === null
      ? `${matriculados} ${matriculados === 1 ? 'alumno' : 'alumnos'}`
      : `${matriculados} de ${capacidad} alumnos`,
    activa: section.active !== false,
  };
}

const compareSections = (a: SectionNode, b: SectionNode): number =>
  collator.compare(a.nombre, b.nombre) || a.id - b.id;

/**
 * Convierte la respuesta de vacantes en el árbol nivel → grado → sección del panel «Niveles y Grados».
 *
 * - Orden: Primaria, Secundaria y niveles desconocidos al final; grados ascendentes; secciones por nombre
 *   (comparación natural en español) y luego por id.
 * - Fusiona los grupos repetidos del mismo nivel y grado; el total del grado es la suma de sus secciones.
 * - Contadores inválidos cuentan como 0; una capacidad inválida deja la ocupación en solo «n».
 * - Omite secciones con id inválido (o repetido) y grados sin secciones.
 * - Un nivel desconocido se agrupa como «Otro nivel»: nunca se muestra el valor crudo del enum (R8).
 *
 * @param groups Respuesta de GET /v1/management/vacancies.
 * @param academicPeriodId Si se indica, descarta los grupos de otros periodos.
 * @returns Niveles con al menos un grado; lista vacía si no hay secciones.
 */
export function toGradeTree(groups: readonly VacancyGradeResponse[] | null | undefined, academicPeriodId?: number): LevelNode[] {
  const merged = new Map<string, { nivel: StudentLevel | null; grado: number; secciones: Map<number, SectionNode> }>();
  for (const group of groups ?? []) {
    if (!group || !isPositiveInt(group.grade)) continue;
    if (academicPeriodId !== undefined && group.academicPeriodId !== academicPeriodId) continue;
    const nivel = isLevel(group.level) ? group.level : null;
    const key = `${nivel ?? 'OTHER'}:${group.grade}`;
    const entry = merged.get(key) ?? { nivel, grado: group.grade, secciones: new Map<number, SectionNode>() };
    merged.set(key, entry);
    for (const section of group.sections ?? []) {
      if (!section || !isPositiveInt(section.sectionId) || entry.secciones.has(section.sectionId)) continue;
      entry.secciones.set(section.sectionId, toSectionNode(section));
    }
  }

  const levels: LevelNode[] = [];
  for (const nivel of LEVEL_ORDER) {
    const grados: GradeNode[] = [...merged.entries()]
      .filter(([, entry]) => entry.nivel === nivel && entry.secciones.size > 0)
      .sort(([, a], [, b]) => a.grado - b.grado)
      .map(([key, entry]) => {
        const secciones = [...entry.secciones.values()].sort(compareSections);
        const etiquetaNivel = nivel === null ? 'Otro nivel' : studentLevelLabels[nivel];
        return {
          key, grado: entry.grado, nombre: `${entry.grado}° grado`, etiqueta: `${entry.grado}° grado · ${etiquetaNivel}`,
          matriculados: secciones.reduce((total, section) => total + section.matriculados, 0), secciones,
        };
      });
    if (grados.length === 0) continue;
    levels.push({ nivel, etiqueta: nivel === null ? 'Otro nivel' : (studentLevelLabels[nivel] as 'Primaria' | 'Secundaria'), grados });
  }
  return levels;
}

/**
 * Busca el grado que contiene una sección.
 * @param tree Árbol devuelto por `toGradeTree`.
 * @param sectionId Id de la sección (número o texto de la ruta).
 * @returns Clave del grado, o null si no hay árbol, el id es inválido o la sección no está en el árbol.
 */
export function gradeKeyOfSection(tree: readonly LevelNode[] | null | undefined, sectionId: number | string | null | undefined): string | null {
  const id = typeof sectionId === 'string' && /^\d+$/.test(sectionId) ? Number(sectionId) : sectionId;
  if (!tree || !isPositiveInt(id)) return null;
  for (const level of tree) {
    for (const grade of level.grados) {
      if (grade.secciones.some(section => section.id === id)) return grade.key;
    }
  }
  return null;
}

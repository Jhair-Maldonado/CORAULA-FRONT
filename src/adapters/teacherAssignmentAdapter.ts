import type { SectionLabel, TeacherAssignmentRow } from '@/types/adminTeacher';
import type { SectionResponse } from '@/types/sectionApi';
import type { TeacherAssignmentResponse } from '@/types/teacherApi';

// NOTA: las etiquetas necesitan TODAS las secciones (todos los periodos e inactivas): las asignaciones históricas
// pueden apuntar a secciones de periodos cerrados. La llamada la hace la vista, no este adapter.

const SECTION_UNAVAILABLE = 'Sección no disponible';
const DATE_UNAVAILABLE = 'Fecha no disponible';
const LEVEL_LABEL = { PRIMARY: 'Primaria', SECONDARY: 'Secundaria' } as const;
const dateFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' });

/**
 * Construye etiquetas legibles («5° grado · Primaria», «Sección A») indexadas por id de sección.
 * @param sections Secciones tal como las devuelve la API de gestión.
 * @returns Mapa de id de sección a su etiqueta.
 */
export function toSectionLabels(sections: readonly SectionResponse[]): ReadonlyMap<number, SectionLabel> {
  const labels = new Map<number, SectionLabel>();
  for (const section of sections) {
    const name = section.name.trim();
    // Con un nivel desconocido se muestra solo el grado; nunca el valor crudo del enum (R8).
    const level = (LEVEL_LABEL as Record<string, string | undefined>)[section.level];
    labels.set(section.id, {
      nivelGrado: level ? `${section.grade}° grado · ${level}` : `${section.grade}° grado`,
      seccion: /^sección/i.test(name) ? name : `Sección ${name}`,
    });
  }
  return labels;
}

/**
 * Da formato de fecha, en hora de Lima, a un instante ISO (p. ej. «28 feb. 2026»). Nunca devuelve el ISO crudo.
 * @param iso Instante enviado por la API.
 * @returns Fecha formateada, o «Fecha no disponible» si el valor no es una fecha válida.
 */
export function formatAssignedAt(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? DATE_UNAVAILABLE : dateFormatter.format(new Date(time));
}

/**
 * Convierte las asignaciones de la API en filas para mostrar: activas primero y luego las más recientes.
 * @param assignments Asignaciones del detalle del docente.
 * @param labels Etiquetas de sección, o null si no se pudieron cargar.
 * @returns Filas sin identificadores ni fechas ISO en sus campos visibles.
 */
export function toTeacherAssignmentRows(
  assignments: readonly TeacherAssignmentResponse[],
  labels: ReadonlyMap<number, SectionLabel> | null,
): TeacherAssignmentRow[] {
  const time = (iso: string) => { const value = Date.parse(iso); return Number.isNaN(value) ? 0 : value; };
  return [...assignments]
    .sort((a, b) => Number(b.active) - Number(a.active) || time(b.assignedAt) - time(a.assignedAt))
    .map(assignment => {
      const label = labels?.get(assignment.sectionId);
      const valid = !Number.isNaN(Date.parse(assignment.assignedAt));
      return {
        id: assignment.id,
        curso: `${assignment.courseCode} · ${assignment.courseName}`,
        nivelGrado: label?.nivelGrado ?? null,
        seccion: label?.seccion ?? SECTION_UNAVAILABLE,
        asignadoEl: formatAssignedAt(assignment.assignedAt),
        asignadoElIso: valid ? assignment.assignedAt : null,
        activa: assignment.active,
        estadoLabel: assignment.active ? 'Activa' : 'Inactiva',
      };
    });
}

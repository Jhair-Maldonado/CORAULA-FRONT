// src/components/padres/hijoFormat.ts
import type { HijoResumen } from '@/types/padre';

/** Grado y sección legibles; sin matrícula activa (#33: grade y sectionName null) devuelve «Sin sección». */
export function formatGradoSeccion(hijo: Pick<HijoResumen, 'grado' | 'seccion'>): string {
  const grado = hijo.grado?.trim();
  const seccion = hijo.seccion?.trim();
  if (grado && seccion) return `${grado} "${seccion}"`;
  if (grado) return grado;
  if (seccion) return `Sección "${seccion}"`;
  return 'Sin sección';
}

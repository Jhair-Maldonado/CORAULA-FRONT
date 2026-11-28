/**
 * Incidencias del hijo activo para el apoderado (FRONT #163): del contrato de #117 al modelo de la vista.
 * Funciones puras. KPI y filtro de gravedad se calculan en cliente sobre la página recibida (la vista pide
 * `size=100`); no se agrega ningún dato que el contrato no entregue.
 */
import { formatLimaDateTime } from '@/services/padres/guardianIncidentsService';
import type { GuardianIncident, GuardianIncidentSeverity, GuardianIncidentSeverityFilter, GuardianIncidentsPage } from '@/types/guardianIncidentsApi';

export type { GuardianIncidentSeverityFilter };

/** Filtros en el orden en que se ofrecen. */
export const INCIDENT_SEVERITY_FILTERS: readonly GuardianIncidentSeverityFilter[] = ['TODAS', 'LEVE', 'MODERADA', 'GRAVE'];

interface SeverityStyle {
  label: string;
  /** Insignia: fondo, texto y borde con tokens de globals.css. */
  badgeClassName: string;
  /** Borde izquierdo de la tarjeta. */
  borderClassName: string;
}

const SEVERITY_STYLE: Record<GuardianIncidentSeverity, SeverityStyle> = {
  LEVE: { label: 'Leve', badgeClassName: 'bg-success text-success-ink border-success-ink/30', borderClassName: 'border-l-success-ink' },
  MODERADA: { label: 'Moderada', badgeClassName: 'bg-white text-warning-ink border-warning-ink/30', borderClassName: 'border-l-warning-ink' },
  GRAVE: { label: 'Grave', badgeClassName: 'bg-accent-soft text-accent border-accent/30', borderClassName: 'border-l-accent' },
};

/** Etiqueta del filtro: «Todas», «Leve», «Moderada», «Grave». */
export function severityFilterLabel(filter: GuardianIncidentSeverityFilter): string {
  return filter === 'TODAS' ? 'Todas' : SEVERITY_STYLE[filter].label;
}

/** Interpreta `?gravedad=`; cualquier valor desconocido equivale a «TODAS». */
export function parseSeverityFilter(raw: string | null | undefined): GuardianIncidentSeverityFilter {
  return raw === 'LEVE' || raw === 'MODERADA' || raw === 'GRAVE' ? raw : 'TODAS';
}

/** Una incidencia lista para mostrar. */
export interface IncidentView {
  id: number;
  occurredAt: string;
  /** Fecha y hora de Lima: «06/10/2026 10:05». */
  dateLabel: string;
  severity: GuardianIncidentSeverity;
  severityLabel: string;
  badgeClassName: string;
  borderClassName: string;
  courseName: string;
  description: string;
}

export function toIncidentView(incident: GuardianIncident): IncidentView {
  const style = SEVERITY_STYLE[incident.severity];
  return {
    id: incident.id,
    occurredAt: incident.occurredAt,
    dateLabel: formatLimaDateTime(incident.occurredAt),
    severity: incident.severity,
    severityLabel: style.label,
    badgeClassName: style.badgeClassName,
    borderClassName: style.borderClassName,
    courseName: incident.courseName,
    description: incident.description,
  };
}

export interface IncidentKpis {
  /** `totalElements` del backend: todas las incidencias del rango. */
  total: number;
  /** Conteos por gravedad sobre las incidencias recibidas (la primera página de hasta 100). */
  leve: number;
  moderada: number;
  grave: number;
}

export interface IncidentsView {
  kpis: IncidentKpis;
  /** Todas las recibidas, sin filtrar. */
  items: IncidentView[];
  /** Las que cumplen el filtro de gravedad. */
  visible: IncidentView[];
  /** true si hay más páginas que la recibida: los conteos por gravedad cubren solo las primeras. */
  truncated: boolean;
}

/** Filtra por gravedad; «TODAS» devuelve la lista completa. */
export function filterIncidents(items: IncidentView[], filter: GuardianIncidentSeverityFilter): IncidentView[] {
  return filter === 'TODAS' ? items : items.filter(item => item.severity === filter);
}

/** Página nula o sin contenido: KPIs en 0 y sin tarjetas. */
export function adaptGuardianIncidents(page: GuardianIncidentsPage | null | undefined, filter: GuardianIncidentSeverityFilter = 'TODAS'): IncidentsView {
  const items = (page?.content ?? []).map(toIncidentView);
  const count = (severity: GuardianIncidentSeverity) => items.filter(item => item.severity === severity).length;
  return {
    kpis: { total: page?.totalElements ?? 0, leve: count('LEVE'), moderada: count('MODERADA'), grave: count('GRAVE') },
    items,
    visible: filterIncidents(items, filter),
    truncated: (page?.totalPages ?? 0) > 1,
  };
}

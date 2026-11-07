// Incidencias del estudiante para el apoderado (#117). Separación de DTO y mapeo a vista (#59).
import httpClient from '@/services/httpClient';
import { parseGuardianIncidentsPage } from '@/lib/guardianContract';
import { attendanceRangeError, isGuardianStudentId } from '@/services/padres/guardianAttendanceService';
import { GuardianValidationError, guardianReadErrorMessage } from '@/services/padres/guardianErrors';
import type {
  GuardianIncident,
  GuardianIncidentBackendDto,
  GuardianIncidentsPage,
  GuardianIncidentSeverityFilter,
} from '@/types/guardianIncidentsApi';

export const GUARDIAN_INCIDENTS_PAGE_SIZE = 20;
export const GUARDIAN_INCIDENTS_MAX_PAGE_SIZE = 100;
export const GUARDIAN_INCIDENTS_DEFAULT_DAYS = 30;
const LIMA = 'America/Lima';

/** Día escolar actual en America/Lima (YYYY-MM-DD): el backend filtra occurredAt por ese día. */
export function limaDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: LIMA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Últimos 30 días con ambos extremos, terminando hoy en Lima. */
export function incidentsDefaultRange(today = limaDay()): { from: string; to: string } {
  const [y, m, d] = today.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - (GUARDIAN_INCIDENTS_DEFAULT_DAYS - 1)));
  return { from: start.toISOString().slice(0, 10), to: today };
}

/** occurredAt (ISO-8601 UTC) como fecha y hora de Lima: «06/10/2026 10:00». */
export function formatLimaDateTime(instant: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LIMA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}

export function isValidGuardianPage(page: number, size: number, max = GUARDIAN_INCIDENTS_MAX_PAGE_SIZE): boolean {
  return Number.isSafeInteger(page) && page >= 0 && Number.isSafeInteger(size) && size >= 1 && size <= max;
}

/** Mapea el DTO del backend al modelo enriquecido de la vista. */
export function mapGuardianIncidentDto(dto: GuardianIncidentBackendDto, extra?: { studentId?: string | number; studentName?: string | null }): GuardianIncident {
  return {
    id: dto.id,
    occurredAt: dto.occurredAt,
    severity: dto.severity,
    description: dto.description,
    courseName: dto.courseName,
    teacherName: dto.teacherName ?? null,
    studentId: extra?.studentId,
    studentName: dto.studentName ?? extra?.studentName ?? null,
  };
}

/** Filtra incidencias por nivel de gravedad de forma segura en cliente. */
export function filterIncidentsBySeverity(incidents: GuardianIncident[], filter: GuardianIncidentSeverityFilter): GuardianIncident[] {
  if (!filter || filter === 'TODAS') return incidents;
  return incidents.filter(i => i.severity === filter);
}

export const guardianIncidentsService = {
  /** GET /v1/guardian/students/{studentId}/incidents: ordenadas por occurredAt DESC; rango de hasta 92 días. */
  async list(
    studentId: string,
    from: string,
    to: string,
    page = 0,
    size = GUARDIAN_INCIDENTS_PAGE_SIZE,
    signal?: AbortSignal,
    studentName?: string | null,
  ): Promise<GuardianIncidentsPage> {
    const rangeError = attendanceRangeError(from, to);
    if (rangeError) throw new GuardianValidationError(rangeError);
    if (!isGuardianStudentId(studentId)) throw new GuardianValidationError('Seleccione un estudiante vinculado.');
    if (!isValidGuardianPage(page, size)) throw new GuardianValidationError('La paginación solicitada no es válida.');

    const response = await httpClient.get<unknown>(`/v1/guardian/students/${studentId}/incidents`, {
      params: { from, to, page, size },
      signal,
    });

    const parsed = parseGuardianIncidentsPage(response.data, { page, size });
    return {
      ...parsed,
      content: parsed.content.map(item => mapGuardianIncidentDto(item, { studentId, studentName })),
    };
  },

  /** Consulta en paralelo para todos los hijos vinculados y pagina los resultados ordenados por fecha DESC. */
  async listForAllStudents(
    students: readonly { id: string; nombreCompleto: string }[],
    from: string,
    to: string,
    page = 0,
    size = GUARDIAN_INCIDENTS_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<GuardianIncidentsPage> {
    const rangeError = attendanceRangeError(from, to);
    if (rangeError) throw new GuardianValidationError(rangeError);
    if (!isValidGuardianPage(page, size)) throw new GuardianValidationError('La paginación solicitada no es válida.');
    if (students.length === 0) {
      return { content: [], page: 0, size, totalElements: 0, totalPages: 0 };
    }

    const pages = await Promise.all(
      students.map(s => this.list(s.id, from, to, 0, size, signal, s.nombreCompleto)),
    );

    const allContent = pages.flatMap(p => p.content);
    allContent.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    const totalElements = pages.reduce((sum, p) => sum + p.totalElements, 0);
    const totalPages = Math.ceil(totalElements / size) || 1;
    const pagedContent = allContent.slice(page * size, (page + 1) * size);

    return {
      content: pagedContent,
      page,
      size,
      totalElements,
      totalPages,
    };
  },
};

export function guardianIncidentsErrorMessage(error: unknown): string {
  return error instanceof GuardianValidationError ? error.message : guardianReadErrorMessage(error, 'incidents');
}

// Libreta bimestral publicada para el apoderado (FRONT #56, docs/guardian-report.md).
import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { GuardianContractError, parseGuardianReport, parsePublishedBimesters } from '@/lib/guardianContract';
import { isGuardianStudentId } from '@/services/padres/guardianAttendanceService';
import { GuardianValidationError, guardianReadErrorMessage } from '@/services/padres/guardianErrors';
import { formatLimaDateTime } from '@/services/padres/guardianIncidentsService';
import type { GuardianBimesterReport, GuardianPublishedBimester, GuardianReportPdf } from '@/types/guardianReportApi';

function studentPath(studentId: string): string {
  if (!isGuardianStudentId(studentId)) throw new GuardianValidationError('Seleccione un estudiante vinculado.');
  return `/v1/guardian/students/${studentId}`;
}
function bimesterId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new GuardianValidationError('Seleccione un bimestre publicado.');
  return value;
}

/**
 * Nombre de archivo a partir de Content-Disposition, saneado: solo [A-Za-z0-9_.-], sin rutas y con extensión .pdf.
 * Si falta o no es válido, usa el nombre de respaldo.
 */
export function guardianReportFileName(contentDisposition: unknown, fallback: string): string {
  const header = typeof contentDisposition === 'string' ? contentDisposition : '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  let name = '';
  if (match) {
    try { name = decodeURIComponent(match[1]); } catch { name = match[1]; }
  }
  name = name.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9_.-]/g, '').replace(/^\.+/, '') ?? '';
  if (!/\.pdf$/i.test(name) || name.length > 120 || name.length <= 4) return fallback;
  return name;
}

/** Respaldo cuando falta Content-Disposition: libreta-{código saneado | alumno}-{número de bimestre}.pdf. */
export function guardianReportFallbackName(studentCode: string | null, bimesterNumber: number): string {
  const code = (studentCode ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) || 'alumno';
  return `libreta-${code}-${bimesterNumber}.pdf`;
}

/** publishedAt (con desplazamiento de Lima) como fecha de Lima: «09/10/2026». */
export function formatLimaDate(instant: string): string {
  return formatLimaDateTime(instant).slice(0, 10);
}

/** Nota tal como la entrega el backend: entera sin decimales; si no, con dos decimales y coma («10,50»). Sin nota: «—». */
export function formatReportGrade(grade: number | null): string {
  if (grade === null) return '—';
  return Number.isInteger(grade) ? String(grade) : grade.toFixed(2).replace('.', ',');
}
/** Se resalta toda nota menor que 11, sin redondear antes (10,50 se resalta); null no se resalta. */
export function isFailingGrade(grade: number | null): boolean {
  return grade !== null && grade < 11;
}

/**
 * El backend ordena por inicio del periodo descendente y número de bimestre descendente; la vista toma [0].
 * Los periodos conservan el orden recibido; dentro de cada academicPeriodId solo se reordena, de forma estable,
 * por número de bimestre descendente. publishedAt no ordena: un bimestre anterior reabierto y vuelto a publicar
 * puede tener una fecha más reciente que el siguiente.
 */
export function sortPublishedBimesters(list: GuardianPublishedBimester[]): GuardianPublishedBimester[] {
  const periods: number[] = [];
  for (const b of list) if (!periods.includes(b.academicPeriodId)) periods.push(b.academicPeriodId);
  return periods.flatMap(period => list.filter(b => b.academicPeriodId === period).sort((a, b) => b.number - a.number));
}

/** Con responseType blob, el cuerpo de error llega como Blob: se convierte a objeto para leer su code. */
async function withJsonErrorBody(error: unknown): Promise<unknown> {
  if (!isAxiosError(error) || !error.response || !(error.response.data instanceof Blob)) return error;
  let data: unknown = null;
  try { data = JSON.parse(await error.response.data.text()); } catch { data = null; }
  error.response.data = data && typeof data === 'object' ? data : null;
  return error;
}

export const guardianReportService = {
  /** Bimestres publicados disponibles, del más reciente al más antiguo. */
  async published(studentId: string, signal?: AbortSignal): Promise<GuardianPublishedBimester[]> {
    const response = await httpClient.get<unknown>(`${studentPath(studentId)}/bimesters/published`, { signal });
    return sortPublishedBimesters(parsePublishedBimesters(response.data));
  },
  async report(studentId: string, bimester: number, signal?: AbortSignal): Promise<GuardianBimesterReport> {
    const response = await httpClient.get<unknown>(`${studentPath(studentId)}/bimesters/${bimesterId(bimester)}/report`, { signal });
    return parseGuardianReport(response.data, { studentId: Number(studentId), bimesterId: bimester });
  },
  /** PDF como blob con el JWT (no hay URL pública). Quien lo descargue debe liberar el object URL después. */
  async reportPdf(
    studentId: string, bimester: number, options: { fallbackName?: string; signal?: AbortSignal } = {},
  ): Promise<GuardianReportPdf> {
    const path = `${studentPath(studentId)}/bimesters/${bimesterId(bimester)}/report.pdf`;
    let response;
    try {
      response = await httpClient.get<unknown>(path, { responseType: 'blob', headers: { Accept: 'application/pdf' }, signal: options.signal });
    } catch (error) {
      throw await withJsonErrorBody(error);
    }
    const blob = response.data;
    const type = String(response.headers?.['content-type'] ?? '');
    if (response.status !== 200 || !(blob instanceof Blob) || blob.size === 0 || !/^application\/pdf\b/i.test(type)) {
      throw new GuardianContractError('libreta en PDF');
    }
    const fallback = options.fallbackName ?? `libreta-alumno-${bimester}.pdf`;
    return { blob, fileName: guardianReportFileName(response.headers?.['content-disposition'], fallback) };
  },
};

export function guardianReportErrorMessage(error: unknown, subject: 'published' | 'report' | 'reportPdf'): string {
  return error instanceof GuardianValidationError ? error.message : guardianReadErrorMessage(error, subject);
}

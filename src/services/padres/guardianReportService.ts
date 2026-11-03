// Libreta bimestral publicada para el apoderado (#56). La vista llega en el PR de la libreta.
import httpClient from '@/services/httpClient';
import { GuardianContractError, parseGuardianReport, parsePublishedBimesters } from '@/lib/guardianContract';
import { isGuardianStudentId } from '@/services/padres/guardianAttendanceService';
import { GuardianValidationError, guardianReadErrorMessage } from '@/services/padres/guardianErrors';
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

export const guardianReportService = {
  /** Bimestres publicados disponibles, del más reciente al más antiguo. */
  async published(studentId: string, signal?: AbortSignal): Promise<GuardianPublishedBimester[]> {
    const response = await httpClient.get<unknown>(`${studentPath(studentId)}/bimesters/published`, { signal });
    return parsePublishedBimesters(response.data);
  },
  async report(studentId: string, bimester: number, signal?: AbortSignal): Promise<GuardianBimesterReport> {
    const response = await httpClient.get<unknown>(`${studentPath(studentId)}/bimesters/${bimesterId(bimester)}/report`, { signal });
    return parseGuardianReport(response.data, { studentId: Number(studentId), bimesterId: bimester });
  },
  /** PDF como blob con el JWT (no hay URL pública). Quien lo descargue debe liberar el object URL después. */
  async reportPdf(studentId: string, bimester: number): Promise<GuardianReportPdf> {
    const response = await httpClient.get<unknown>(`${studentPath(studentId)}/bimesters/${bimesterId(bimester)}/report.pdf`, {
      responseType: 'blob', headers: { Accept: 'application/pdf' },
    });
    const blob = response.data;
    const type = String(response.headers?.['content-type'] ?? '');
    if (response.status !== 200 || !(blob instanceof Blob) || blob.size === 0 || !/^application\/pdf\b/i.test(type)) {
      throw new GuardianContractError('libreta en PDF');
    }
    return { blob, fileName: guardianReportFileName(response.headers?.['content-disposition'], `libreta-${bimester}.pdf`) };
  },
};

export function guardianReportErrorMessage(error: unknown, subject: 'published' | 'report' | 'reportPdf'): string {
  return error instanceof GuardianValidationError ? error.message : guardianReadErrorMessage(error, subject);
}

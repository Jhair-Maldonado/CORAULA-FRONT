import httpClient from '@/services/httpClient';
import { isAxiosError } from 'axios';
import { parseBimesterResponse, parseBimestersResponse } from '@/lib/manualGradesContract';
import type { Bimester, BimesterInput, EvaluationConfiguration, EvaluationCriterion, CreateEvaluationCriterionInput, UpdateEvaluationCriterionInput } from '@/types/evaluationApi';
const base = '/v1/management';
export const evaluationService = {
  async getCriteria(courseId: string | number, academicPeriodId: number): Promise<EvaluationConfiguration> {
    return (await httpClient.get<EvaluationConfiguration>(`${base}/courses/${encodeURIComponent(courseId)}/evaluation-criteria`, { params: { academicPeriodId } })).data;
  },
  async getBimesters(periodId: number): Promise<Bimester[]> {
    const rows = parseBimestersResponse((await httpClient.get<unknown>(`${base}/academic-periods/${periodId}/bimesters`)).data);
    if (rows.some(b => b.academicPeriodId !== periodId)) throw new Error('La lista no corresponde al periodo solicitado.');
    return rows;
  },
  async openBimester(id: number): Promise<Bimester> {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('El ID del bimestre debe ser un entero positivo.');
    const response = await httpClient.post<unknown>(`${base}/bimesters/${id}/open`);
    if (response.status !== 200) throw new Error('La respuesta de apertura no pudo confirmarse.');
    const bimester = parseBimesterResponse(response.data);
    if (bimester.id !== id || bimester.status !== 'ABIERTO') throw new Error('La respuesta de apertura no corresponde al bimestre solicitado.');
    return bimester;
  },
  async annulBimester(id: number, reason: string): Promise<Bimester> {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('El ID del bimestre debe ser un entero positivo.');
    const trimmed = reason.trim();
    if (!trimmed) throw new Error('El motivo de anulación es obligatorio.');
    const response = await httpClient.post<unknown>(`${base}/bimesters/${id}/annul`, { reason: trimmed });
    if (response.status !== 200) throw new Error('La respuesta de anulación no pudo confirmarse.');
    const bimester = parseBimesterResponse(response.data);
    if (bimester.id !== id || bimester.status !== 'ANULADO') throw new Error('La respuesta de anulación no corresponde al bimestre solicitado.');
    return bimester;
  },
  async getCriterion(criterionId: number): Promise<EvaluationCriterion> {
    return (await httpClient.get<EvaluationCriterion>(`${base}/evaluation-criteria/${criterionId}`)).data;
  },
  async createCriterion(courseId: string | number, input: CreateEvaluationCriterionInput): Promise<EvaluationCriterion> {
    return (await httpClient.post<EvaluationCriterion>(`${base}/courses/${encodeURIComponent(courseId)}/evaluation-criteria`, input)).data;
  },
  async updateCriterion(criterionId: number, input: UpdateEvaluationCriterionInput): Promise<EvaluationCriterion> {
    return (await httpClient.patch<EvaluationCriterion>(`${base}/evaluation-criteria/${criterionId}`, input)).data;
  },
  async createBimester(periodId: number, input: BimesterInput): Promise<Bimester> {
    return (await httpClient.post<Bimester>(`${base}/academic-periods/${periodId}/bimesters`, input)).data;
  },
  async updateBimester(id: number, input: Omit<BimesterInput, 'number'>): Promise<Bimester> {
    return (await httpClient.patch<Bimester>(`${base}/bimesters/${id}`, input)).data;
  },
};

export function bimesterOpeningErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'La apertura no pudo confirmarse. Actualiza la lista antes de volver a intentar.';
  switch (error.response?.status) {
    case 400: return 'El identificador del bimestre no es válido. Actualiza la lista.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para abrir bimestres.';
    case 404: return 'El bimestre o periodo ya no está disponible.';
    case 409: return 'No se puede abrir: el estado del bimestre o su periodo pudo haber cambiado. Se consultará nuevamente la lista.';
    default: return 'La operación no está confirmada. Consulta el estado antes de intentar otra apertura.';
  }
}

// Catalog controllers (#43) add a machine-readable code; 401/403 bodies never carry one.
export function catalogErrorCode(error: unknown): string | null {
  const body: unknown = isAxiosError(error) ? error.response?.data : undefined;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string' ? body.code : null;
}

const annulmentCodeMessages: Record<string, string> = {
  BIMESTER_HAS_DEPENDENCIES: 'No se puede anular: el bimestre ya tiene información académica registrada (notas, actividades, participaciones o resultados).',
  BIMESTER_STATE_CONFLICT: 'No se puede anular: solo se anulan bimestres Planificados o Abiertos, y su estado pudo haber cambiado.',
  REASON_REQUIRED: 'Ingresa el motivo de la anulación.',
  INVALID_REQUEST: 'La solicitud de anulación no es válida. Actualiza la lista.',
  RESOURCE_NOT_FOUND: 'El bimestre ya no está disponible.',
  ACADEMIC_CATALOG_CONFLICT: 'No se puede anular por un conflicto con la configuración académica. Actualiza la lista.',
  INTERNAL_ERROR: 'El servidor no pudo completar la anulación. Consulta el estado antes de volver a intentar.',
};

export function bimesterAnnulmentErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'La anulación no pudo confirmarse. Revisa el estado en la lista antes de volver a intentar.';
  if (!error.response) return 'No se recibió respuesta del servidor: el resultado de la anulación es incierto. Revisa el estado en la lista antes de volver a intentar.';
  if (error.response.status === 401) return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
  if (error.response.status === 403) return 'No tienes autorización para anular bimestres.';
  const code = catalogErrorCode(error);
  if (code && annulmentCodeMessages[code]) return annulmentCodeMessages[code];
  if (error.response.status === 409) return 'No se puede anular: el bimestre cambió o entra en conflicto con otro registro. Actualiza la lista.';
  return 'La anulación no está confirmada. Consulta el estado antes de volver a intentar.';
}

export function evaluationErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  if (error.response.status === 401) return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
  if (error.response.status === 403) return 'No tienes permiso para acceder a esta configuración.';
  const body: unknown = error.response.data;
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message.trim()) {
    const details = 'details' in body && Array.isArray(body.details) ? body.details
      .filter((detail): detail is { field: string; message: string } => !!detail && typeof detail === 'object' && typeof detail.field === 'string' && typeof detail.message === 'string')
      .map(detail => `${detail.field}: ${detail.message}`).join('. ') : '';
    return details ? `${body.message}. ${details}` : body.message;
  }
  if (error.response.status === 404) return 'No se encontró el curso, periodo o bimestre solicitado.';
  if (error.response.status === 409) return 'La configuración cambió o entra en conflicto con otro registro. Actualiza la lista y revisa los datos.';
  if (error.response.status === 400 || error.response.status === 422) return 'Revisa los campos de configuración y el periodo seleccionado.';
  return 'No se pudo completar la solicitud. Intenta nuevamente.';
}

import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { addDays, formatIsoDate, isIsoDate, parseGradeWindow } from '@/lib/gradeWindowContract';
import { gradeWindowErrorCodeMessage, type GradeWindowAction } from '@/services/admin/gradeWindowErrors';
import type { Bimester } from '@/types/evaluationApi';
import type { ExtendGradeWindowRequest, GradeWindow, SetRegistrationDateRequest } from '@/types/gradeWindowApi';

export type { GradeWindowAction } from '@/services/admin/gradeWindowErrors';
export const maxGradeWindowReasonLength = 255;
// D may be set while PLANIFICADO or ABIERTO; the extension only while ABIERTO. The backend still decides.
export const gradeWindowActionStatuses: Record<GradeWindowAction, readonly Bimester['status'][]> = {
  registrationDate: ['PLANIFICADO', 'ABIERTO'],
  extension: ['ABIERTO'],
};

const base = '/v1/management/bimesters';
function requestId(value: number) { if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El ID del bimestre debe ser un entero positivo.'); return value; }

export function gradeWindowReasonError(reason: string): string | null {
  const motive = reason.trim();
  if (!motive) return 'Indica el motivo.';
  return motive.length > maxGradeWindowReasonLength ? `El motivo no puede superar los ${maxGradeWindowReasonLength} caracteres.` : null;
}

export function registrationDateError(date: string, startDate: string, current: GradeWindow): string | null {
  if (!isIsoDate(date)) return 'Indica una fecha de registro válida.';
  if (date < startDate) return `La fecha de registro no puede ser anterior al inicio del bimestre (${formatIsoDate(startDate)}).`;
  return date === current.registrationDate ? 'Ya es la fecha vigente.' : null;
}

// Earliest valid extension: after the current deadline and not before today (Lima).
export function minExtensionDate(current: GradeWindow, today: string): string {
  const next = addDays(current.deadline, 1);
  return today > next ? today : next;
}

export function extensionDeadlineError(date: string, current: GradeWindow, today: string): string | null {
  if (!isIsoDate(date)) return 'Indica una fecha límite válida.';
  if (date <= current.deadline) return `La ampliación debe ser posterior al plazo vigente (${formatIsoDate(current.deadline)}).`;
  return date < today ? `La ampliación no puede ser anterior a hoy (${formatIsoDate(today)}, hora de Lima).` : null;
}

export const gradeWindowService = {
  async get(bimesterId: number, signal?: AbortSignal): Promise<GradeWindow> {
    const response = await httpClient.get<unknown>(`${base}/${requestId(bimesterId)}/grade-window`, { signal });
    if (response.status !== 200) throw new Error('Plazo de registro no confirmado.');
    return parseGradeWindow(response.data, bimesterId);
  },
  async setRegistrationDate(bimesterId: number, registrationDate: string, reason: string): Promise<GradeWindow> {
    if (!isIsoDate(registrationDate)) throw new Error('Indica una fecha de registro válida.');
    const error = gradeWindowReasonError(reason);
    if (error) throw new Error(error);
    // Whitelist the wire fields: the backend rejects unknown properties.
    const body: SetRegistrationDateRequest = { registrationDate, reason: reason.trim() };
    const response = await httpClient.put<unknown>(`${base}/${requestId(bimesterId)}/grade-window/registration-date`, body);
    if (response.status !== 200) throw new Error('Fecha de registro no confirmada.');
    const view = parseGradeWindow(response.data, bimesterId);
    if (view.registrationDate !== registrationDate || !view.registrationDateConfigured) throw new Error('La respuesta no confirma la fecha de registro.');
    return view;
  },
  async extend(bimesterId: number, deadline: string, reason: string): Promise<GradeWindow> {
    if (!isIsoDate(deadline)) throw new Error('Indica una fecha límite válida.');
    const error = gradeWindowReasonError(reason);
    if (error) throw new Error(error);
    const body: ExtendGradeWindowRequest = { deadline, reason: reason.trim() };
    const response = await httpClient.post<unknown>(`${base}/${requestId(bimesterId)}/grade-window/extension`, body);
    if (response.status !== 200) throw new Error('Ampliación no confirmada.');
    const view = parseGradeWindow(response.data, bimesterId);
    if (view.extendedDeadline !== deadline || view.deadline !== deadline) throw new Error('La respuesta no confirma la ampliación.');
    return view;
  },
};

// Without a response, a 5xx or an unexpected body, the write may or may not have happened: never retry.
export function isUncertainGradeWindowAction(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

const invalidRequest: Record<GradeWindowAction, string> = {
  registrationDate: 'Revisa la fecha de registro (no anterior al inicio del bimestre) y el motivo (obligatorio, hasta 255 caracteres).',
  extension: 'Revisa la nueva fecha límite (posterior al plazo vigente y no anterior a hoy) y el motivo (obligatorio, hasta 255 caracteres).',
};

export function gradeWindowActionErrorMessage(error: unknown, action: GradeWindowAction): string {
  if (isUncertainGradeWindowAction(error)) return 'No se pudo confirmar la operación. Se consultó el plazo sin repetirla; revisa el panel antes de continuar.';
  const byCode = gradeWindowErrorCodeMessage(error, action);
  if (byCode) return byCode;
  switch (isAxiosError(error) ? error.response?.status : undefined) {
    case 400: return invalidRequest[action];
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede fijar la fecha de registro o ampliar el plazo.';
    case 404: return 'El bimestre ya no está disponible. Se recargó el panel.';
    case 409: return 'El bimestre cambió. Se recargó el panel; revísalo antes de continuar.';
    default: return 'No se pudo completar la operación. Se recargó el panel.';
  }
}

export function gradeWindowReadErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'El plazo de registro no pudo confirmarse. Actualiza el panel.';
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para consultar el plazo de registro.';
    case 404: return 'El bimestre ya no está disponible.';
    default: return 'No se pudo consultar el plazo de registro. Intenta nuevamente.';
  }
}

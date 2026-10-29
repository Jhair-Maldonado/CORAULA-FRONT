import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { AccountStateAction, AccountStateChangeResponse, AccountStateReasonCode, ChangeAccountStateRequest } from '@/types/staffAccountApi';

// BACK #105: generic login-account state for DOCENTE and DIRECTIVO accounts, independent of teacher.active.
// Wire details live here only, so a contract adjustment in the backend CONFIRMACIÓN touches this file.
const transitions: Record<AccountStateAction, { path: string; from: boolean; to: boolean }> = {
  DEACTIVATE: { path: 'deactivate', from: true, to: false },
  REACTIVATE: { path: 'reactivate', from: false, to: true },
};

export const accountStateActionLabels: Record<AccountStateAction, { button: string; title: string; confirm: string }> = {
  DEACTIVATE: { button: 'Deshabilitar cuenta', title: 'Deshabilitar cuenta de acceso', confirm: 'Confirmar baja de la cuenta' },
  REACTIVATE: { button: 'Habilitar cuenta', title: 'Habilitar cuenta de acceso', confirm: 'Confirmar reactivación' },
};

// Reason catalog per action, in the backend order (approved by Coordinación).
export const accountStateReasons: Record<AccountStateAction, Partial<Record<AccountStateReasonCode, string>>> = {
  DEACTIVATE: {
    END_OF_ASSIGNMENT: 'Fin de la designación', RESIGNATION: 'Renuncia', ADMINISTRATIVE_REVIEW: 'Revisión administrativa',
    ERRONEOUS_RECORD: 'Registro erróneo', OTHER: 'Otro',
  },
  REACTIVATE: { RETURN_TO_POST: 'Retorno al puesto', ADMINISTRATIVE_CORRECTION: 'Corrección administrativa', OTHER: 'Otro' },
};

export const maxAccountStateJustificationLength = 1000;

export function accountStateActionFor(active: boolean): AccountStateAction {
  return active ? 'DEACTIVATE' : 'REACTIVATE';
}

const isReasonOf = (action: AccountStateAction, value: string): value is AccountStateReasonCode =>
  Object.prototype.hasOwnProperty.call(accountStateReasons[action], value);

export function accountStateValidation(action: AccountStateAction, reasonCode: string, justification: string): string | null {
  if (!isReasonOf(action, reasonCode)) return 'Selecciona un motivo.';
  const text = justification.trim();
  if (!text) return 'La justificación es obligatoria.';
  if (text.length > maxAccountStateJustificationLength) return 'La justificación no puede superar los 1000 caracteres.';
  return null;
}

export function toChangeAccountState(action: AccountStateAction, reasonCode: string, justification: string): ChangeAccountStateRequest {
  if (!isReasonOf(action, reasonCode)) throw new Error('Motivo no válido para la acción.');
  return { reasonCode, justification: justification.trim() };
}

export const accountStateService = {
  async change(userId: number, action: AccountStateAction, request: ChangeAccountStateRequest): Promise<AccountStateChangeResponse> {
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('No se pudo identificar la cuenta.');
    const { path, from, to } = transitions[action];
    // Whitelist the wire fields; never send UI-only fields.
    const response = await httpClient.patch<AccountStateChangeResponse>('/v1/management/accounts/' + userId + '/' + path,
      { reasonCode: request.reasonCode, justification: request.justification });
    const data = response.data;
    if (response.status !== 200 || !data || data.userId !== userId || data.active !== to || data.previousActive !== from
      || data.reasonCode !== request.reasonCode) {
      throw new Error('La respuesta del cambio de estado de la cuenta no coincide con la solicitud.');
    }
    return data;
  },
};

// Without a response, a 5xx or an unexpected body, the state may or may not have changed: never retry automatically.
export function isUncertainAccountStateChange(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

// 404, 409 and uncertain outcomes close the dialog and reload the data; 400/401/403 keep the dialog open.
export function accountStateChangeReloads(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return isUncertainAccountStateChange(error) || status === 404 || status === 409;
}

// Backend texts are never shown.
export function accountStateErrorMessage(error: unknown): string {
  if (isUncertainAccountStateChange(error)) return 'No se pudo confirmar el cambio de estado de la cuenta. Se volvieron a consultar los datos sin repetir la solicitud; revisa el estado actual.';
  switch (isAxiosError(error) ? error.response?.status : undefined) {
    case 400: return 'Revisa el motivo y la justificación (obligatoria, hasta 1000 caracteres).';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede cambiar el estado de una cuenta de acceso.';
    case 404: return 'La cuenta ya no existe o no se puede gestionar. Se actualizaron los datos.';
    case 409: return 'El estado de la cuenta cambió y esta acción ya no está permitida. Se actualizaron los datos.';
    default: return 'No se pudo cambiar el estado de la cuenta. Intenta nuevamente.';
  }
}

export function accountStateSuccessMessage(change: AccountStateChangeResponse): string {
  return change.active
    ? 'Cuenta habilitada. Ya puede iniciar sesión.'
    : 'Cuenta deshabilitada. No podrá iniciar sesión; su historial se conserva.';
}

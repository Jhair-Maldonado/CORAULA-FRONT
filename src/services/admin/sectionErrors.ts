import { isAxiosError } from 'axios';

export function sectionErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function sectionErrorMessage(error: unknown, conflict = 'La operación entra en conflicto con el estado actual.'): string {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentar.';
  const body: unknown = error.response.data;
  const message = typeof body === 'string' ? body : body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : undefined;
  let result: string;
  switch (error.response.status) {
    case 400: result = message || 'Los datos enviados no son válidos.'; break;
    case 401: result = 'Tu sesión no permite completar la solicitud.'; break;
    case 403: result = 'No tienes permisos para realizar esta operación.'; break;
    case 404: result = message || 'El recurso solicitado no existe.'; break;
    case 409: result = message || conflict; break;
    case 422: result = message || 'No se cumple una regla de negocio. Verifica que los recursos estén activos y sean compatibles.'; break;
    default: result = 'El servidor no pudo completar la solicitud. Intenta nuevamente.';
  }
  if ([409, 422].includes(error.response.status) && body && typeof body === 'object' && 'details' in body && body.details != null) {
    const details = typeof body.details === 'string' ? body.details : JSON.stringify(body.details, null, 2);
    if (details) result += `\n${details}`;
  }
  return result;
}

// Messages for create/edit/status changes: fixed Spanish texts, never the backend's. The UI tells apart the
// active-enrollments 409 on deactivation by re-reading the section (see deactivateSection); every other 409 is generic.
export function sectionManagementErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  switch (error.response.status) {
    case 400: return 'Revisa los datos: nombre de 1 a 10 caracteres, capacidad mayor que 0 y grado válido para el nivel.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para gestionar secciones.';
    case 404: return 'Sección o periodo académico no encontrado. Actualiza la información.';
    case 409: return 'No se pudo guardar por un conflicto con el estado actual: sección duplicada en el periodo, capacidad menor que las matrículas activas, periodo inactivo, sección inactiva o con matrículas o cursos asociados. Actualiza la información e intenta nuevamente.';
    default: return 'El servidor no pudo completar la solicitud. Intenta nuevamente.';
  }
}

// src/lib/api.ts
import {
  PadrePerfil,
  HijoResumen,
  CursoCalificacion,
  RegistroAsistenciaDia,
  JustificacionInasistencia,
  HorarioSemanaPadre,
  ComunicadoPadre,
  CuotaPension,
  ResumenDashboardPadre,
  AlertaAsistencia,
  IncidenciaAsistencia
} from '@/types/padre';
import { ContactoChat } from '@/types/chat';

import {
  MOCK_PADRE_PERFIL,
  MOCK_HIJOS,
  MOCK_CALIFICACIONES_SOFIA,
  MOCK_CALIFICACIONES_MATEO,
  MOCK_ASISTENCIA_SOFIA,
  MOCK_JUSTIFICACIONES,
  MOCK_ALERTAS_ASISTENCIA,
  MOCK_INCIDENCIAS_ASISTENCIA,
  MOCK_HORARIO_SOFIA,
  MOCK_COMUNICADOS,
  MOCK_PAGOS,
  MOCK_CHAT_CONTACTOS_PADRE,
  getMockResumenDashboard
} from './mocks/mockPadres';

// Determina si se usan mocks o backend real según variable de entorno
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Retardo simulado para validar estados de carga (Loading skeleton / spinners)
const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Obtiene el token de autenticación almacenado en el navegador (cliente)
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('coraula_token') || sessionStorage.getItem('coraula_token') || null;
}

/**
 * Cliente HTTP base para llamadas al backend real con autorización Bearer
 */
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.message) errorMessage = errorJson.message;
    } catch {
      // Ignorar error al parsear respuesta no JSON
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ==========================================
// 1. PERFIL DEL PADRE Y ESTUDIANTES A CARGO
// ==========================================

/**
 * Obtiene los datos del padre o apoderado autenticado
 */
export async function getPadrePerfil(): Promise<PadrePerfil> {
  if (USE_MOCKS) {
    await mockDelay(250);
    return { ...MOCK_PADRE_PERFIL };
  }
  // TODO(backend): Confirmar endpoint GET /padres/perfil y esquema de respuesta del usuario
  return fetchWithAuth<PadrePerfil>('/padres/perfil');
}

/**
 * Lista los hijos o estudiantes vinculados al padre autenticado
 */
export async function getHijos(): Promise<HijoResumen[]> {
  if (USE_MOCKS) {
    await mockDelay(250);
    return [...MOCK_HIJOS];
  }
  // TODO(backend): Confirmar endpoint GET /padres/mis-hijos y si devuelve estadísticas calculadas
  return fetchWithAuth<HijoResumen[]>('/padres/mis-hijos');
}

/**
 * Obtiene el detalle o ficha de un estudiante por su ID
 */
export async function getHijoById(hijoId: string): Promise<HijoResumen | null> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const hijo = MOCK_HIJOS.find(h => h.id === hijoId);
    return hijo ? { ...hijo } : null;
  }
  // TODO(backend): Confirmar endpoint GET /estudiantes/:id/ficha-padre
  return fetchWithAuth<HijoResumen>(`/estudiantes/${hijoId}/ficha-padre`);
}

// ==========================================
// 2. DASHBOARD DE RESUMEN
// ==========================================

/**
 * Obtiene el resumen del dashboard para el hijo seleccionado
 */
export async function getDashboardResumen(hijoId: string): Promise<ResumenDashboardPadre> {
  if (USE_MOCKS) {
    await mockDelay(350);
    return getMockResumenDashboard(hijoId);
  }
  // TODO(backend): Confirmar endpoint GET /padres/dashboard?hijoId=:id con métricas consolidadas
  return fetchWithAuth<ResumenDashboardPadre>(`/padres/dashboard?hijoId=${encodeURIComponent(hijoId)}`);
}

// ==========================================
// 3. CALIFICACIONES Y LIBRETA DE NOTAS
// ==========================================

/**
 * Obtiene las calificaciones bimestrales y competencias del estudiante
 */
export async function getCalificaciones(hijoId: string, bimestre?: number): Promise<CursoCalificacion[]> {
  if (USE_MOCKS) {
    await mockDelay(300);
    const list = hijoId === 'hijo-002' ? MOCK_CALIFICACIONES_MATEO : MOCK_CALIFICACIONES_SOFIA;
    return [...list];
  }
  // TODO(backend): Confirmar endpoint GET /academico/calificaciones?hijoId=:id&bimestre=:num
  const query = new URLSearchParams({ hijoId });
  if (bimestre) query.set('bimestre', bimestre.toString());
  return fetchWithAuth<CursoCalificacion[]>(`/academico/calificaciones?${query.toString()}`);
}

// ==========================================
// 4. ASISTENCIA Y JUSTIFICACIONES
// ==========================================

/**
 * Obtiene el historial de asistencia mensual del estudiante
 */
export async function getAsistencia(hijoId: string, mes?: string): Promise<RegistroAsistenciaDia[]> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return [...MOCK_ASISTENCIA_SOFIA];
  }
  // TODO(backend): Confirmar endpoint GET /asistencia/estudiante/:id?mes=:mes
  const query = new URLSearchParams();
  if (mes) query.set('mes', mes);
  return fetchWithAuth<RegistroAsistenciaDia[]>(`/asistencia/estudiante/${hijoId}?${query.toString()}`);
}

/**
 * Lista las justificaciones enviadas para un estudiante
 */
export async function getJustificaciones(hijoId: string): Promise<JustificacionInasistencia[]> {
  if (USE_MOCKS) {
    await mockDelay(250);
    return MOCK_JUSTIFICACIONES.filter(j => j.hijoId === hijoId);
  }
  // TODO(backend): Confirmar endpoint GET /asistencia/justificaciones?hijoId=:id
  return fetchWithAuth<JustificacionInasistencia[]>(`/asistencia/justificaciones?hijoId=${encodeURIComponent(hijoId)}`);
}

/**
 * Envía una nueva justificación de inasistencia
 */
export async function enviarJustificacion(data: {
  hijoId: string;
  fechaInasistencia: string;
  motivo: JustificacionInasistencia['motivo'];
  descripcion: string;
  archivoNombre?: string;
}): Promise<JustificacionInasistencia> {
  if (USE_MOCKS) {
    await mockDelay(400);
    const hijo = MOCK_HIJOS.find(h => h.id === data.hijoId) || MOCK_HIJOS[0];
    const nueva: JustificacionInasistencia = {
      id: `just-${Date.now()}`,
      hijoId: data.hijoId,
      hijoNombre: hijo.nombreCompleto,
      fechaInasistencia: data.fechaInasistencia,
      motivo: data.motivo,
      descripcion: data.descripcion,
      archivoAdjuntoNombre: data.archivoNombre || undefined,
      fechaEnvio: new Date().toISOString().replace('T', ' ').slice(0, 16),
      estado: 'Pendiente'
    };
    MOCK_JUSTIFICACIONES.unshift(nueva);
    return nueva;
  }
  // TODO(backend): Confirmar endpoint POST /asistencia/justificaciones y si soporta multipart/form-data para adjuntos
  return fetchWithAuth<JustificacionInasistencia>('/asistencia/justificaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Obtiene las alertas de asistencia en vivo (ej. alumno no llegó tras 15 minutos)
 */
export async function getAlertasAsistencia(hijoId?: string): Promise<AlertaAsistencia[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    if (hijoId) {
      return MOCK_ALERTAS_ASISTENCIA.filter(a => a.hijoId === hijoId);
    }
    return [...MOCK_ALERTAS_ASISTENCIA];
  }
  // TODO(backend): Confirmar endpoint GET /asistencia/alertas?hijoId=:id
  const query = new URLSearchParams();
  if (hijoId) query.set('hijoId', hijoId);
  return fetchWithAuth<AlertaAsistencia[]>(`/asistencia/alertas?${query.toString()}`);
}

/**
 * Obtiene las incidencias registradas (estilo cary.pen)
 */
export async function getIncidenciasAsistencia(hijoId?: string): Promise<IncidenciaAsistencia[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    if (hijoId) {
      return MOCK_INCIDENCIAS_ASISTENCIA.filter(i => i.hijoId === hijoId);
    }
    return [...MOCK_INCIDENCIAS_ASISTENCIA];
  }
  // TODO(backend): Confirmar endpoint GET /asistencia/incidencias?hijoId=:id
  const query = new URLSearchParams();
  if (hijoId) query.set('hijoId', hijoId);
  return fetchWithAuth<IncidenciaAsistencia[]>(`/asistencia/incidencias?${query.toString()}`);
}

/**
 * Resuelve o marca como regularizada una alerta de inasistencia
 */
export async function resolverAlerta(alertaId: string): Promise<boolean> {
  if (USE_MOCKS) {
    await mockDelay(250);
    const alerta = MOCK_ALERTAS_ASISTENCIA.find(a => a.id === alertaId);
    if (alerta) alerta.estado = 'Regularizada';
    return true;
  }
  // TODO(backend): Confirmar endpoint PATCH /asistencia/alertas/:id/resolver
  await fetchWithAuth(`/asistencia/alertas/${alertaId}/resolver`, { method: 'PATCH' });
  return true;
}


// ==========================================
// 5. HORARIO ESCOLAR
// ==========================================

/**
 * Obtiene el horario escolar semanal del estudiante
 */
export async function getHorario(hijoId: string): Promise<HorarioSemanaPadre[]> {
  if (USE_MOCKS) {
    await mockDelay(250);
    return [...MOCK_HORARIO_SOFIA];
  }
  // TODO(backend): Confirmar endpoint GET /horarios/estudiante/:id
  return fetchWithAuth<HorarioSemanaPadre[]>(`/horarios/estudiante/${hijoId}`);
}

// ==========================================
// 6. COMUNICADOS Y CIRCULARES
// ==========================================

/**
 * Obtiene los comunicados escolares dirigidos al padre
 */
export async function getComunicados(hijoId?: string): Promise<ComunicadoPadre[]> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return [...MOCK_COMUNICADOS];
  }
  // TODO(backend): Confirmar endpoint GET /comunicados?para=padres&hijoId=:id
  const query = new URLSearchParams();
  if (hijoId) query.set('hijoId', hijoId);
  return fetchWithAuth<ComunicadoPadre[]>(`/comunicados?${query.toString()}`);
}

/**
 * Marca un comunicado como leído
 */
export async function marcarComunicadoLeido(comunicadoId: string): Promise<boolean> {
  if (USE_MOCKS) {
    await mockDelay(150);
    const comm = MOCK_COMUNICADOS.find(c => c.id === comunicadoId);
    if (comm) comm.leido = true;
    return true;
  }
  // TODO(backend): Confirmar endpoint PATCH /comunicados/:id/lectura
  await fetchWithAuth(`/comunicados/${comunicadoId}/lectura`, { method: 'PATCH' });
  return true;
}

/**
 * Firma digitalmente una circular o autorización escolar
 */
export async function firmarComunicado(comunicadoId: string, nombreFirma: string): Promise<boolean> {
  if (USE_MOCKS) {
    await mockDelay(350);
    const comm = MOCK_COMUNICADOS.find(c => c.id === comunicadoId);
    if (comm) {
      comm.firmado = true;
      comm.firmaNombre = nombreFirma;
      comm.firmaFecha = new Date().toISOString().replace('T', ' ').slice(0, 16);
      comm.leido = true;
    }
    return true;
  }
  // TODO(backend): Confirmar endpoint POST /comunicados/:id/firmar con payload { firmaNombre, timestamp }
  await fetchWithAuth(`/comunicados/${comunicadoId}/firmar`, {
    method: 'POST',
    body: JSON.stringify({ nombreFirma }),
  });
  return true;
}

// ==========================================
// 7. PAGOS Y PENSIONES
// ==========================================

/**
 * Obtiene el estado de cuenta y cronograma de pensiones
 */
export async function getPagos(hijoId?: string): Promise<CuotaPension[]> {
  if (USE_MOCKS) {
    await mockDelay(300);
    if (hijoId) {
      return MOCK_PAGOS.filter(p => p.hijoId === hijoId);
    }
    return [...MOCK_PAGOS];
  }
  // TODO(backend): Confirmar endpoint GET /finanzas/pensiones?hijoId=:id
  const query = new URLSearchParams();
  if (hijoId) query.set('hijoId', hijoId);
  return fetchWithAuth<CuotaPension[]>(`/finanzas/pensiones?${query.toString()}`);
}

/**
 * Registra o sube constancia de un pago de pensión
 */
export async function registrarPago(data: {
  pagoId: string;
  metodoPago: CuotaPension['metodoPago'];
  numeroOperacion: string;
  comprobanteNombre?: string;
}): Promise<boolean> {
  if (USE_MOCKS) {
    await mockDelay(400);
    const pago = MOCK_PAGOS.find(p => p.id === data.pagoId);
    if (pago) {
      pago.estado = 'Pagado';
      pago.fechaPago = new Date().toISOString().slice(0, 10);
      pago.metodoPago = data.metodoPago;
      pago.numeroOperacion = data.numeroOperacion;
    }
    return true;
  }
  // TODO(backend): Confirmar endpoint POST /finanzas/pagos/reportar
  await fetchWithAuth('/finanzas/pagos/reportar', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return true;
}

// ==========================================
// 8. CHAT Y MENSAJERÍA CON DOCENTES
// ==========================================

/**
 * Obtiene los contactos y conversaciones de los docentes/tutores
 */
export async function getChatContactos(): Promise<ContactoChat[]> {
  if (USE_MOCKS) {
    await mockDelay(250);
    return [...MOCK_CHAT_CONTACTOS_PADRE];
  }
  // TODO(backend): Confirmar endpoint GET /chat/contactos?rol=docente
  return fetchWithAuth<ContactoChat[]>('/chat/contactos?rol=docente');
}

/**
 * Envía un mensaje en el chat a un docente o tutor
 */
export async function enviarMensajeChat(contactoId: string, texto: string): Promise<boolean> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const contacto = MOCK_CHAT_CONTACTOS_PADRE.find(c => c.id === contactoId);
    if (contacto) {
      const nuevoMensaje = {
        id: `msg-${Date.now()}`,
        remitenteId: MOCK_PADRE_PERFIL.id,
        remitenteNombre: MOCK_PADRE_PERFIL.nombres,
        esMio: true,
        texto,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        leido: false
      };
      contacto.mensajes.push(nuevoMensaje);
      contacto.ultimoMensaje = texto;
      contacto.ultimaHora = nuevoMensaje.hora;
    }
    return true;
  }
  // TODO(backend): Confirmar endpoint POST /chat/mensajes con socket o REST
  await fetchWithAuth('/chat/mensajes', {
    method: 'POST',
    body: JSON.stringify({ destinatarioId: contactoId, texto }),
  });
  return true;
}

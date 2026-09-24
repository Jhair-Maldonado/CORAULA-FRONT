// src/services/padres/padreService.ts
/**
 * Servicio de Padres
 * 
 * NOTA: Por ahora utiliza mocks. En el futuro, se conectará a los endpoints
 * reales de Spring Boot mediante httpClient.
 * 
 * TODO(futuro):
 * import httpClient from '../httpClient';
 */
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
} from '@/lib/mocks/mockPadres';

// Retardo simulado
const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getPadrePerfil(): Promise<PadrePerfil> {
  await mockDelay(250);
  return { ...MOCK_PADRE_PERFIL };
}

export async function getHijos(): Promise<HijoResumen[]> {
  await mockDelay(250);
  return [...MOCK_HIJOS];
}

export async function getHijoById(hijoId: string): Promise<HijoResumen | null> {
  await mockDelay(200);
  const hijo = MOCK_HIJOS.find(h => h.id === hijoId);
  return hijo ? { ...hijo } : null;
}

export async function getDashboardResumen(hijoId: string): Promise<ResumenDashboardPadre> {
  await mockDelay(350);
  return getMockResumenDashboard(hijoId);
}

export async function getCalificaciones(hijoId: string, bimestre?: number): Promise<CursoCalificacion[]> {
  await mockDelay(300);
  const list = hijoId === 'hijo-002' ? MOCK_CALIFICACIONES_MATEO : MOCK_CALIFICACIONES_SOFIA;
  return [...list];
}

export async function getAsistencia(hijoId: string, mes?: string): Promise<RegistroAsistenciaDia[]> {
  await mockDelay(300);
  return [...MOCK_ASISTENCIA_SOFIA];
}

export async function getJustificaciones(hijoId: string): Promise<JustificacionInasistencia[]> {
  await mockDelay(250);
  return MOCK_JUSTIFICACIONES.filter(j => j.hijoId === hijoId);
}

export async function enviarJustificacion(data: {
  hijoId: string;
  fechaInasistencia: string;
  motivo: JustificacionInasistencia['motivo'];
  descripcion: string;
  archivoNombre?: string;
}): Promise<JustificacionInasistencia> {
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
  // Se muta temporalmente el array del mock, aceptable en modo local-only
  MOCK_JUSTIFICACIONES.unshift(nueva);
  return nueva;
}

export async function getAlertasAsistencia(hijoId?: string): Promise<AlertaAsistencia[]> {
  await mockDelay(200);
  if (hijoId) {
    return MOCK_ALERTAS_ASISTENCIA.filter(a => a.hijoId === hijoId);
  }
  return [...MOCK_ALERTAS_ASISTENCIA];
}

export async function getIncidenciasAsistencia(hijoId?: string): Promise<IncidenciaAsistencia[]> {
  await mockDelay(200);
  if (hijoId) {
    return MOCK_INCIDENCIAS_ASISTENCIA.filter(i => i.hijoId === hijoId);
  }
  return [...MOCK_INCIDENCIAS_ASISTENCIA];
}

export async function resolverAlerta(alertaId: string): Promise<boolean> {
  await mockDelay(250);
  const alerta = MOCK_ALERTAS_ASISTENCIA.find(a => a.id === alertaId);
  if (alerta) alerta.estado = 'Regularizada';
  return true;
}

export async function getHorario(hijoId: string): Promise<HorarioSemanaPadre[]> {
  await mockDelay(250);
  return [...MOCK_HORARIO_SOFIA];
}

export async function getComunicados(hijoId?: string): Promise<ComunicadoPadre[]> {
  await mockDelay(300);
  return [...MOCK_COMUNICADOS];
}

export async function marcarComunicadoLeido(comunicadoId: string): Promise<boolean> {
  await mockDelay(150);
  const comm = MOCK_COMUNICADOS.find(c => c.id === comunicadoId);
  if (comm) comm.leido = true;
  return true;
}

export async function firmarComunicado(comunicadoId: string, nombreFirma: string): Promise<boolean> {
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

export async function getPagos(hijoId?: string): Promise<CuotaPension[]> {
  await mockDelay(300);
  if (hijoId) {
    return MOCK_PAGOS.filter(p => p.hijoId === hijoId);
  }
  return [...MOCK_PAGOS];
}

export async function registrarPago(data: {
  pagoId: string;
  metodoPago: CuotaPension['metodoPago'];
  numeroOperacion: string;
  comprobanteNombre?: string;
}): Promise<boolean> {
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

export async function getChatContactos(): Promise<ContactoChat[]> {
  await mockDelay(250);
  return [...MOCK_CHAT_CONTACTOS_PADRE];
}

export async function enviarMensajeChat(contactoId: string, texto: string): Promise<boolean> {
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

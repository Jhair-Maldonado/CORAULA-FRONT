// src/types/padre.ts

export type NivelEducativo = 'Inicial' | 'Primaria' | 'Secundaria';

export type EstadoEstudiante = 'Activo' | 'Inactivo' | 'Suspendido';

export type EstadoAsistencia = 'Presente' | 'Tardanza' | 'Falta Justificada' | 'Falta Injustificada';

export type EstadoPension = 'Al Día' | 'Pagado' | 'Pendiente' | 'Vencido';

export type EstadoCuota = 'Pagado' | 'Pendiente' | 'Vencido';

export type TipoComunicado = 'Urgente' | 'Académico' | 'Evento' | 'Administrativo';


export type MotivoJustificacion = 
  | 'Salud / Médico'
  | 'Familiar'
  | 'Viaje'
  | 'Fuerza Mayor'
  | 'Otro';

export type EstadoJustificacion = 'Pendiente' | 'Aprobada' | 'Rechazada';

export type MetodoPago = 'Transferencia' | 'Yape' | 'Plin' | 'Tarjeta' | 'Ventanilla';

export interface PadrePerfil {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  parentesco: 'Padre' | 'Madre' | 'Apoderado' | 'Tutor Legal';
  direccion?: string;
  ocupacion?: string;
  hijos: HijoResumen[];
}

export interface HijoResumen {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  dni: string;
  codigoEstudiante: string;
  grado: string; // Ej: "4° Grado"
  nivel: NivelEducativo;
  seccion: string; // Ej: "A"
  seccionId: string;
  fotoUrl?: string;
  tutor: string;
  tutorEmail?: string;
  tutorTelefono?: string;
  estado: EstadoEstudiante;
  promedioGeneral: number;
  porcentajeAsistencia: number;
  estadoPension: EstadoPension;
  avisosPendientes: number;
  incidenciasCount?: number; // Cary.pen: "0 Incidencias", "1 Incidencia", "3 Incidencias"
  // Detalle adicional
  fechaNacimiento?: string;
  tipoSangre?: string;
  alergias?: string;
  seguroMedico?: string;
}

export type TipoAlertaAsistencia = 
  | 'Inasistencia >15 min' 
  | 'Tardanza sin justificar'
  | 'No registrado en puerta';

export interface AlertaAsistencia {
  id: string;
  hijoId: string;
  hijoNombre: string;
  fecha: string;
  horaInicioClase: string;
  horaLimiteIngreso: string; // 15 minutos de tolerancia
  minutosRetraso: number; // Ej. 22 minutos
  materia: string;
  salon: string;
  docente: string;
  estado: 'Activa' | 'Justificada' | 'Regularizada';
  tipo: TipoAlertaAsistencia;
  mensaje: string;
  notificadoPor: string;
  fechaNotificacion: string;
}

export interface IncidenciaAsistencia {
  id: string;
  hijoId: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  gravedad: 'Leve' | 'Moderada' | 'Grave';
  estado: 'Pendiente' | 'Resuelta';
}


export interface CriterioEvaluacion {
  nombre: string;
  nota: number;
  nivelLogro: 'AD' | 'A' | 'B' | 'C';
  comentario?: string;
}

export interface EvaluacionParcial {
  id: string;
  titulo: string;
  tipo: 'Tarea' | 'Práctica' | 'Examen' | 'Proyecto';
  nota: number;
  fecha: string;
  peso: number;
}

export interface CursoCalificacion {
  cursoId: string;
  cursoNombre: string;
  codigoCurso: string;
  docente: string;
  area: string;
  bimestre1: number;
  bimestre2?: number;
  bimestre3?: number;
  bimestre4?: number;
  promedioActual: number;
  nivelLogro: 'AD' | 'A' | 'B' | 'C';
  estado: 'Destacado' | 'Logrado' | 'En Proceso' | 'En Riesgo';
  criterios: CriterioEvaluacion[];
  evaluaciones: EvaluacionParcial[];
  observacionDocente?: string;
}

export interface RegistroAsistenciaDia {
  id: string;
  fecha: string; // YYYY-MM-DD
  diaSemana: string; // "Lunes", "Martes", etc.
  estado: EstadoAsistencia;
  horaLlegada?: string;
  observacion?: string;
  justificacionId?: string;
}

export interface JustificacionInasistencia {
  id: string;
  hijoId: string;
  hijoNombre: string;
  fechaInasistencia: string;
  motivo: MotivoJustificacion;
  descripcion: string;
  archivoAdjuntoNombre?: string;
  archivoUrl?: string;
  fechaEnvio: string;
  estado: EstadoJustificacion;
  respuestaTutor?: string;
  fechaRespuesta?: string;
}

export interface BloqueHorarioDia {
  id: string;
  horaInicio: string; // "08:00"
  horaFin: string; // "09:30"
  curso: string;
  docente: string;
  salon: string;
  colorClase: string;
}

export interface HorarioSemanaPadre {
  dia: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
  diaNumero: number;
  bloques: BloqueHorarioDia[];
}

export interface AdjuntoComunicado {
  nombre: string;
  tamanio: string;
  url?: string;
}

export interface ComunicadoPadre {
  id: string;
  titulo: string;
  resumen: string;
  contenido: string;
  tipo: TipoComunicado;
  fecha: string;
  emisor: string;
  emisorCargo: string;
  leido: boolean;
  requiereFirma: boolean;
  firmado?: boolean;
  firmaFecha?: string;
  firmaNombre?: string;
  adjuntos?: AdjuntoComunicado[];
}

export interface CuotaPension {
  id: string;
  hijoId: string;
  concepto: string; // "Matrícula 2026", "Cuota 1 - Marzo"
  mes?: string;
  monto: number;
  mora: number;
  total: number;
  fechaVencimiento: string;
  estado: EstadoPension;
  fechaPago?: string;
  metodoPago?: MetodoPago;
  numeroOperacion?: string;
  comprobanteUrl?: string;
}

export interface ResumenDashboardPadre {
  hijo: HijoResumen;
  asistenciaHoy: {
    estado: EstadoAsistencia | 'Pendiente';
    horaIngreso?: string;
  };
  proximasEvaluaciones: {
    id: string;
    curso: string;
    titulo: string;
    fecha: string;
    tipo: 'Examen' | 'Práctica' | 'Entrega';
  }[];
  ultimasNotas: {
    curso: string;
    evaluacion: string;
    nota: number;
    fecha: string;
  }[];
  comunicadosUrgentes: ComunicadoPadre[];
  estadoPension: {
    alDia: boolean;
    proximaCuota: string;
    monto: number;
    vencimiento: string;
  };
}

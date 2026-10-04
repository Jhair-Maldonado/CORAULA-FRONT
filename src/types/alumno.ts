// src/types/alumno.ts

export type EstadoAsistenciaAlumno = 'Puntual' | 'Tardanza' | 'Justificada' | 'Inasistencia';

export type EstadoCalificacion = 'Aprobado' | 'Desaprobado';

export interface AlumnoPerfil {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  dni: string;
  codigoEstudiante: string;
  grado: string; // Ej: "5to de Secundaria"
  seccion: string; // Ej: "B"
  aula: string; // Ej: "Aula 204 (Pabellón B)"
  nivel: 'Primaria' | 'Secundaria';
  anioLectivo: string; // Ej: "2026"
  fotoUrl?: string;
  promedioPonderado: number;
  porcentajeAsistencia: number;
  estadoMatricula: 'Matrícula Activa' | 'Suspendido' | 'Retirado';
}

export interface CursoCalificacionAlumno {
  id: string;
  curso: string;
  docenteTitular: string;
  examenes: number;
  tareas: number;
  participacion: number;
  promedio: number;
  notaFinal: number;
  estado: EstadoCalificacion;
}

export interface TendenciaProgresoItem {
  periodo: string; // Ej: "S1", "S2", ...
  nota: number;
  esActual?: boolean;
}

export interface CalificacionesAlumnoData {
  periodoActual: string; // Ej: "Semestre 1"
  fechaCorte: string; // Ej: "08 de septiembre"
  promedioGeneral: number;
  comparativaPeriodo: string; // Ej: "+0.8 vs. Semestre 0"
  tendenciaProgreso: TendenciaProgresoItem[];
  cursos: CursoCalificacionAlumno[];
}

export interface RegistroAsistenciaAlumno {
  id: string;
  fecha: string; // Ej: "Lun 08/09"
  hora: string; // Ej: "07:48 AM"
  metodo: string; // Ej: "Huella Biométrica" | "Supervisor Manual"
  estado: EstadoAsistenciaAlumno;
  observacion: string;
}

export interface ResumenAsistenciaAlumno {
  mesActual: string;
  porcentajeAsistencia: number;
  diasLectivos: number;
  asistenciasPuntuales: number;
  tardanzasRegistradas: number;
  faltasJustificadas: number;
  marcaciones: RegistroAsistenciaAlumno[];
}

export interface BloqueHorarioAlumno {
  id: string;
  horaInicio: string;
  horaFin: string;
  rangoHora: string; // Ej: "08:00 - 09:30"
  lunes: string;
  martes: string;
  miercoles: string;
  jueves: string;
  viernes: string;
  esReceso?: boolean;
}

export interface ProximaClaseAlumno {
  curso: string;
  docente: string;
  horario: string;
  aula: string;
  materialesRequeridos: string[];
}

export interface HorarioAlumnoData {
  semanaLectiva: string; // Ej: "08 - 12 de Septiembre"
  periodo: string; // Ej: "Segundo Semestre"
  turno: string; // Ej: "Turno Mañana (08:00 - 14:00)"
  aula: string; // Ej: "Aula 204 (Pabellón B)"
  proximaClase: ProximaClaseAlumno;
  bloques: BloqueHorarioAlumno[];
}

export interface MaterialEstudioAlumno {
  id: string;
  titulo: string;
  curso: string;
  docente: string;
  fecha: string; // Ej: "06/09/2026"
  formato: 'PDF' | 'PPTX' | 'ZIP' | 'DOCX';
  tamanio: string; // Ej: "2.4 MB"
  urlDescarga?: string;
}

export interface MaterialesAlumnoData {
  totalMateriales: number;
  espacioUsadoMb: number;
  espacioTotalMb: number;
  materiales: MaterialEstudioAlumno[];
}

export interface MensajeChatAlumno {
  id: string;
  emisorId: string;
  receptorId: string;
  contenido: string;
  hora: string;
  esPropio: boolean;
}

export interface ContactoDocenteAlumno {
  id: string;
  nombre: string;
  curso: string;
  esTutor: boolean;
  estado: 'En línea' | 'Desconectado';
  ubicacion: string; // Ej: "Aula 204 Pabellón B"
  ultimoMensaje: string;
  horaUltimoMensaje: string;
  mensajesNoLeidos: number;
  mensajes: MensajeChatAlumno[];
}

export interface ProximaActividadAlumno {
  id: string;
  titulo: string;
  curso: string;
  docente: string;
  fechaLimite: string; // Ej: "HOY · 23:59 PM"
  urgente?: boolean;
}

export interface ResumenDashboardAlumno {
  perfil: AlumnoPerfil;
  kpis: {
    promedioPonderado: number;
    asistenciaGeneral: number;
    tareasCompletadas: number;
    tareasTotales: number;
    cursosInscritos: number;
  };
  cursos: {
    curso: string;
    docente: string;
    horasSemanales: string;
    promedio: number;
    estado: EstadoCalificacion;
  }[];
  proximasActividades: ProximaActividadAlumno[];
}

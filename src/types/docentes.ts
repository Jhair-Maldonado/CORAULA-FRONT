export interface AsignacionDocente {
  id: string;
  curso: string;
  nivelGrado: string; // ej: "4.º Primaria", "5° Secundaria"
  seccion: string;   // ej: "Sección A", "Sección B"
}

export interface Docente {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  iniciales: string;
  dni: string;
  materiaPrincipal: string;
  nivel: string; // "Primaria" | "Secundaria"
  gradoFiltro: string; // "1ro", "3ro", "5to"
  diasAsistencia: string[]; // ['Lun', 'Mié', 'Vie']
  diasTexto: string; // "Lun · Mié · Vie"
  fotoUrl?: string;
  contacto: string;
  correo: string;
  usuario: string;
  contrasenia: string;
  asistenciasPorcentaje: number;
  faltasDias: number;
  tardanzasRegistros: number;
  asignaciones: AsignacionDocente[];
}

// ==========================================
// TIPOS PARA EL PORTAL DEL DOCENTE (cary.pen)
// ==========================================

export interface CursoDocente {
  id: string;
  nombre: string;
  grado: string;
  nivel: string;
  seccion: string;
  color: string;
  alumnosCount: number;
  horarioResumen: string;
  aula?: string;
}

export interface BloqueHorarioDocente {
  id: string;
  hora: string;
  horaInicio: string;
  horaFin: string;
  curso: string;
  grado?: string;
  esActual: boolean;
  esDescanso: boolean;
  tiempoRestante?: string;
}

export interface ClaseDocente {
  id: string;
  numero: number;
  nombre: string;
  tipo: 'documento' | 'video' | 'ejercicios' | 'evaluacion';
  icono?: string;
  tieneTarea: boolean;
  descripcion?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  fecha?: string;
}

export interface SemanaCursoDocente {
  id: string;
  numero: number;
  titulo: string;
  clasesCount: number;
  clases: ClaseDocente[];
}

export interface CursoDetalleDocente {
  id: string;
  nombre: string;
  grado: string;
  seccion: string;
  color: string;
  semanas: SemanaCursoDocente[];
  totalClases: number;
  totalTareas: number;
}

export interface EstudianteAsistenciaDocente {
  id: string;
  nombre: string;
  avatar: string;
  asistenciaPorcentaje: number;
  faltasPorcentaje: number;
  incidencias: number;
  estadoHoy: 'Presente' | 'Tardanza' | 'Falta' | 'Justificada';
}

export interface AsistenciaCursoDocente {
  cursoId: string;
  cursoNombre: string;
  grado: string;
  mes: string;
  fecha: string;
  estudiantes: EstudianteAsistenciaDocente[];
}

export interface RegistroNotaEstudianteDocente {
  estudianteId: string;
  nombre: string;
  pasoEntrada: number;
  trabajoClase: number;
  ejercicios: number;
  tareas: number;
  revisionCuaderno: number;
  pasoSalida: number;
  notaFinal: number;
}

export interface NotasCursoDocente {
  cursoId: string;
  cursoNombre: string;
  grado: string;
  mes: string;
  periodo: string;
  estudiantes: RegistroNotaEstudianteDocente[];
}

export interface MensajeDocenteItem {
  id: string;
  remitente: 'docente' | 'contacto';
  texto: string;
  hora: string;
}

export interface ChatContactoDocente {
  id: string;
  nombre: string;
  tipo: 'alumno' | 'padre';
  subtitulo: string;
  avatar: string;
  ultimoMensaje: string;
  hora: string;
  noLeidos: number;
  enLinea: boolean;
  mensajes: MensajeDocenteItem[];
}

export interface DocenteDashboardData {
  docenteNombre: string;
  materia: string;
  cursos: CursoDocente[];
  horarioHoy: BloqueHorarioDocente[];
  claseEnCurso?: BloqueHorarioDocente;
}


export interface IPersonaExcel {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
}

export interface IEstudianteExcel {
  codigo_estudiante?: string;
  estado: string; 
}

export interface IApoderadoExcel {
  estado: boolean;
}

export interface IEstudianteApoderadoExcel {
  relacion: string;
  es_principal: boolean;
  autorizado_recoger: boolean;
  activo: boolean;
}

export interface IMatriculaExcel {
  fecha_matricula: string;
  estado: string;
  fecha_retiro?: string;
  motivo_retiro?: string;
}

// ─────────────────────────────────────────────────────────
// 1. Interfaz para la fila del Excel (Datos "Aplanados")
// ─────────────────────────────────────────────────────────
export interface IMatriculaExcelRow {
  // Datos Estudiante (Persona 1)
  dni_estudiante: string;
  nombres_estudiante: string;
  apellidos_estudiante: string;
  telefono_estudiante?: string;
  codigo_estudiante?: string;
  estado_estudiante: string; // Ej: "ACTIVO"
  
  // Datos Apoderado (Persona 2)
  dni_apoderado: string;
  nombres_apoderado: string;
  apellidos_apoderado: string;
  telefono_apoderado?: string;
  
  // Relación Estudiante-Apoderado
  relacion: string; // Ej: "Padre", "Madre"
  es_principal: boolean | string; // Ej: "SI" o true
  autorizado_recoger: boolean | string; // Ej: "SI" o true
  
  // Referencias (para buscar los IDs en el backend)
  nombre_periodo: string; // Ej: "2026-I"
  nombre_seccion: string; // Ej: "1A Secundaria"
  
  // Datos Matrícula
  fecha_matricula: string;
  estado_matricula: string; // Ej: "MATRICULADO"
}

// ─────────────────────────────────────────────────────────
// 2. Interfaz del Payload que se envía al Backend
// ─────────────────────────────────────────────────────────
export interface IImportarMatriculaPayload {
  estudiante_persona: IPersonaExcel;
  estudiante: IEstudianteExcel;
  
  apoderado_persona: IPersonaExcel;
  apoderado: IApoderadoExcel;
  
  relacion_apoderado: IEstudianteApoderadoExcel;
  
  matricula: IMatriculaExcel;
  
  referencias: {
    periodo_academico: string;
    seccion: string;
  };
}

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

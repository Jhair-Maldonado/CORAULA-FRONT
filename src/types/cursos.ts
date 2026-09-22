export interface ArchivoSyllabus {
  nombre: string;
  tamanio: string;
  fechaSubida: string;
  tipo: 'pdf' | 'doc';
}

export interface Curso {
  id: string;
  nombre: string;
  codigo: string;
  nivel: 'Primaria' | 'Secundaria';
  area: string;
  frecuenciaSemanal: number; // Ej. 4 veces a la semana
  horasTotalesSemana: number; // Ej. 6 horas
  cantPracticasCalificadas: number; // Ej. 4 prácticas
  semanasExamenes: string[]; // Ej. ["Semana 8 (Parcial)", "Semana 16 (Final)"]
  docenteAsignado?: string;
  syllabusArchivo?: ArchivoSyllabus;
  descripcion?: string;
  temarioResumen?: string[];
}

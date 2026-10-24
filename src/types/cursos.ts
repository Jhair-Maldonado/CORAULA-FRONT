export interface Curso {
  id: string;
  nombre: string;
  codigo: string;
  nivel: 'Primaria' | 'Secundaria';
  area: string;
  horasTotalesSemana: number;
  descripcion?: string;
  active: boolean;
}

export type CourseFormValues = Omit<Curso, 'id' | 'active'>;

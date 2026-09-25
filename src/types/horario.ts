export interface BloqueHorario {
  id: string;
  diaIndex: number; // 0: Lunes, 1: Martes, ..., 5: Sábado
  horaInicioIndex: number; // Index de la hora de inicio
  duracionHoras: number; // Duración (1, 1.5, 2 horas)
  materia: string;
  docente: string;
  salon: string;
  modalidad: 'Presencial' | 'Virtual';
  colorCard: string;
  colorBadge: string;
}

export interface CursoConfig {
  materia: string;
  docentes: string[];
  colorCard: string;
  colorBadge: string;
}

export interface HorarioGradoSeccion {
  gradoId: string;
  nombreGrado: string;
  nivel: string;
  numeroGrado: number;
  seccionId: string;
  letraSeccion: string;
  nombreCompletoSeccion: string;
  cantAlumnos: number;
  capacidad: number;
  tutor: string;
  totalHorasSemana: number;
  estadoHorario?: string;
}

export const ACADEMIC_ACTIVITY_TYPES = ['TAREA', 'PRACTICA', 'EXAMEN', 'PROYECTO'] as const;
export type AcademicActivityType = typeof ACADEMIC_ACTIVITY_TYPES[number];
export type ActivityContext = { sectionCourseId: number; bimesterId: number };
export type CreateAcademicActivityRequest = {
  title: string;
  description: string | null;
  type: AcademicActivityType;
  cuentaParaPa: boolean;
};
export type UpdateAcademicActivityRequest = Partial<CreateAcademicActivityRequest>;
export type AcademicActivity = CreateAcademicActivityRequest & ActivityContext & {
  id: number;
  createdByTeacherId: number;
  status: 'PLANIFICADA';
  createdAt: string;
  updatedAt: string | null;
};

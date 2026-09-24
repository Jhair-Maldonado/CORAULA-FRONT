// src/types/index.ts

// Roles oficiales actualmente soportados por el backend
export type BackendRole = 'ADMINISTRADOR' | 'DIRECTIVO' | 'DOCENTE' | 'ESTUDIANTE' | 'APODERADO';

// NOTA: 'superadmin' es un concepto pendiente que aún no existe en el backend oficial.
// Mantenemos 'superadmin' y los roles antiguos en minúscula temporalmente 
// para no romper la UI actual.
export type UserRole = BackendRole | 'superadmin' | 'administrador' | 'docente' | 'padre' | 'alumno';

export * from './alumnos';
export * from './docentes';
export * from './horario';
export * from './cursos';
export * from './chat';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // A futuro debería ser estrictamente BackendRole
}

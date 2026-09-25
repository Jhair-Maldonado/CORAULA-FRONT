// src/types/index.ts
export type UserRole = 'superadmin' | 'administrador' | 'docente' | 'padre' | 'alumno';

export * from './alumnos';
export * from './docentes';
export * from './horario';
export * from './cursos';
export * from './chat';
export * from './padre';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}


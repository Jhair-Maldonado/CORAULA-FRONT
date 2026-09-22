// src/types/index.ts
export type UserRole = 'superadmin' | 'administrador' | 'docente' | 'padre' | 'alumno';

export * from './alumnos';
export * from './docentes';
export * from './horario';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

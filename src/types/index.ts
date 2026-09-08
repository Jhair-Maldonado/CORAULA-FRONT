// src/types/index.ts
export type UserRole = 'superadmin' | 'administrador' | 'docente' | 'padre' | 'alumno';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

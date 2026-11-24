'use client';

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { canWithSession, type Action } from '@/config/permissions';

/**
 * Indica si la sesión actual puede ejecutar una acción del catálogo (`src/config/permissions.ts`).
 * Es solo control de interfaz: el backend decide en cada petición. Falso sin sesión autenticada y vigente.
 * No consulta `isSessionPhysicallyValid()`: de eso se ocupa `AuthGuard`.
 * En vistas con `return` temprano, llamar a `useCan` antes del `return` (reglas de los hooks).
 */
export function useCan(action: Action): boolean {
  return canWithSession(useContext(AuthContext), action);
}

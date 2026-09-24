'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { GlobalLoader } from '@/components/GlobalLoader';

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Escudo protector para rutas públicas (login, security).
 * Impide que un usuario ya autenticado permanezca en los formularios de acceso.
 * Retorna null para evitar parpadeos visuales (flashes) durante la redirección.
 */
export const GuestGuard = ({ children }: GuestGuardProps) => {
  const router = useRouter();
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if (!authContext) return;

    if (authContext.status === 'authenticated' && authContext.sessionValid) {
      const role = authContext.role;
      if (role === 'ADMINISTRADOR' || role === 'DIRECTIVO') {
        router.replace('/administrador');
      } else if (role === 'DOCENTE') {
        router.replace('/docente');
      } else if (role === 'ESTUDIANTE') {
        router.replace('/alumno');
      } else if (role === 'APODERADO') {
        router.replace('/padre');
      }
    }
  }, [authContext, router]);

  if (!authContext || authContext.status === 'loading') {
    return <GlobalLoader />;
  }

  if (authContext.status === 'authenticated' && authContext.sessionValid) {
    return null;
  }

  return <>{children}</>;
};

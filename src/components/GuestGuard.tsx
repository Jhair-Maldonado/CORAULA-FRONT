'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { GlobalLoader } from '@/components/GlobalLoader';
import { CHANGE_PASSWORD_ROUTE, isPortalUserRole, isStaffRole, portalPathForRole } from '@/utils/authRoutes';

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
      if (authContext.passwordChangeRequired) {
        router.replace(CHANGE_PASSWORD_ROUTE);
      } else if (isStaffRole(role) || isPortalUserRole(role)) {
        router.replace(portalPathForRole(role));
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

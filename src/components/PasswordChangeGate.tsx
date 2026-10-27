'use client';

import React, { useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { GlobalLoader } from '@/components/GlobalLoader';
import { CHANGE_PASSWORD_ROUTE } from '@/utils/authRoutes';

/**
 * Escudo global del cambio obligatorio de contraseña.
 * Cubre también las rutas sin AuthGuard: con la obligación activa solo se renderiza /cambiar-contrasena.
 */
export const PasswordChangeGate = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const authContext = useContext(AuthContext);

  const mustChange =
    authContext?.status === 'authenticated' &&
    authContext.passwordChangeRequired === true &&
    pathname !== CHANGE_PASSWORD_ROUTE;

  useEffect(() => {
    if (mustChange) router.replace(CHANGE_PASSWORD_ROUTE);
  }, [mustChange, router]);

  if (mustChange) {
    return <GlobalLoader />;
  }

  return <>{children}</>;
};

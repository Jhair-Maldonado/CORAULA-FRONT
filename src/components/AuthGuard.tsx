'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { BackendRole } from '@/types';
import { GlobalLoader } from '@/components/GlobalLoader';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: BackendRole[];
}

/**
 * Escudo de protección para rutas privadas.
 * Se apoya en AuthContext para evaluar si el usuario cuenta con los permisos necesarios.
 * Intercepta restauraciones inválidas de caché (BFCache).
 */
export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if (authContext) {
      authContext.validateSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        if (!localStorage.getItem('token') || (authContext && !authContext.isSessionPhysicallyValid())) {
          window.location.reload();
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [authContext]);

  useEffect(() => {
    if (!authContext || authContext.status === 'loading') return;

    if (authContext.status === 'unauthenticated' || !authContext.sessionValid || !authContext.isSessionPhysicallyValid()) {
      if (pathname.startsWith('/administrador') || pathname.startsWith('/docente')) {
        router.replace('/security');
      } else {
        router.replace('/login');
      }
      return;
    }

    if (authContext.status === 'authenticated') {
      const userRole = authContext.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        if (userRole === 'ADMINISTRADOR' || userRole === 'DIRECTIVO') {
          router.replace('/administrador');
        } else if (userRole === 'DOCENTE') {
          router.replace('/docente');
        } else if (userRole === 'ESTUDIANTE') {
          router.replace('/alumno');
        } else if (userRole === 'APODERADO') {
          router.replace('/padre');
        } else {
          router.replace('/login');
        }
      }
    }
  }, [authContext, pathname, router, allowedRoles]);

  if (!authContext || authContext.status === 'loading') {
    return <GlobalLoader />;
  }

  if (
    authContext.status !== 'authenticated' || 
    !authContext.sessionValid ||
    !authContext.token ||
    !authContext.role ||
    !authContext.isSessionPhysicallyValid() ||
    !allowedRoles.includes(authContext.role)
  ) {
    return null;
  }

  return <>{children}</>;
};

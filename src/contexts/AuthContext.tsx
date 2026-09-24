'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { BackendRole } from '@/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  token: string | null;
  role: BackendRole | null;
  status: AuthStatus;
  sessionValid: boolean;
  login: (token: string, role: BackendRole) => void;
  logout: () => void;
  validateSession: () => void;
  isSessionPhysicallyValid: () => boolean;
}

/**
 * Contexto global de autenticación.
 * Única fuente de verdad para el estado de sesión (token y rol).
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface JwtPayloadWithExp {
  exp?: number;
}

const ALLOWED_ROLES: BackendRole[] = ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE', 'ESTUDIANTE', 'APODERADO'];

/**
 * Proveedor de autenticación que envuelve la aplicación en el RootLayout.
 * Gestiona el ciclo de vida del JWT, sincronización de pestañas (multi-tab) y auto-expiración.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<BackendRole | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean>(false);

  const invalidateSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
    setSessionValid(false);
    setStatus('unauthenticated');
  }, []);

  /**
   * Lee el token físico del disco (localStorage) e hidrata el estado de React.
   * Expulsa la sesión si el JWT está manipulado o expirado.
   */
  const validateSession = useCallback(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role') as BackendRole | null;

    if (!storedToken || !storedRole || !ALLOWED_ROLES.includes(storedRole)) {
      invalidateSession();
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayloadWithExp>(storedToken);
      const isExpired = decoded.exp ? decoded.exp * 1000 <= Date.now() : true;
      
      if (isExpired) {
        invalidateSession();
      } else {
        setToken(storedToken);
        setRole(storedRole);
        setSessionValid(true);
        setStatus('authenticated');
      }
    } catch (error) {
      invalidateSession();
    }
  }, [invalidateSession]);

  useEffect(() => {
    const initializeSession = async () => {
      await Promise.resolve();
      validateSession();
    };
    initializeSession();
  }, [validateSession]);

  useEffect(() => {
    if (status === 'authenticated' && token) {
      try {
        const decoded = jwtDecode<JwtPayloadWithExp>(token);
        if (decoded.exp) {
          const timeToExpiry = (decoded.exp * 1000) - Date.now();
          if (timeToExpiry > 0) {
            const timeoutId = setTimeout(() => {
              invalidateSession();
            }, timeToExpiry);
            return () => clearTimeout(timeoutId);
          } else {
            setTimeout(() => invalidateSession(), 0);
          }
        }
      } catch (e) {
        // Ignorar fallos de decodificación, se manejan en validateSession
      }
    }
  }, [status, token, invalidateSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      invalidateSession();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'role') {
        validateSession();
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [invalidateSession, validateSession]);

  /**
   * Validación en crudo y síncrona contra localStorage.
   * Utilizada por los Guards para evitar re-renderizados fantasmas tras navegar con el BFCache.
   */
  const isSessionPhysicallyValid = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    if (status !== 'authenticated' || !token || !role || !sessionValid) {
      return false;
    }

    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role') as BackendRole | null;

    if (!storedToken || !storedRole || !ALLOWED_ROLES.includes(storedRole)) {
      return false;
    }

    if (storedToken !== token || storedRole !== role) {
      return false;
    }

    try {
      const decoded = jwtDecode<JwtPayloadWithExp>(storedToken);
      const isExpired = decoded.exp ? decoded.exp * 1000 <= Date.now() : true;
      if (isExpired) return false;
      
      return true;
    } catch {
      return false;
    }
  }, [token, role, sessionValid, status]);

  /**
   * Autentica al usuario en el cliente y persiste sus credenciales.
   */
  const login = (newToken: string, newRole: BackendRole) => {
    if (!newToken || !newRole || !ALLOWED_ROLES.includes(newRole)) {
      invalidateSession();
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayloadWithExp>(newToken);
      const isExpired = decoded.exp ? decoded.exp * 1000 <= Date.now() : true;
      
      if (isExpired) {
        invalidateSession();
        return;
      }

      localStorage.setItem('token', newToken);
      localStorage.setItem('role', newRole);
      setToken(newToken);
      setRole(newRole);
      setSessionValid(true);
      setStatus('authenticated');
    } catch (error) {
      invalidateSession();
    }
  };

  /**
   * Destruye la sesión globalmente y fuerza una recarga total del árbol del cliente
   * para evitar que Router Cache o estados oxidados sobrevivan en la UI.
   */
  const logout = () => {
    invalidateSession();
    window.location.replace('/');
  };

  return (
    <AuthContext.Provider value={{ token, role, status, sessionValid, login, logout, validateSession, isSessionPhysicallyValid }}>
      {children}
    </AuthContext.Provider>
  );
};

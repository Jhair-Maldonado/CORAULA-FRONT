// src/components/alumno/AlumnoSessionContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface AlumnoSession {
  id: string;
  nombre: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  grado: string;
  seccion: string;
  codigoEstudiante: string;
  fotoUrl?: string;
}

export const DEFAULT_ALUMNO_SESSION: AlumnoSession = {
  id: 'alu-ana-torres',
  nombre: 'Ana Torres',
  nombres: 'Ana',
  apellidos: 'Torres Mendoza',
  usuario: 'atorres_2026',
  grado: '5to de Secundaria',
  seccion: 'B',
  codigoEstudiante: 'SM-2026-5B-18',
};

const STORAGE_KEY = 'coraula_alumno_session';

interface AlumnoSessionContextType {
  session: AlumnoSession | null;
  loading: boolean;
  login: (usuario: string, contrasenia: string) => Promise<boolean>;
  logout: () => void;
}

const AlumnoSessionContext = createContext<AlumnoSessionContextType | undefined>(undefined);

export const AlumnoSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AlumnoSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Leer sesión guardada en el cliente
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSession(JSON.parse(stored));
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Error leyendo sesión del alumno:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Protección de rutas
  useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === '/alumno/login';

    if (!session && !isLoginPage && pathname.startsWith('/alumno')) {
      // Si no hay sesión y está intentando acceder a una pantalla de alumno, redirigir al login
      router.replace('/alumno/login');
    } else if (session && isLoginPage) {
      // Si ya hay sesión iniciada y entra al login, redirigir al panel principal
      router.replace('/alumno');
    }
  }, [session, loading, pathname, router]);

  const login = async (usuario: string, contrasenia: string): Promise<boolean> => {
    // TODO(backend): Conectar con el endpoint real de autenticación POST /auth/alumno/login
    // const res = await fetch('/api/v1/auth/alumno/login', { method: 'POST', body: JSON.stringify({ usuario, contrasenia }) });
    if (!usuario.trim() || !contrasenia.trim()) {
      return false;
    }

    // Usar datos mock por ahora (con nombre "Ana Torres" según requerimiento)
    const newSession: AlumnoSession = {
      ...DEFAULT_ALUMNO_SESSION,
      usuario: usuario.trim(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
    router.push('/alumno');
    return true;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    router.push('/alumno/login');
  };

  return (
    <AlumnoSessionContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AlumnoSessionContext.Provider>
  );
};

export const useAlumnoSession = (): AlumnoSessionContextType => {
  const context = useContext(AlumnoSessionContext);
  if (!context) {
    throw new Error('useAlumnoSession debe ser usado dentro de AlumnoSessionProvider');
  }
  return context;
};

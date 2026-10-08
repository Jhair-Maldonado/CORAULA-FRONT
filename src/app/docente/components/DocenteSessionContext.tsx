// src/app/docente/components/DocenteSessionContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CursoDocente } from '@/types/docentes';
import { getCursosDocente } from '@/lib/api';

interface DocenteSessionContextType {
  docenteNombre: string;
  materia: string;
  cursos: CursoDocente[];
  cursoActivo: CursoDocente | null;
  setCursoActivo: (curso: CursoDocente | null) => void;
  isLoading: boolean;
  refreshCursos: () => Promise<void>;
}

const DocenteSessionContext = createContext<DocenteSessionContextType | undefined>(undefined);

export const DocenteSessionProvider = ({ children }: { children: ReactNode }) => {
  const [docenteNombre] = useState('Prof. Carlos Mendoza');
  const [materia] = useState('Ciencias y Matemáticas');
  const [cursos, setCursos] = useState<CursoDocente[]>([]);
  const [cursoActivo, setCursoActivo] = useState<CursoDocente | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCursos = async () => {
    try {
      setIsLoading(true);
      const data = await getCursosDocente();
      setCursos(data);
      if (data.length > 0 && !cursoActivo) {
        setCursoActivo(data[0]);
      }
    } catch (err) {
      console.error('Error al cargar cursos del docente:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  return (
    <DocenteSessionContext.Provider
      value={{
        docenteNombre,
        materia,
        cursos,
        cursoActivo,
        setCursoActivo,
        isLoading,
        refreshCursos: fetchCursos
      }}
    >
      {children}
    </DocenteSessionContext.Provider>
  );
};

export const useDocenteSession = () => {
  const context = useContext(DocenteSessionContext);
  if (!context) {
    throw new Error('useDocenteSession debe ser usado dentro de DocenteSessionProvider');
  }
  return context;
};

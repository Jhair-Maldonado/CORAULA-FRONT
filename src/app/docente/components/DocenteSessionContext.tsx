// src/app/docente/components/DocenteSessionContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { CursoDocente } from '@/types/docentes';
import { getCursosDocente } from '@/lib/api';
import { isAxiosError } from 'axios';
import { teacherProfileService } from '@/services/teacher/teacherProfileService';
import type { TeacherMeResponse } from '@/types/teacherProfileApi';

interface DocenteSessionContextType {
  teacher: TeacherMeResponse | null;
  teacherLoading: boolean;
  teacherError: string | null;
  refreshTeacher: () => void;
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
  const [teacher, setTeacher] = useState<TeacherMeResponse | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherRevision, setTeacherRevision] = useState(0);
  const pendingTeacher = useRef<Promise<TeacherMeResponse> | null>(null);
  const refreshTeacher = useCallback(() => {
    setTeacher(null);
    setTeacherError(null);
    setTeacherLoading(true);
    setTeacherRevision(n => n + 1);
  }, []);
  const docenteNombre = teacher?.fullName ?? '';
  const materia = teacher?.specialty ?? 'Sin especialidad registrada';

  useEffect(() => {
    let current = true;
    // Reuse the in-flight request when development Strict Mode repeats the effect.
    const request = pendingTeacher.current ?? teacherProfileService.getMe();
    pendingTeacher.current = request;
    request.then(profile => {
      if (!current) return;
      if (!profile.active) {
        setTeacherError('Tu cuenta docente se encuentra deshabilitada.');
      } else {
        setTeacher(profile);
      }
    }).catch(error => {
      if (!current) return;
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setTeacherError(status === 404
        ? 'La cuenta autenticada no está vinculada a un docente.'
        : status === 403 ? 'No tienes permiso para acceder al Portal Docente.'
        : status === 401 ? 'La sesión ha expirado. Vuelve a iniciar sesión.'
        : 'No se pudo cargar tu identidad docente. Intenta nuevamente.');
    }).finally(() => {
      if (pendingTeacher.current === request) pendingTeacher.current = null;
      if (current) setTeacherLoading(false);
    });
    return () => { current = false; };
  }, [teacherRevision]);
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
        teacher,
        teacherLoading,
        teacherError,
        refreshTeacher,
        docenteNombre,
        materia,
        cursos,
        cursoActivo,
        setCursoActivo,
        isLoading,
        refreshCursos: fetchCursos
      }}
    >
      {teacherLoading ? <div role="status" className="p-6 text-sm text-muted">Cargando identidad docente...</div>
        : teacherError ? <div role="alert" className="m-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
          <p>{teacherError}</p>
          <button type="button" onClick={refreshTeacher} className="mt-3 px-3 py-2 rounded-lg bg-white border border-line font-bold text-sm focus-visible:outline-2 focus-visible:outline-accent">Reintentar</button>
        </div> : teacher ? children : null}
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

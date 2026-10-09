// src/app/docente/components/DocenteSessionContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { CursoDocente } from '@/types/docentes';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';
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
  cursos: TeacherCourseSummaryResponse[];
  coursesError: string | null;
  cursoActivo: Pick<CursoDocente, 'id' | 'nombre' | 'grado'> | null;
  setCursoActivo: (curso: Pick<CursoDocente, 'id' | 'nombre' | 'grado'> | null) => void;
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
  const [courseRevision, setCourseRevision] = useState(0);
  const [courseResult, setCourseResult] = useState<{ revision: number; data?: TeacherCourseSummaryResponse[]; error?: string } | null>(null);
  const [cursoActivo, setCursoActivo] = useState<Pick<CursoDocente, 'id' | 'nombre' | 'grado'> | null>(null);
  const coursesReady = Boolean(teacher);
  const isLoading = !coursesReady || courseResult?.revision !== courseRevision;
  const cursos = isLoading ? [] : courseResult?.data ?? [];
  const coursesError = isLoading ? null : courseResult?.error ?? null;
  const pendingCourses = useRef<Promise<TeacherCourseSummaryResponse[]> | null>(null);
  const refreshCursos = useCallback(async () => {
    setCourseRevision(n => n + 1);
  }, []);

  useEffect(() => {
    if (!coursesReady) return;
    let current = true;
    const request = pendingCourses.current ?? teacherCoursesService.getCourses();
    pendingCourses.current = request;
    request.then(data => {
      if (current) setCourseResult({ revision: courseRevision, data });
    }).catch(error => {
      if (current) setCourseResult({ revision: courseRevision, error: teacherCoursesErrorMessage(error) });
    }).finally(() => {
      if (pendingCourses.current === request) pendingCourses.current = null;
    });
    return () => { current = false; };
  }, [coursesReady, courseRevision]);

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
        coursesError,
        cursoActivo,
        setCursoActivo,
        isLoading,
        refreshCursos
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

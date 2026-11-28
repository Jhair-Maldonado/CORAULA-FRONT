// src/components/alumno/StudentProfileContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isCancel } from 'axios';
import { studentProfileService } from '@/services/student/studentProfileService';
import { toStudentProfileView, type StudentProfileView } from '@/adapters/studentProfileAdapter';
import type { StudentMeResponse } from '@/types/studentProfileApi';

/** `notFound`: el backend no encontró al estudiante o no tiene matrícula (404). `error`: cualquier otro fallo. */
export type StudentProfileStatus = 'loading' | 'ready' | 'notFound' | 'error';

export interface StudentProfileContextValue {
  status: StudentProfileStatus;
  /** Respuesta cruda de `/student/me`, para las vistas del portal que necesiten el contexto del alumno; null mientras carga o si falla. */
  student: StudentMeResponse | null;
  /** Datos de presentación del encabezado; con carga, 404 o error muestran «Sin dato». */
  view: StudentProfileView;
}

const StudentProfileContext = createContext<StudentProfileContextValue | undefined>(undefined);

const httpStatusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

/**
 * Carga una sola vez el perfil del estudiante autenticado y lo comparte con todo el portal del Alumno.
 * Debe montarse dentro de `AuthGuard`, para que `/student/me` solo se pida con una sesión ESTUDIANTE válida.
 */
export const StudentProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ status: StudentProfileStatus; student: StudentMeResponse | null }>({ status: 'loading', student: null });

  useEffect(() => {
    const controller = new AbortController();
    studentProfileService.getMe(controller.signal).then(
      student => { if (!controller.signal.aborted) setState({ status: 'ready', student }); },
      (error: unknown) => {
        if (controller.signal.aborted || isCancel(error)) return;
        setState({ status: httpStatusOf(error) === 404 ? 'notFound' : 'error', student: null });
      },
    );
    return () => controller.abort();
  }, []);

  const value = useMemo<StudentProfileContextValue>(
    () => ({ ...state, view: toStudentProfileView(state.student) }),
    [state],
  );

  return <StudentProfileContext.Provider value={value}>{children}</StudentProfileContext.Provider>;
};

/** Perfil del estudiante de la sesión. Solo dentro de `StudentProfileProvider`. */
export const useStudentProfile = (): StudentProfileContextValue => {
  const context = useContext(StudentProfileContext);
  if (!context) throw new Error('useStudentProfile debe usarse dentro de StudentProfileProvider');
  return context;
};

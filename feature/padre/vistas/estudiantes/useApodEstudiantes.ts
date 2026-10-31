'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import httpClient from '@/services/httpClient';
import { VinculoEstudiante, UseApodEstudiantesResult } from './types';

export const STORAGE_KEY_SELECTED_STUDENT = 'coraula_selected_student_id';

export function useApodEstudiantes(initialStudentId?: string | number): UseApodEstudiantesResult {
  const [estudiantes, setEstudiantes] = useState<VinculoEstudiante[]>([]);
  const [selectedStudentId, setSelectedStudentIdState] = useState<string | number | null>(() => {
    if (initialStudentId) return initialStudentId;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_SELECTED_STUDENT);
      return saved ? saved : null;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Contador de peticiones para evitar condiciones de carrera (Race Condition Guard)
  const requestIdRef = useRef(0);

  const setSelectedStudentId = useCallback((id: string | number) => {
    setSelectedStudentIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SELECTED_STUDENT, String(id));
      // Notificar a otras vistas o pestañas del cambio de estudiante seleccionado
      window.dispatchEvent(
        new CustomEvent('coraula:student-changed', { detail: { studentId: String(id) } })
      );
    }
  }, []);

  const fetchEstudiantes = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const response = await httpClient.get<VinculoEstudiante[]>('/v1/guardian/students');

      // Si llegó una respuesta de una petición anterior tardía, ignorarla
      if (currentRequestId !== requestIdRef.current) return;

      const data = Array.isArray(response.data) ? response.data : [];
      setEstudiantes(data);

      if (data.length > 0) {
        // Verificar si el estudiante previamente seleccionado existe en la lista recibida
        setSelectedStudentIdState((prevId) => {
          const match = prevId ? data.find((e) => String(e.studentId) === String(prevId)) : null;
          const targetId = match ? match.studentId : data[0].studentId;

          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_SELECTED_STUDENT, String(targetId));
          }
          return targetId;
        });
      } else {
        setSelectedStudentIdState(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_SELECTED_STUDENT);
        }
      }
    } catch (err: unknown) {
      if (currentRequestId !== requestIdRef.current) return;

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const errData = err.response?.data as { message?: string; code?: string } | undefined;
        const code = errData?.code || '';

        setErrorCode(code || (status ? String(status) : null));

        if (status === 401) {
          setError('Sesión expirada o no válida. Por favor vuelva a iniciar sesión.');
        } else if (status === 403) {
          setError(
            errData?.message ||
              'Acceso denegado: Se requiere rol de Apoderado con vínculo activo para el periodo escolar vigente.'
          );
        } else {
          setError(
            errData?.message ||
              'No fue posible obtener la lista de estudiantes vinculados a su cuenta.'
          );
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al consultar los estudiantes.');
      }
      setEstudiantes([]);
      setSelectedStudentIdState(null);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchEstudiantes();
  }, [fetchEstudiantes]);

  const selectedStudent =
    estudiantes.find((e) => String(e.studentId) === String(selectedStudentId)) ||
    (estudiantes.length > 0 ? estudiantes[0] : null);

  const isEmpty = !loading && !error && estudiantes.length === 0;

  return {
    estudiantes,
    selectedStudent,
    selectedStudentId,
    setSelectedStudentId,
    loading,
    error,
    errorCode,
    isEmpty,
    refetch: fetchEstudiantes,
  };
}

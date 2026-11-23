'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { toGradeTree } from '@/adapters/vacancyAdapter';
import { academicPeriodsService } from '@/services/admin/academicPeriodsService';
import { defaultAcademicPeriod } from '@/services/admin/dailyAttendanceService';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import { vacanciesService } from '@/services/management/vacanciesService';
import type { LevelNode } from '@/types/gradeTree';

export type GradeTreeStatus = 'loading' | 'ready' | 'error' | 'forbidden' | 'no-period';

export interface GradeTreeState {
  status: GradeTreeStatus;
  /** Árbol nivel → grado → sección; vacío mientras no esté listo. */
  tree: LevelNode[];
  /** Mensaje listo para mostrar (sin texto crudo del backend), o null. */
  error: string | null;
  /** Vuelve a consultar periodo y vacantes. */
  retry: () => void;
}

type Result = { revision: number; status: Exclude<GradeTreeStatus, 'loading'>; tree: LevelNode[]; error: string | null };

const FORBIDDEN = 'No tienes permiso para consultar los grados y secciones.';
/** Mensaje propio: nunca se muestra el texto que envía el backend (vacanciesErrorMessage lo reenviaría). */
function loadErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudieron cargar los grados. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  if (error.response.status === 401) return 'La sesión ha expirado. Vuelve a iniciar sesión.';
  return 'No se pudieron cargar los grados. Intenta nuevamente.';
}
const NO_PERIOD = 'No hay un periodo académico vigente.';

/**
 * Periodo utilizable: el vigente solo si está activo; si no, el activo que empieza más tarde.
 * `defaultAcademicPeriod` devuelve el vigente aunque esté inactivo, por eso se filtran los activos antes.
 */
function usablePeriod(periods: AcademicPeriod[]): AcademicPeriod | undefined {
  return defaultAcademicPeriod(periods.filter(period => period.active));
}

/**
 * Carga el árbol de grados y secciones del periodo vigente.
 *
 * Endpoints (vía servicios):
 * - `GET /v1/management/academic-periods`: se elige el periodo vigente y activo; si no hay, el activo que empieza más tarde.
 * - `GET /v1/management/vacancies?academicPeriodId=`: vacantes del periodo elegido, que `toGradeTree` convierte en nivel → grado → sección.
 *
 * Estados: `loading` (consulta en curso), `ready` (árbol listo), `no-period` (sin periodo activo utilizable;
 * no consulta vacantes ni ofrece reintento), `forbidden` (403) y `error` (cualquier otra falla).
 *
 * Errores: 403 → `forbidden` con mensaje de acceso denegado; sin periodo → `no-period`;
 * 401, sin respuesta del servidor u otro fallo → `error` con mensaje propio (nunca el texto del backend) y `retry`.
 *
 * Las respuestas obsoletas (reintento o desmontaje durante una consulta) se descartan.
 */
export function useGradeTree(): GradeTreeState {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    let current = true;
    const done = (value: Omit<Result, 'revision'>) => { if (current) setResult({ revision, ...value }); };
    academicPeriodsService.list()
      .then(async periods => {
        const period = usablePeriod(periods);
        if (!period) return done({ status: 'no-period', tree: [], error: NO_PERIOD });
        const groups = await vacanciesService.list(period.id);
        done({ status: 'ready', tree: toGradeTree(groups, period.id), error: null });
      })
      .catch(error => {
        const forbidden = isAxiosError(error) && error.response?.status === 403;
        done({ status: forbidden ? 'forbidden' : 'error', tree: [], error: forbidden ? FORBIDDEN : loadErrorMessage(error) });
      });
    return () => { current = false; };
  }, [revision]);

  const retry = useCallback(() => setRevision(n => n + 1), []);
  if (result?.revision !== revision) return { status: 'loading', tree: [], error: null, retry };
  return { status: result.status, tree: result.tree, error: result.error, retry };
}

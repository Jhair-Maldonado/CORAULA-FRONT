'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import httpClient from '@/services/httpClient';
import {
  IncidenciaApoderado,
  IncidenciasApoderadoResponse,
  GravedadIncidencia,
  IncidenciasKpis
} from './types';

interface UseApodIncidenciasParams {
  estudianteId?: string | number | null;
  pageSize?: number;
}

interface UseApodIncidenciasResult {
  incidencias: IncidenciaApoderado[];
  kpis: IncidenciasKpis;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  filtroGravedad: GravedadIncidencia | 'TODAS';
  setFiltroGravedad: (gravedad: GravedadIncidencia | 'TODAS') => void;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
  isBackendPending: boolean;
}

export function useApodIncidencias({
  estudianteId,
  pageSize = 10,
}: UseApodIncidenciasParams): UseApodIncidenciasResult {
  const [incidencias, setIncidencias] = useState<IncidenciaApoderado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [filtroGravedad, setFiltroGravedad] = useState<GravedadIncidencia | 'TODAS'>('TODAS');
  const [isBackendPending, setIsBackendPending] = useState<boolean>(false);

  const fetchIncidencias = useCallback(async () => {
    if (!estudianteId) {
      setIncidencias([]);
      setLoading(false);
      setError(null);
      setTotalElements(0);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page,
        size: pageSize,
      };

      if (filtroGravedad !== 'TODAS') {
        params.gravedad = filtroGravedad;
      }

      // Endpoint propuesto en el contrato de integración (BACK #33 y BACK #54)
      const endpoint = `/v1/apoderado/estudiantes/${estudianteId}/incidencias`;
      const response = await httpClient.get<IncidenciasApoderadoResponse>(endpoint, { params });

      const data = response.data;
      setIncidencias(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
      setIsBackendPending(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const serverMessage = (err.response?.data as { message?: string; detalle?: string })?.message 
          || (err.response?.data as { message?: string; detalle?: string })?.detalle;

        if (status === 403) {
          // Restricción CAB Regla 12: Vínculo activo de apoderado principal
          setError(
            serverMessage ||
            'Acceso denegado: No cuenta con un vínculo activo como apoderado principal de este estudiante en el periodo escolar vigente (CAB Regla 12).'
          );
        } else if (status === 404) {
          setError(
            serverMessage ||
            'Estudiante no encontrado o no se encuentra asociado a su cuenta de apoderado.'
          );
        } else if (status === 501 || status === 502 || status === 503 || err.code === 'ERR_NETWORK') {
          // Backend en proceso de desarrollo / despliegue
          setIsBackendPending(true);
          setError(null);
          setIncidencias([]);
          setTotalElements(0);
          setTotalPages(1);
        } else {
          setError(serverMessage || 'No fue posible obtener el registro de incidencias del estudiante.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al consultar las incidencias.');
      }
    } finally {
      setLoading(false);
    }
  }, [estudianteId, page, pageSize, filtroGravedad]);

  useEffect(() => {
    fetchIncidencias();
  }, [fetchIncidencias]);

  // Cálculo de KPIs basado en las incidencias cargadas
  const kpis: IncidenciasKpis = useMemo(() => {
    return {
      total: totalElements || incidencias.length,
      leves: incidencias.filter((item) => item.gravedad === 'LEVE').length,
      moderadas: incidencias.filter((item) => item.gravedad === 'MODERADA').length,
      graves: incidencias.filter((item) => item.gravedad === 'GRAVE').length,
    };
  }, [incidencias, totalElements]);

  const isEmpty = !loading && !error && incidencias.length === 0;

  return {
    incidencias,
    kpis,
    loading,
    error,
    isEmpty,
    page,
    totalPages,
    totalElements,
    filtroGravedad,
    setFiltroGravedad: (nuevaGravedad) => {
      setFiltroGravedad(nuevaGravedad);
      setPage(0); // Reiniciar a la primera página al cambiar filtro
    },
    setPage,
    refetch: fetchIncidencias,
    isBackendPending,
  };
}

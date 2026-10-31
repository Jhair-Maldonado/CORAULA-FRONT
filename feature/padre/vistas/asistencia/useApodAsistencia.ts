'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import httpClient from '@/services/httpClient';
import {
  AttendanceResponse,
  AttendanceSummary,
  AttendanceRecord,
  AttendanceDayGroup,
  AttendanceErrorResponse
} from './types';

interface UseApodAsistenciaParams {
  studentId?: string | number | null;
  initialFrom?: string;
  initialTo?: string;
}

interface UseApodAsistenciaResult {
  from: string;
  to: string;
  setFrom: (from: string) => void;
  setTo: (to: string) => void;
  setRangoFechas: (from: string, to: string) => void;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
  diasAgrupados: AttendanceDayGroup[];
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

const MAX_RANGO_DIAS = 92;

export function calcularDiferenciaDias(fechaInicioStr: string, fechaFinStr: string): number {
  const [y1, m1, d1] = fechaInicioStr.split('-').map(Number);
  const [y2, m2, d2] = fechaFinStr.split('-').map(Number);
  const date1 = Date.UTC(y1, m1 - 1, d1);
  const date2 = Date.UTC(y2, m2 - 1, d2);
  const diffTime = date2 - date1;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function formatFechaEsp(fechaIso: string): { diaSemana: string; fechaFormateada: string } {
  try {
    const [y, m, d] = fechaIso.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    const diaSemana = new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(date);
    const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    const fechaFormateada = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);

    return { diaSemana: diaCapitalizado, fechaFormateada };
  } catch {
    return { diaSemana: '', fechaFormateada: fechaIso };
  }
}

export function useApodAsistencia({
  studentId,
  initialFrom,
  initialTo,
}: UseApodAsistenciaParams = {}): UseApodAsistenciaResult {
  // Por defecto: últimos 30 días hasta hoy
  const hoyStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const hace30DiasStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [from, setFrom] = useState<string>(initialFrom || hace30DiasStr);
  const [to, setTo] = useState<string>(initialTo || hoyStr);

  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchAsistencia = useCallback(async () => {
    if (!studentId) {
      setData(null);
      setLoading(false);
      setError(null);
      setErrorCode(null);
      return;
    }

    // 1. Validación preventiva en cliente del límite de 92 días
    if (from > to) {
      setError('La fecha de inicio debe ser anterior o igual a la fecha de fin.');
      setErrorCode('DATE_RANGE_INVALID');
      setLoading(false);
      return;
    }

    const dias = calcularDiferenciaDias(from, to);
    if (dias > MAX_RANGO_DIAS) {
      setError(`El rango seleccionado es de ${dias} días y excede el límite máximo permitido de ${MAX_RANGO_DIAS} días (3 meses).`);
      setErrorCode('DATE_RANGE_TOO_LONG');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const endpoint = `/v1/guardian/students/${studentId}/attendance`;
      const response = await httpClient.get<AttendanceResponse>(endpoint, {
        params: { from, to },
      });

      setData(response.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const errData = (err.response?.data as AttendanceErrorResponse) || {};
        const code = errData.code || '';
        const serverMessage = errData.message || errData.detalle;

        setErrorCode(code);

        if (status === 400) {
          if (code === 'DATE_RANGE_TOO_LONG') {
            setError('El rango de fechas seleccionado excede el límite máximo permitido de 92 días.');
          } else if (code === 'DATE_RANGE_INVALID') {
            setError('Rango de fechas no válido. Verifique que la fecha inicial no sea posterior a la final.');
          } else {
            setError(serverMessage || 'Parámetros de consulta no válidos.');
          }
        } else if (status === 404 || code === 'STUDENT_NOT_FOUND') {
          setError(serverMessage || 'No se encontró el estudiante especificado o no está vinculado a su cuenta.');
        } else if (status === 403) {
          setError(serverMessage || 'Acceso denegado: No cuenta con un vínculo activo en el periodo escolar vigente para consultar la asistencia de este estudiante.');
        } else if (status === 401) {
          setError('Su sesión ha caducado. Por favor vuelva a iniciar sesión.');
        } else {
          setError(serverMessage || 'No fue posible obtener el reporte de asistencia del estudiante.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al consultar la asistencia.');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, from, to]);

  useEffect(() => {
    fetchAsistencia();
  }, [fetchAsistencia]);

  // Agrupación automática de registros por fecha (ordenados de más reciente a más antiguo)
  const diasAgrupados: AttendanceDayGroup[] = useMemo(() => {
    if (!data || !data.records || data.records.length === 0) {
      return [];
    }

    const mapaDias = new Map<string, AttendanceRecord[]>();

    data.records.forEach((record) => {
      const fecha = record.fecha;
      if (!mapaDias.has(fecha)) {
        mapaDias.set(fecha, []);
      }
      mapaDias.get(fecha)!.push(record);
    });

    // Ordenar fechas en orden descendente
    const fechasOrdenadas = Array.from(mapaDias.keys()).sort((a, b) => b.localeCompare(a));

    return fechasOrdenadas.map((fecha) => {
      const sesiones = mapaDias.get(fecha)!;
      // Ordenar sesiones por horaInicio ascendente
      sesiones.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

      const { diaSemana, fechaFormateada } = formatFechaEsp(fecha);

      const presentes = sesiones.filter((s) => s.estado === 'PRESENTE').length;
      const tardanzas = sesiones.filter((s) => s.estado === 'TARDANZA').length;
      const inasistencias = sesiones.filter(
        (s) => s.estado === 'INASISTENCIA' || s.estado === 'FALTA_JUSTIFICADA' || s.estado === 'FALTA_INJUSTIFICADA'
      ).length;

      return {
        fecha,
        diaSemana,
        fechaFormateada,
        sesiones,
        totales: {
          total: sesiones.length,
          presentes,
          tardanzas,
          inasistencias,
        },
      };
    });
  }, [data]);

  const summary: AttendanceSummary = useMemo(() => {
    if (data?.summary) {
      return data.summary;
    }
    return {
      total: 0,
      presentes: 0,
      tardanzas: 0,
      inasistencias: 0,
    };
  }, [data]);

  const isEmpty = !loading && !error && (!data || !data.records || data.records.length === 0);

  const setRangoFechas = useCallback((nuevoFrom: string, nuevoTo: string) => {
    setFrom(nuevoFrom);
    setTo(nuevoTo);
  }, []);

  return {
    from,
    to,
    setFrom,
    setTo,
    setRangoFechas,
    summary,
    records: data?.records || [],
    diasAgrupados,
    loading,
    error,
    errorCode,
    isEmpty,
    refetch: fetchAsistencia,
  };
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import {
  NotificacionApoderado,
  PrioridadNotificacion,
  FiltroEstadoNotificacion,
  FiltroPrioridadNotificacion,
  NotificacionesStats
} from './types';

interface UseApodNotificacionesParams {
  apoderadoId?: string | number | null;
}

interface UseApodNotificacionesResult {
  notificaciones: NotificacionApoderado[];
  notificacionesFiltradas: NotificacionApoderado[];
  stats: NotificacionesStats;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  isBackendPending: boolean;
  filtroEstado: FiltroEstadoNotificacion;
  setFiltroEstado: (estado: FiltroEstadoNotificacion) => void;
  filtroPrioridad: FiltroPrioridadNotificacion;
  setFiltroPrioridad: (prioridad: FiltroPrioridadNotificacion) => void;
  marcarComoLeida: (id: string | number) => Promise<boolean>;
  marcarTodasComoLeidas: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

const PRIORIDAD_PESO: Record<PrioridadNotificacion, number> = {
  emergencia: 1,
  alta: 2,
  media: 3,
  baja: 4,
};

export function useApodNotificaciones({
  apoderadoId,
}: UseApodNotificacionesParams = {}): UseApodNotificacionesResult {
  const [notificaciones, setNotificaciones] = useState<NotificacionApoderado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendPending, setIsBackendPending] = useState<boolean>(false);

  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoNotificacion>('todas');
  const [filtroPrioridad, setFiltroPrioridad] = useState<FiltroPrioridadNotificacion>('todas');

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Validación de configuración de Supabase
    if (!isSupabaseConfigured()) {
      setIsBackendPending(true);
      setLoading(false);
      setNotificaciones([]);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsBackendPending(true);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('notificaciones_apoderado')
        .select('*');

      if (apoderadoId) {
        query = query.eq('apoderado_id', apoderadoId);
      }

      // Ordenamiento base por fecha descendente
      query = query.order('fecha_creacion', { ascending: false });

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw supabaseError;
      }

      const lista = (data || []) as NotificacionApoderado[];

      // Ordenar por prioridad (emergencia > alta > media > baja) y luego por fecha descendente
      const ordenadas = [...lista].sort((a, b) => {
        const pesoA = PRIORIDAD_PESO[a.prioridad] ?? 5;
        const pesoB = PRIORIDAD_PESO[b.prioridad] ?? 5;

        if (pesoA !== pesoB) {
          return pesoA - pesoB;
        }

        return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
      });

      setNotificaciones(ordenadas);
      setIsBackendPending(false);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al consultar las notificaciones en Supabase';
      setError(mensaje);
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  }, [apoderadoId]);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // Mutación: Marcar notificación individual como leída
  const marcarComoLeida = useCallback(
    async (id: string | number): Promise<boolean> => {
      // Actualización optimista en el estado local
      setNotificaciones((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, leido: true, fecha_lectura: new Date().toISOString() } : item
        )
      );

      const supabase = getSupabaseClient();
      if (!supabase) {
        return true;
      }

      try {
        const { error: updateError } = await supabase
          .from('notificaciones_apoderado')
          .update({
            leido: true,
            fecha_lectura: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }
        return true;
      } catch (err) {
        console.error('Error al actualizar notificación en Supabase:', err);
        // En caso de fallo en el backend, recargamos el estado real
        fetchNotificaciones();
        return false;
      }
    },
    [fetchNotificaciones]
  );

  // Mutación: Marcar todas las notificaciones como leídas
  const marcarTodasComoLeidas = useCallback(async (): Promise<boolean> => {
    setNotificaciones((prev) =>
      prev.map((item) => ({ ...item, leido: true, fecha_lectura: new Date().toISOString() }))
    );

    const supabase = getSupabaseClient();
    if (!supabase) {
      return true;
    }

    try {
      let query = supabase
        .from('notificaciones_apoderado')
        .update({
          leido: true,
          fecha_lectura: new Date().toISOString(),
        })
        .eq('leido', false);

      if (apoderadoId) {
        query = query.eq('apoderado_id', apoderadoId);
      }

      const { error: updateError } = await query;

      if (updateError) {
        throw updateError;
      }
      return true;
    } catch (err) {
      console.error('Error al marcar todas las notificaciones como leídas:', err);
      fetchNotificaciones();
      return false;
    }
  }, [apoderadoId, fetchNotificaciones]);

  // Conteo fiel de no leídas
  const unreadCount = useMemo(() => {
    return notificaciones.filter((n) => !n.leido).length;
  }, [notificaciones]);

  // Estadísticas generales
  const stats: NotificacionesStats = useMemo(() => {
    return {
      total: notificaciones.length,
      unreadCount,
      emergencias: notificaciones.filter((n) => n.prioridad === 'emergencia').length,
      altas: notificaciones.filter((n) => n.prioridad === 'alta').length,
    };
  }, [notificaciones, unreadCount]);

  // Filtrado reactivo en memoria
  const notificacionesFiltradas = useMemo(() => {
    return notificaciones.filter((n) => {
      // Filtro por estado
      if (filtroEstado === 'no_leidas' && n.leido) return false;
      if (filtroEstado === 'leidas' && !n.leido) return false;

      // Filtro por prioridad
      if (filtroPrioridad !== 'todas' && n.prioridad !== filtroPrioridad) return false;

      return true;
    });
  }, [notificaciones, filtroEstado, filtroPrioridad]);

  const isEmpty = !loading && !error && !isBackendPending && notificacionesFiltradas.length === 0;

  return {
    notificaciones,
    notificacionesFiltradas,
    stats,
    unreadCount,
    loading,
    error,
    isEmpty,
    isBackendPending,
    filtroEstado,
    setFiltroEstado,
    filtroPrioridad,
    setFiltroPrioridad,
    marcarComoLeida,
    marcarTodasComoLeidas,
    refetch: fetchNotificaciones,
  };
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../notificaciones/supabaseClient';
import {
  JustificacionRegistro,
  NuevaJustificacionInput,
  JustificacionesStats
} from './types';

interface UseApodJustificacionesParams {
  estudianteId?: string | number | null;
  apoderadoId?: string | number | null;
}

interface UseApodJustificacionesResult {
  justificaciones: JustificacionRegistro[];
  stats: JustificacionesStats;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  submitSuccess: boolean;
  isEmpty: boolean;
  isBackendPending: boolean;
  enviarJustificacion: (data: NuevaJustificacionInput) => Promise<{ ok: boolean; error?: string }>;
  refetch: () => Promise<void>;
  resetSubmitStatus: () => void;
}

const BUCKET_NAME = 'justificaciones';

export function useApodJustificaciones({
  estudianteId,
  apoderadoId,
}: UseApodJustificacionesParams = {}): UseApodJustificacionesResult {
  const [justificaciones, setJustificaciones] = useState<JustificacionRegistro[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [isBackendPending, setIsBackendPending] = useState<boolean>(false);

  // Consulta del historial de justificaciones filtrado por estudiante
  const fetchJustificaciones = useCallback(async () => {
    if (!estudianteId) {
      setJustificaciones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setIsBackendPending(true);
      setLoading(false);
      setJustificaciones([]);
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
        .from('justificaciones')
        .select('*')
        .eq('estudiante_id', estudianteId)
        .order('fecha_creacion', { ascending: false });

      if (apoderadoId) {
        query = query.eq('apoderado_id', apoderadoId);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw supabaseError;
      }

      setJustificaciones((data || []) as JustificacionRegistro[]);
      setIsBackendPending(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar las justificaciones en Supabase';
      setError(msg);
      setJustificaciones([]);
    } finally {
      setLoading(false);
    }
  }, [estudianteId, apoderadoId]);

  useEffect(() => {
    fetchJustificaciones();
  }, [fetchJustificaciones]);

  // Subir archivo a Supabase Storage
  const subirArchivoStorage = useCallback(
    async (
      file: File,
      estId: string | number,
      apodId: string | number
    ): Promise<{ url: string; nombre: string } | null> => {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const sanitizado = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 50);
      const filePath = `apod_${apodId}/est_${estId}/${Date.now()}_${sanitizado}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Error al subir comprobante a Supabase Storage: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        nombre: file.name,
      };
    },
    []
  );

  // Mutación: Enviar nueva justificación
  const enviarJustificacion = useCallback(
    async (input: NuevaJustificacionInput): Promise<{ ok: boolean; error?: string }> => {
      setSubmitting(true);
      setError(null);
      setSubmitSuccess(false);

      if (!isSupabaseConfigured()) {
        setSubmitting(false);
        setIsBackendPending(true);
        return {
          ok: false,
          error: 'El backend de Supabase está en proceso de integración. No es posible registrar la solicitud en este momento.',
        };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setSubmitting(false);
        return { ok: false, error: 'No se pudo inicializar la conexión con Supabase.' };
      }

      try {
        let adjuntoUrl: string | null = null;
        let adjuntoNombre: string | null = null;

        // 1. Subida a Supabase Storage si se adjuntó archivo
        if (input.archivo) {
          const resultadoSubida = await subirArchivoStorage(
            input.archivo,
            input.estudiante_id,
            input.apoderado_id
          );
          if (resultadoSubida) {
            adjuntoUrl = resultadoSubida.url;
            adjuntoNombre = resultadoSubida.nombre;
          }
        }

        // 2. Inserción del registro en la tabla `justificaciones`
        const nuevoRegistro = {
          estudiante_id: input.estudiante_id,
          apoderado_id: input.apoderado_id,
          fecha_inasistencia: input.fecha_inasistencia,
          motivo: input.motivo,
          descripcion: input.descripcion,
          adjunto_url: adjuntoUrl,
          adjunto_nombre: adjuntoNombre,
          estado: 'PENDIENTE',
        };

        const { data, error: insertError } = await supabase
          .from('justificaciones')
          .insert([nuevoRegistro])
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Actualización optimista de la lista local
        if (data) {
          setJustificaciones((prev) => [data as JustificacionRegistro, ...prev]);
        }

        setSubmitSuccess(true);
        return { ok: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error inesperado al registrar la justificación';
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSubmitting(false);
      }
    },
    [subirArchivoStorage]
  );

  // Estadísticas del historial
  const stats: JustificacionesStats = useMemo(() => {
    return {
      total: justificaciones.length,
      pendientes: justificaciones.filter((j) => j.estado === 'PENDIENTE').length,
      aprobadas: justificaciones.filter((j) => j.estado === 'APROBADO').length,
      observadas: justificaciones.filter((j) => j.estado === 'OBSERVADO').length,
      rechazadas: justificaciones.filter((j) => j.estado === 'RECHAZADO').length,
    };
  }, [justificaciones]);

  const isEmpty = !loading && !error && !isBackendPending && justificaciones.length === 0;

  return {
    justificaciones,
    stats,
    loading,
    submitting,
    error,
    submitSuccess,
    isEmpty,
    isBackendPending,
    enviarJustificacion,
    refetch: fetchJustificaciones,
    resetSubmitStatus: () => setSubmitSuccess(false),
  };
}

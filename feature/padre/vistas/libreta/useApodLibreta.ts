'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../notificaciones/supabaseClient';
import {
  BimestreNumero,
  LibretaConDetalles,
  DetalleLibreta,
  ResumenAreaNotas
} from './types';
import { generarLibretaPdf } from './utils/pdfGenerator';

interface UseApodLibretaParams {
  estudianteId?: string | number | null;
  bimestreInicial?: BimestreNumero;
}

interface UseApodLibretaResult {
  bimestre: BimestreNumero;
  setBimestre: (b: BimestreNumero) => void;
  libreta: LibretaConDetalles | null;
  resumenPorArea: ResumenAreaNotas[];
  isPublicado: boolean;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  isBackendPending: boolean;
  descargarPdf: (estudianteNombre: string, estudianteCodigo?: string, gradoSeccion?: string) => void;
  refetch: () => Promise<void>;
}

export function useApodLibreta({
  estudianteId,
  bimestreInicial = 1,
}: UseApodLibretaParams = {}): UseApodLibretaResult {
  const [bimestre, setBimestre] = useState<BimestreNumero>(bimestreInicial);
  const [libreta, setLibreta] = useState<LibretaConDetalles | null>(null);
  const [isPublicado, setIsPublicado] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendPending, setIsBackendPending] = useState<boolean>(false);

  const fetchLibreta = useCallback(async () => {
    if (!estudianteId) {
      setLibreta(null);
      setIsPublicado(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setIsBackendPending(true);
      setLoading(false);
      setLibreta(null);
      setIsPublicado(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsBackendPending(true);
      setLoading(false);
      return;
    }

    try {
      // 1. Consultar registro de la libreta bimestral del estudiante
      const { data: libretaData, error: libretaError } = await supabase
        .from('libretas_bimestrales')
        .select('*')
        .eq('estudiante_id', estudianteId)
        .eq('bimestre', bimestre)
        .maybeSingle();

      if (libretaError) {
        throw libretaError;
      }

      // Si no existe libreta o no está publicada por Dirección
      if (!libretaData) {
        setLibreta(null);
        setIsPublicado(false);
        setIsBackendPending(false);
        return;
      }

      // Validación estricta del flag `publicado`
      if (!libretaData.publicado) {
        setLibreta(libretaData as LibretaConDetalles);
        setIsPublicado(false);
        setIsBackendPending(false);
        return;
      }

      // 2. Si está publicada, consultar los detalles de notas y criterios
      const { data: detallesData, error: detallesError } = await supabase
        .from('detalles_libreta')
        .select('*')
        .eq('libreta_id', libretaData.id)
        .order('area', { ascending: true })
        .order('orden', { ascending: true });

      if (detallesError) {
        throw detallesError;
      }

      const libretaCompleta: LibretaConDetalles = {
        ...libretaData,
        detalles: (detallesData || []) as DetalleLibreta[],
      };

      setLibreta(libretaCompleta);
      setIsPublicado(true);
      setIsBackendPending(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar las calificaciones en Supabase';
      setError(msg);
      setLibreta(null);
      setIsPublicado(false);
    } finally {
      setLoading(false);
    }
  }, [estudianteId, bimestre]);

  useEffect(() => {
    fetchLibreta();
  }, [fetchLibreta]);

  // Agrupamiento estructurado por Área -> Cursos -> Criterios
  const resumenPorArea: ResumenAreaNotas[] = useMemo(() => {
    if (!libreta || !libreta.detalles) return [];

    const areasMap = new Map<string, Map<string, DetalleLibreta[]>>();

    libreta.detalles.forEach((d) => {
      const area = d.area || 'Otras Áreas';
      const curso = d.curso || 'General';

      if (!areasMap.has(area)) {
        areasMap.set(area, new Map());
      }
      const cursosMap = areasMap.get(area)!;

      if (!cursosMap.has(curso)) {
        cursosMap.set(curso, []);
      }
      cursosMap.get(curso)!.push(d);
    });

    const resultado: ResumenAreaNotas[] = [];

    areasMap.forEach((cursosMap, areaNombre) => {
      const cursosList: ResumenAreaNotas['cursos'] = [];
      let sumaNotasArea = 0;
      let totalCriteriosArea = 0;

      cursosMap.forEach((criterios, cursoNombre) => {
        const sumaCurso = criterios.reduce((acc, c) => acc + c.nota, 0);
        const promCurso = criterios.length > 0 ? sumaCurso / criterios.length : 0;

        sumaNotasArea += sumaCurso;
        totalCriteriosArea += criterios.length;

        cursosList.push({
          nombre: cursoNombre,
          criterios: criterios.map((c) => ({
            criterio: c.criterio,
            nota: c.nota,
            nivel_logro: c.nivel_logro,
          })),
          promedioCurso: promCurso,
        });
      });

      resultado.push({
        area: areaNombre,
        cursos: cursosList,
        promedioArea: totalCriteriosArea > 0 ? sumaNotasArea / totalCriteriosArea : 0,
      });
    });

    return resultado;
  }, [libreta]);

  // Acción para descargar PDF
  const descargarPdf = useCallback(
    (estudianteNombre: string, estudianteCodigo?: string, gradoSeccion?: string) => {
      if (!libreta || !isPublicado) return;

      // Si el backend proveyó un PDF URL pre-generado, se prioriza la descarga
      if (libreta.pdf_url) {
        window.open(libreta.pdf_url, '_blank');
        return;
      }

      // Si no, se genera y descarga directamente en el cliente
      generarLibretaPdf({
        libreta,
        estudianteNombre,
        estudianteCodigo,
        gradoSeccion,
      });
    },
    [libreta, isPublicado]
  );

  const isEmpty = !loading && !error && !isBackendPending && isPublicado && (!libreta || libreta.detalles.length === 0);

  return {
    bimestre,
    setBimestre,
    libreta,
    resumenPorArea,
    isPublicado,
    loading,
    error,
    isEmpty,
    isBackendPending,
    descargarPdf,
    refetch: fetchLibreta,
  };
}

// src/components/padres/PadreContext.tsx
'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { HijoResumen, PadrePerfil } from '@/types/padre';
import { getHijos, getPadrePerfil } from '@/services/padres/padreService';
import { isMockDataEnabled } from '@/lib/mockMode';

// Selector del hijo compartido por todo el portal del apoderado. La selección vive solo en memoria, en el
// contexto del layout (nunca en localStorage ni sessionStorage), y siempre corresponde a un hijo vinculado.
interface PadreContextType {
  /** Perfil simulado: solo existe en modo demostración (no hay endpoint del perfil del apoderado). */
  padre: PadrePerfil | null;
  hijos: HijoResumen[];
  /** Hijo activo resuelto: el seleccionado si sigue vinculado; si no, el primero. null sin hijos. */
  hijoActivo: HijoResumen | null;
  /** Id del hijo activo ('' sin hijos). */
  selectedHijoId: string;
  /** Alias de hijoActivo, por compatibilidad con las vistas existentes. */
  selectedHijo: HijoResumen | null;
  /** Ignora ids que no pertenecen a la lista de hijos vinculados. */
  setSelectedHijoId: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshPadreData: () => Promise<void>;
}

const PadreContext = createContext<PadreContextType | undefined>(undefined);

export function resolverHijoActivo(hijos: HijoResumen[], seleccion: string): HijoResumen | null {
  return hijos.find(h => h.id === seleccion) ?? hijos[0] ?? null;
}

export const PadreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [padre, setPadre] = useState<PadrePerfil | null>(null);
  const [hijos, setHijos] = useState<HijoResumen[]>([]);
  const [seleccion, setSeleccion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);

  // Una sola carga al montar y en cada reintento; cambiar de hijo no vuelve a pedir la lista.
  const loadData = useCallback(async () => {
    const current = ++generation.current;
    setIsLoading(true);
    setError(null);
    try {
      const [padreData, hijosData] = await Promise.all([
        isMockDataEnabled() ? getPadrePerfil() : Promise.resolve(null),
        getHijos(),
      ]);
      if (current !== generation.current || !mounted.current) return;
      setPadre(padreData);
      setHijos(hijosData);
    } catch (err) {
      if (current !== generation.current || !mounted.current) return;
      setHijos([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los estudiantes vinculados.');
    } finally {
      if (current === generation.current && mounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadData();
    return () => { mounted.current = false; };
  }, [loadData]);

  const hijoActivo = resolverHijoActivo(hijos, seleccion);
  const setSelectedHijoId = useCallback((id: string) => {
    if (hijos.some(h => h.id === id)) setSeleccion(id);
  }, [hijos]);

  const value = useMemo<PadreContextType>(() => ({
    padre,
    hijos,
    hijoActivo,
    selectedHijoId: hijoActivo?.id ?? '',
    selectedHijo: hijoActivo,
    setSelectedHijoId,
    isLoading,
    error,
    refreshPadreData: loadData,
  }), [padre, hijos, hijoActivo, setSelectedHijoId, isLoading, error, loadData]);

  return <PadreContext.Provider value={value}>{children}</PadreContext.Provider>;
};

export const usePadre = (): PadreContextType => {
  const context = useContext(PadreContext);
  if (!context) {
    throw new Error('usePadre debe ser utilizado dentro de un PadreProvider');
  }
  return context;
};

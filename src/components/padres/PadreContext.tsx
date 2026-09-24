// src/components/padres/PadreContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HijoResumen, PadrePerfil } from '@/types/padre';
import { getHijos, getPadrePerfil } from '@/services/padres/padreService';

interface PadreContextType {
  padre: PadrePerfil | null;
  hijos: HijoResumen[];
  selectedHijoId: string;
  selectedHijo: HijoResumen | null;
  setSelectedHijoId: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshPadreData: () => Promise<void>;
}

const PadreContext = createContext<PadreContextType | undefined>(undefined);

export const PadreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [padre, setPadre] = useState<PadrePerfil | null>(null);
  const [hijos, setHijos] = useState<HijoResumen[]>([]);
  const [selectedHijoId, setSelectedHijoId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [padreData, hijosData] = await Promise.all([
        getPadrePerfil(),
        getHijos()
      ]);
      setPadre(padreData);
      setHijos(hijosData);
      if (hijosData.length > 0 && !selectedHijoId) {
        setSelectedHijoId(hijosData[0].id);
      }
    } catch (err) {
      console.error('Error cargando contexto de padre:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [selectedHijoId]);

  useEffect(() => {
    let mounted = true;
    const fetchContext = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [padreData, hijosData] = await Promise.all([
          getPadrePerfil(),
          getHijos()
        ]);
        if (!mounted) return;
        setPadre(padreData);
        setHijos(hijosData);
        if (hijosData.length > 0 && !selectedHijoId) {
          setSelectedHijoId(hijosData[0].id);
        }
      } catch (err) {
        console.error('Error cargando contexto de padre:', err);
        if (mounted) setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    
    fetchContext();
    return () => { mounted = false; };
  }, [selectedHijoId]);

  const selectedHijo = hijos.find((h) => h.id === selectedHijoId) || hijos[0] || null;

  return (
    <PadreContext.Provider
      value={{
        padre,
        hijos,
        selectedHijoId,
        selectedHijo,
        setSelectedHijoId,
        isLoading,
        error,
        refreshPadreData: loadData,
      }}
    >
      {children}
    </PadreContext.Provider>
  );
};

export const usePadre = (): PadreContextType => {
  const context = useContext(PadreContext);
  if (!context) {
    throw new Error('usePadre debe ser utilizado dentro de un PadreProvider');
  }
  return context;
};

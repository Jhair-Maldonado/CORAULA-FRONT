'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Calendar01Icon,
  Task01Icon,
  Clock01Icon,
  Folder01Icon,
  ChartHistogramIcon,
  BookOpen01Icon,
  CheckmarkBadge01Icon,
  DashboardSquare01Icon
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';
import { getDashboardResumen } from '@/services/padres/padreService';
import { ChildSelectorCards } from './component/cardFichaHijo';
import { TabCalificaciones } from './component/tabCalificaciones';
import { TabHorario } from './component/tabHorario';
import { TabAsistencia } from './component/tabAsistencia';
import { ResumenDashboardPadre } from '@/types/padre';
import { TabResumen } from './component/tabResumen';
import { ErrorState } from '@/components/ui/ErrorState';
// ─────────────────────────────────────────────────────────────
// Sub-componente: Skeleton
// ─────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 w-[240px] bg-line rounded-2xl shrink-0"></div>)}
      </div>
      <div className="h-10 w-full bg-line rounded-t-xl"></div>
      <div className="h-96 w-full bg-line rounded-b-2xl rounded-tr-2xl"></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Página Principal (Arquitectura Fichas)
// ─────────────────────────────────────────────────────────────
export default function PantallaPrincipalPadre() {
  const { selectedHijoId, hijos, setSelectedHijoId } = usePadre();
  const [resumen, setResumen] = useState<ResumenDashboardPadre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'calificaciones' | 'horario' | 'asistencia'>('resumen');

  // Auto-seleccionar el primer hijo si no hay uno seleccionado
  useEffect(() => {
    if (!selectedHijoId && hijos.length > 0) {
      setSelectedHijoId(hijos[0].id);
    }
  }, [hijos, selectedHijoId, setSelectedHijoId]);

  const cargar = useCallback(async () => {
    if (!selectedHijoId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardResumen(selectedHijoId, 'semana');
      setResumen(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la ficha del estudiante');
    } finally {
      setLoading(false);
    }
  }, [selectedHijoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!selectedHijoId && hijos.length === 0) {
    return <div className="p-8 text-center text-muted font-medium">No hay hijos registrados en tu cuenta.</div>;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      
      {/* 1. ZONA SUPERIOR: Selector de Hijos (Cards Horizontales) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Folder01Icon size={20} className="text-muted" />
          <h2 className="text-[11px] font-bold text-muted uppercase tracking-wider">Fichas Estudiantiles</h2>
        </div>
        <ChildSelectorCards />
      </section>

      {/* 2. ZONA INFERIOR: Detalle del Hijo (Sistema de Tabs estilo Subcarpetas) */}
      {loading ? (
        <div className="mt-4"><DashboardSkeleton /></div>
      ) : error ? (
        <ErrorState title="Error cargando la ficha" message={error} onRetry={cargar} />
      ) : resumen?.hijo?.[0] ? (
        <section className="mt-2">
          
          {/* Navegación de Pestañas (Folder Tabs) */}
          <div className="flex overflow-x-auto hide-scrollbar pl-4">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-6 py-3 rounded-t-2xl font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-2
                ${activeTab === 'resumen' ? 'bg-white text-ink shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] relative z-10' : 'bg-line text-muted hover:bg-slate-300'}`}
            >
              <DashboardSquare01Icon size={18} />
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('calificaciones')}
              className={`px-6 py-3 rounded-t-2xl font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-2
                ${activeTab === 'calificaciones' ? 'bg-white text-ink shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] relative z-10' : 'bg-line/80 text-muted hover:bg-slate-300'}`}
            >
              <Task01Icon size={18} />
              Calificaciones
            </button>
            <button
              onClick={() => setActiveTab('horario')}
              className={`px-6 py-3 rounded-t-2xl font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-2
                ${activeTab === 'horario' ? 'bg-white text-ink shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] relative z-10' : 'bg-line/60 text-muted hover:bg-slate-300'}`}
            >
              <Clock01Icon size={18} />
              Horario de Clases
            </button>
            <button
              onClick={() => setActiveTab('asistencia')}
              className={`px-6 py-3 rounded-t-2xl font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-2
                ${activeTab === 'asistencia' ? 'bg-white text-ink shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] relative z-10' : 'bg-neutral text-muted hover:bg-line'}`}
            >
              <Calendar01Icon size={18} />
              Asistencia
            </button>
          </div>

          {/* Contenido de la Pestaña Activa (Fondo Blanco, Borde Inferior) */}
          <div className="bg-white rounded-b-2xl rounded-tr-2xl border border-line shadow-sm p-6 min-h-[300px]">
            
            {/* === CONTENIDO: RESUMEN GENERAL === */}
            {activeTab === 'resumen' && <TabResumen resumen={resumen} />}

            {/* === CONTENIDO: CALIFICACIONES === */}
            {activeTab === 'calificaciones' && <TabCalificaciones />}

            {/* === CONTENIDO: HORARIO === */}
            {activeTab === 'horario' && <TabHorario resumen={resumen} />}

            {/* === CONTENIDO: ASISTENCIA === */}
            {activeTab === 'asistencia' && <TabAsistencia />}

          </div>
        </section>
      ) : null}
    </div>
  );
}

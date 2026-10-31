'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar01Icon,
  InformationCircleIcon,
  UserSwitchIcon,
  ReloadIcon,
  Folder01Icon,
  AlertCircleIcon,
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useApodAsistencia } from './useApodAsistencia';
import { ResumenAsistencia } from './components/ResumenAsistencia';
import { FiltroRangoFechas } from './components/FiltroRangoFechas';
import { DiaAsistenciaCard } from './components/DiaAsistenciaCard';

export function ApodAsistenciaView() {
  const { hijos, selectedHijoId, setSelectedHijoId, isLoading: isPadreLoading } = usePadre();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-seleccionar primer hijo si no hay uno seleccionado
  useEffect(() => {
    if (!selectedHijoId && hijos.length > 0) {
      setSelectedHijoId(hijos[0].id);
    }
  }, [selectedHijoId, hijos, setSelectedHijoId]);

  // Cerrar selector al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hijoActivo = hijos.find((h) => h.id === selectedHijoId) || hijos[0];

  const {
    from,
    to,
    setRangoFechas,
    summary,
    records,
    diasAgrupados,
    loading,
    error,
    errorCode,
    isEmpty,
    refetch,
  } = useApodAsistencia({
    studentId: hijoActivo?.id,
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in max-w-[1200px] mx-auto py-6 px-3 sm:px-6">
      {/* 1. Encabezado Principal y Selector de Estudiante */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Folder01Icon size={16} /> Portal del Apoderado • Seguimiento Escolar
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Control de Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
            Registro diario de sesiones y estado de justificaciones (RF-26).
          </p>
        </div>

        {/* Acciones Superiores: Selector de Hijo y Botón a Justificaciones */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Hijo */}
          {hijos.length > 1 && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <UserSwitchIcon size={16} className="text-muted" />
                <span className="max-w-[130px] sm:max-w-[170px] truncate">
                  {hijoActivo?.nombre || 'Seleccionar Estudiante'}
                </span>
                <span className="text-[10px] text-muted font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  {hijoActivo?.grado}
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-line rounded-2xl shadow-xl z-50 p-2 divide-y divide-slate-100 animate-in fade-in duration-150">
                  <div className="px-3 py-2">
                    <span className="text-[10px] font-bold uppercase text-muted tracking-wider">
                      Cambiar de Estudiante
                    </span>
                  </div>
                  <div className="py-1">
                    {hijos.map((hijo) => {
                      const isSelected = hijo.id === hijoActivo?.id;
                      return (
                        <button
                          key={hijo.id}
                          type="button"
                          onClick={() => {
                            setSelectedHijoId(hijo.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-rose-50 text-accent font-bold'
                              : 'text-ink hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <span className="truncate pr-2">{hijo.nombre}</span>
                          <span className="text-[10px] text-muted shrink-0 font-mono">
                            {hijo.grado}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón hacia Justificaciones */}
          <Link
            href="/padre/justificaciones"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs"
          >
            <AlertCircleIcon size={16} className="text-amber-700" />
            <span>Gestionar Justificaciones</span>
          </Link>

          {/* Botón Refrescar */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            title="Actualizar registros"
            className="w-9 h-9 rounded-xl border border-line bg-white flex items-center justify-center text-muted hover:text-ink hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <ReloadIcon size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Banner Informativo del Rango y Reglas de Negocio Backend */}
      <div
        role="status"
        className="mb-6 p-4 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-800 shadow-2xs flex flex-col sm:flex-row items-start gap-3.5"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <InformationCircleIcon size={18} />
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-900">
              Criterio de Auditoría Escolar
            </span>
            <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
              Límite máx: 92 días
            </span>
          </div>
          <p className="text-muted font-medium">
            Solo se listan las sesiones con registro de asistencia verificado por el docente de aula. Si su hijo tuvo una inasistencia o tardanza con motivo justificado, puede enviar o verificar la solicitud en el módulo de Justificaciones.
          </p>
        </div>
      </div>

      {/* 3. Indicador de estudiante activo si tiene solo 1 hijo */}
      {hijoActivo && (
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted bg-white border border-line rounded-xl px-3.5 py-2 w-fit shadow-2xs">
          <span className="text-[11px] font-bold text-ink">Estudiante:</span>
          <span className="font-bold text-accent">{hijoActivo.nombre}</span>
          <span className="text-[11px] text-slate-400">•</span>
          <span>{hijoActivo.grado} - {hijoActivo.seccion || 'A'}</span>
        </div>
      )}

      {/* 4. Resumen de Asistencia (KPI Cards) */}
      <ResumenAsistencia summary={summary} />

      {/* 5. Filtro de Rango de Fechas */}
      <FiltroRangoFechas
        from={from}
        to={to}
        onCambiarRango={setRangoFechas}
        disabled={loading}
      />

      {/* 6. Estados de Carga, Error, Vacío y Lista */}
      {isPadreLoading || (loading && records.length === 0) ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState
          title={
            errorCode === 'DATE_RANGE_TOO_LONG'
              ? 'Rango de fechas excedido'
              : errorCode === 'DATE_RANGE_INVALID'
              ? 'Rango de fechas no válido'
              : 'Error al consultar asistencia'
          }
          message={error}
          onRetry={refetch}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<Calendar01Icon size={24} />}
          title="Sin registros de asistencia"
          description="No se encontraron sesiones de clase con asistencia registrada en el rango de fechas seleccionado."
          actionText="Consultar últimos 30 días"
          onAction={() => {
            const hoy = new Date();
            const hace30 = new Date();
            hace30.setDate(hoy.getDate() - 30);
            setRangoFechas(
              hace30.toISOString().split('T')[0],
              hoy.toISOString().split('T')[0]
            );
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
              Historial Diario ({diasAgrupados.length} {diasAgrupados.length === 1 ? 'día con registros' : 'días con registros'})
            </h2>
            <span className="text-[11px] text-muted font-medium">
              {records.length} sesiones en total
            </span>
          </div>

          <div className="space-y-3">
            {diasAgrupados.map((dia) => (
              <DiaAsistenciaCard key={dia.fecha} dia={dia} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

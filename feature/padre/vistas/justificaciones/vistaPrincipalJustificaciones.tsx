'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  DocumentValidationIcon,
  InformationCircleIcon,
  UserSwitchIcon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  ReloadIcon,
  Folder01Icon
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useApodJustificaciones } from './useApodJustificaciones';
import { FormularioJustificacion } from './component/FormularioJustificacion';
import { JustificacionHistorialCard } from './component/JustificacionHistorialCard';
import { JustificacionesStatsBanner } from './component/JustificacionesStatsBanner';

export function ApodJustificacionesView() {
  const { hijos, selectedHijoId, setSelectedHijoId, padre, isLoading: isPadreLoading } = usePadre();
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
    justificaciones,
    stats,
    loading,
    submitting,
    error,
    isEmpty,
    isBackendPending,
    enviarJustificacion,
    refetch,
  } = useApodJustificaciones({
    estudianteId: hijoActivo?.id,
    apoderadoId: padre?.id,
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in max-w-[1200px] mx-auto py-6 px-3 sm:px-6">
      {/* 1. Banner temporal obligatorio de integración Backend / Supabase */}
      <div
        role="status"
        className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-900 shadow-xs flex flex-col sm:flex-row items-start gap-3.5"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
          <InformationCircleIcon size={20} />
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-800">
              Módulo en construcción / En espera de integración final Backend
            </span>
            <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              RF-28 | Sprint 8
            </span>
          </div>
          <p className="text-amber-950 font-medium">
            El flujo de envío de justificaciones de inasistencia y la carga de comprobantes mediante Supabase Storage (
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">
              bucket: justificaciones
            </code>
            ) se encuentran preparados y tipados. Las solicitudes se sincronizan en tiempo real con la base de datos central de Coordinación y Secretaría Escolar.
          </p>
        </div>
      </div>

      {/* 2. Encabezado Principal y Selector de Estudiante */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Folder01Icon size={16} /> Portal del Apoderado • Asistencia Escolar
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Justificación de Inasistencias
          </h1>
          <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
            Registre y realice el seguimiento formal de las ausencias escolares de{' '}
            <strong>{hijoActivo?.nombres || 'su estudiante'}</strong>.
          </p>
        </div>

        {/* Selector de Estudiante */}
        {hijos.length > 0 && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-white border border-line rounded-2xl p-2.5 px-4 shadow-2xs flex items-center gap-3 cursor-pointer hover:border-accent transition-colors w-full sm:w-auto"
            >
              <div className="w-9 h-9 rounded-full border border-line bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs overflow-hidden shrink-0">
                {hijoActivo?.fotoUrl ? (
                  <img
                    src={hijoActivo.fotoUrl}
                    alt={hijoActivo.nombres}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {hijoActivo?.nombres?.charAt(0)}
                    {hijoActivo?.apellidos?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-ink leading-tight truncate max-w-[150px]">
                  {hijoActivo?.nombres}
                </p>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                  Cambiar estudiante <UserSwitchIcon size={12} />
                </p>
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-line shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 py-1.5 border-b border-line mb-1">
                  Estudiantes a su cargo
                </p>
                {hijos.map((hijo) => {
                  const isSelected = hijo.id === selectedHijoId;
                  return (
                    <button
                      key={hijo.id}
                      type="button"
                      onClick={() => {
                        setSelectedHijoId(hijo.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-accent-soft text-accent font-bold'
                          : 'hover:bg-neutral text-ink font-medium'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0">
                        {hijo.nombres.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{hijo.nombreCompleto || hijo.nombres}</p>
                        <p className="text-[10px] text-muted">{hijo.grado} - {hijo.seccion}</p>
                      </div>
                      {isSelected && <CheckmarkCircle01Icon size={16} className="text-accent shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Indicadores de Estado de Solicitudes */}
      <JustificacionesStatsBanner stats={stats} />

      {/* 4. SECCIÓN SUPERIOR: Formulario de Nueva Justificación */}
      <section className="mb-8">
        <FormularioJustificacion
          estudianteId={hijoActivo?.id || ''}
          apoderadoId={padre?.id || 'padre-anon'}
          estudianteNombre={hijoActivo?.nombreCompleto || hijoActivo?.nombres || 'Estudiante'}
          onEnviar={enviarJustificacion}
          isSubmitting={submitting}
        />
      </section>

      {/* 5. SECCIÓN INFERIOR: Historial de Justificaciones Enviadas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-line/60">
          <div className="flex items-center gap-2">
            <DocumentValidationIcon size={18} className="text-ink" />
            <h2 className="text-base font-black text-ink uppercase tracking-wide">
              Historial de Solicitudes Enviadas
            </h2>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="p-2 rounded-xl border border-line bg-white hover:bg-neutral text-muted hover:text-ink transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Actualizar historial"
          >
            <ReloadIcon size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Estados de la sección inferior */}
        {isPadreLoading || loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : error ? (
          <ErrorState
            title="Error al consultar el historial"
            message={error}
            onRetry={refetch}
          />
        ) : isBackendPending ? (
          /* Estado informativo de backend en espera */
          <div className="bg-white rounded-2xl border border-line p-6 text-center flex flex-col items-center justify-center gap-2 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Alert02Icon size={24} />
            </div>
            <h3 className="text-sm font-bold text-ink">Historial en Espera de Migración Supabase</h3>
            <p className="text-xs text-muted max-w-md">
              El esquema para la tabla <code>justificaciones</code> y el bucket <code>justificaciones</code> están especificados. Una vez completado el despliegue se visualizarán aquí los estados de aprobación de <strong>{hijoActivo?.nombres}</strong>.
            </p>
          </div>
        ) : isEmpty ? (
          <EmptyState
            icon={<CheckmarkCircle01Icon size={28} className="text-emerald-600" />}
            title="Sin solicitudes registradas"
            description={`No se han registrado justificaciones de inasistencia para ${hijoActivo?.nombres || 'este estudiante'}. Cuando envíe una solicitud aparecerá aquí junto a la respuesta de Secretaría.`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {justificaciones.map((justificacion) => (
              <JustificacionHistorialCard
                key={justificacion.id}
                justificacion={justificacion}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ApodJustificacionesView;

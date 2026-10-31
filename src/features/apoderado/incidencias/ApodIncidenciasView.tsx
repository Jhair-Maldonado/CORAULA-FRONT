'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Alert02Icon,
  CheckmarkCircle01Icon,
  UserSwitchIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  Folder01Icon,
  ReloadIcon
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useApodIncidencias } from './useApodIncidencias';
import { IncidenciaCard } from './components/IncidenciaCard';
import { IncidenciasKpiBanner } from './components/IncidenciasKpiBanner';
import { IncidenciasFiltros } from './components/IncidenciasFiltros';

export function ApodIncidenciasView() {
  const { hijos, selectedHijoId, setSelectedHijoId, isLoading: isPadreLoading } = usePadre();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fallback si no hay hijo seleccionado y existen hijos en el contexto
  useEffect(() => {
    if (!selectedHijoId && hijos.length > 0) {
      setSelectedHijoId(hijos[0].id);
    }
  }, [selectedHijoId, hijos, setSelectedHijoId]);

  // Cerrar selector al hacer clic fuera
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
    incidencias,
    kpis,
    loading,
    error,
    isEmpty,
    page,
    totalPages,
    totalElements,
    filtroGravedad,
    setFiltroGravedad,
    setPage,
    refetch,
    isBackendPending,
  } = useApodIncidencias({
    estudianteId: hijoActivo?.id,
    pageSize: 6,
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in max-w-[1200px] mx-auto py-6 px-3 sm:px-6">
      {/* 1. Banner obligatorio de aviso de integración pendiente (BACK #33 / BACK #54) */}
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
              Módulo en construcción / En espera de integración Backend
            </span>
            <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              RF-26 | BACK #33 y BACK #54
            </span>
          </div>
          <p className="text-amber-950 font-medium">
            La interfaz de usuario del apoderado está preparada y alineada al contrato API REST propuesto (
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">
              GET /api/v1/apoderado/estudiantes/{'{estudianteId}'}/incidencias
            </code>
            ). Las consultas en tiempo real se habilitarán una vez desplegado el servicio en producción, bajo las reglas del CAB (Regla 12: vínculo activo en periodo escolar vigente).
          </p>
        </div>
      </div>

      {/* 2. Encabezado Principal y Selector de Hijo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Folder01Icon size={16} /> Portal del Apoderado • Seguimiento de Convivencia
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Incidencias Disciplinarias
          </h1>
          <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
            Registro formativo y disciplinario de {hijoActivo?.nombres || 'su estudiante'}.
          </p>
        </div>

        {/* Selector de Hijo */}
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

      {/* 3. Indicadores Rápidos (KPIs) */}
      <IncidenciasKpiBanner kpis={kpis} />

      {/* 4. Barra de Filtros */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <IncidenciasFiltros
            filtroActivo={filtroGravedad}
            onCambiarFiltro={setFiltroGravedad}
            disabled={loading}
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={loading}
          className="mb-5 p-2.5 rounded-xl border border-line bg-white hover:bg-neutral text-muted hover:text-ink transition-colors shadow-2xs"
          title="Actualizar registro"
        >
          <ReloadIcon size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 5. Estados del Componente */}
      {isPadreLoading || loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState
          title="No se pudieron cargar las incidencias"
          message={error}
          onRetry={refetch}
        />
      ) : isBackendPending ? (
        /* Caso especial: Backend aún no responde en el ambiente actual (en espera de BACK #33 y #54) */
        <div className="bg-white rounded-2xl border border-line p-8 text-center flex flex-col items-center justify-center gap-3 shadow-2xs my-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Alert02Icon size={28} />
          </div>
          <h3 className="text-base font-bold text-ink">
            Servicio de Incidencias en Proceso de Despliegue
          </h3>
          <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
            El contrato REST para el rol Apoderado ha sido especificado. En cuanto el servicio backend de los tickets BACK #33 y BACK #54 esté disponible, se mostrarán aquí los eventos disciplinarios oficiales registrados para <strong>{hijoActivo?.nombres}</strong>.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-neutral hover:bg-slate-200 text-ink text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ReloadIcon size={14} /> Reintentar conexión
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<CheckmarkCircle01Icon size={28} className="text-emerald-600" />}
          title="¡Sin incidencias registradas!"
          description={
            filtroGravedad === 'TODAS'
              ? `Felicitaciones. ${hijoActivo?.nombres || 'El estudiante'} mantiene un expediente ejemplar sin reportes disciplinarios en el periodo vigente.`
              : `No se encontraron incidencias con nivel de gravedad "${filtroGravedad}".`
          }
          actionText={filtroGravedad !== 'TODAS' ? 'Limpiar filtro' : undefined}
          onAction={filtroGravedad !== 'TODAS' ? () => setFiltroGravedad('TODAS') : undefined}
        />
      ) : (
        /* 6. Listado de Incidencias */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidencias.map((incidencia) => (
              <IncidenciaCard key={incidencia.id} incidencia={incidencia} />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-line mt-6">
              <span className="text-xs font-semibold text-muted">
                Mostrando página {page + 1} de {totalPages} ({totalElements} registros en total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-xl border border-line bg-white text-xs font-bold text-ink hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft01Icon size={14} /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-xl border border-line bg-white text-xs font-bold text-ink hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  Siguiente <ArrowRight01Icon size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

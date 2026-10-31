'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  FileDownloadIcon,
  InformationCircleIcon,
  UserSwitchIcon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  ReloadIcon,
  Folder01Icon,
  Clock01Icon
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { useApodLibreta } from './useApodLibreta';
import { BimestreSelector } from './components/BimestreSelector';
import { TablaLibreta } from './components/TablaLibreta';

export function ApodLibretaView() {
  const { hijos, selectedHijoId, setSelectedHijoId, isLoading: isPadreLoading } = usePadre();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-selección de hijo inicial
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
    refetch,
  } = useApodLibreta({
    estudianteId: hijoActivo?.id,
    bimestreInicial: 1,
  });

  const handleDescargar = () => {
    if (!hijoActivo) return;
    descargarPdf(
      hijoActivo.nombreCompleto || hijoActivo.nombres,
      hijoActivo.codigoEstudiante || 'EST-2026',
      `${hijoActivo.grado} "${hijoActivo.seccion}" - ${hijoActivo.nivel}`
    );
  };

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
              RF-26, RF-31 | Sprint 8
            </span>
          </div>
          <p className="text-amber-950 font-medium">
            La visualización de libretas bimestrales y el motor de descarga en PDF (
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">
              libretas_bimestrales / detalles_libreta
            </code>
            ) se encuentran preparados y tipados. La consulta en tiempo real respeta las reglas de publicación de Dirección Académica y resalta calificaciones menores a 11.
          </p>
        </div>
      </div>

      {/* 2. Encabezado Principal y Selector de Estudiante */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Folder01Icon size={16} /> Portal del Apoderado • Rendimiento Académico
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Libreta Bimestral de Calificaciones
          </h1>
          <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
            Reporte oficial de competencias y notas bimestrales de{' '}
            <strong>{hijoActivo?.nombres || 'su estudiante'}</strong>.
          </p>
        </div>

        {/* Acciones Superiores: Selector de Hijo y Botón Descargar */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Botón Descargar PDF (Habilitado solo si está publicado) */}
          {isPublicado && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleDescargar}
              className="flex items-center gap-2 shadow-sm"
              title="Descargar libreta en formato PDF oficial"
            >
              <FileDownloadIcon size={16} />
              <span>Descargar PDF</span>
            </Button>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-line bg-white hover:bg-neutral text-muted hover:text-ink transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Actualizar calificaciones"
          >
            <ReloadIcon size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 3. Selector de Bimestre */}
      <BimestreSelector
        bimestreSeleccionado={bimestre}
        onSeleccionarBimestre={setBimestre}
        disabled={loading}
      />

      {/* 4. Estados de la Libreta */}
      {isPadreLoading || loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <ErrorState
          title="Error al cargar la libreta"
          message={error}
          onRetry={refetch}
        />
      ) : isBackendPending ? (
        /* Caso Supabase pendiente de credenciales o migración */
        <div className="bg-white rounded-2xl border border-line p-8 text-center flex flex-col items-center justify-center gap-3 shadow-2xs my-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Alert02Icon size={28} />
          </div>
          <h3 className="text-base font-bold text-ink">
            Servicio de Calificaciones Bimestrales en Proceso de Despliegue
          </h3>
          <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
            El esquema de base de datos para <code>libretas_bimestrales</code> y <code>detalles_libreta</code> ha sido estructurado. En cuanto se complete el despliegue del Sprint 8, se visualizarán las notas oficiales auditadas de <strong>{hijoActivo?.nombres}</strong>.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-neutral hover:bg-slate-200 text-ink text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ReloadIcon size={14} /> Reintentar conexión
          </button>
        </div>
      ) : !isPublicado ? (
        /* CONDICIONAL OBLIGATORIA: Si el bimestre NO está publicado, mostrar mensaje explícito */
        <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-2xs my-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 mb-4 shadow-2xs">
            <Clock01Icon size={32} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full mb-2">
            Bimestre {bimestre} No Publicado
          </span>
          <h3 className="text-base sm:text-lg font-black text-ink mb-1.5">
            Calificaciones aún no disponibles
          </h3>
          <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
            Las calificaciones correspondientes al <strong>Bimestre {bimestre}</strong> aún no han sido publicadas oficialmente por la Coordinación Académica. Estarán disponibles para consulta y descarga una vez finalizado el proceso de consolidación y auditoría de notas docentes.
          </p>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<CheckmarkCircle01Icon size={28} className="text-emerald-600" />}
          title="Sin registros de calificaciones"
          description={`No se encontraron criterios evaluados registrados para el Bimestre ${bimestre}.`}
        />
      ) : (
        /* 5. TABLA DE LIBRETA (Cuando está publicado) */
        <div className="space-y-4">
          <TablaLibreta
            resumenPorArea={resumenPorArea}
            promedioGeneral={libreta?.promedio_general}
          />
        </div>
      )}
    </div>
  );
}

export default ApodLibretaView;

'use client';

import React from 'react';
import {
  Notification01Icon,
  InformationCircleIcon,
  Alert02Icon,
  ReloadIcon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useApodNotificaciones } from './useApodNotificaciones';
import { NotificacionCard } from './components/NotificacionCard';
import { NotificacionesFiltros } from './components/NotificacionesFiltros';

export function ApodNotificacionesView() {
  const { padre, isLoading: isPadreLoading } = usePadre();

  const {
    notificacionesFiltradas,
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
    refetch,
  } = useApodNotificaciones({
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
              RF-22, RF-27 | Sprint 8
            </span>
          </div>
          <p className="text-amber-950 font-medium">
            La bandeja de notificaciones en tiempo real está preparada y conectada al cliente de base de datos Supabase (
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">
              notificaciones_apoderado
            </code>
            ). La sincronización automática de eventos de emergencia y alertas se habilitará tras la ejecución de las migraciones en la base de datos de producción.
          </p>
        </div>
      </div>

      {/* 2. Encabezado de la Bandeja */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Notification01Icon size={16} /> Portal del Apoderado • Comunicaciones
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              Bandeja de Notificaciones
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-accent text-white shadow-2xs">
                {unreadCount} {unreadCount === 1 ? 'no leída' : 'no leídas'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
            Avisos urgentes, comunicados institucionales y alertas formativas dirigidas a{' '}
            <strong>{padre ? `${padre.nombres} ${padre.apellidos}` : 'su cuenta'}</strong>.
          </p>
        </div>

        {/* Botón de Refrescar */}
        <button
          type="button"
          onClick={() => refetch()}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-neutral text-xs font-bold text-muted hover:text-ink transition-colors shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          title="Actualizar notificaciones"
        >
          <ReloadIcon size={16} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* 3. Filtros y Acciones */}
      <NotificacionesFiltros
        filtroEstado={filtroEstado}
        onCambiarEstado={setFiltroEstado}
        filtroPrioridad={filtroPrioridad}
        onCambiarPrioridad={setFiltroPrioridad}
        unreadCount={unreadCount}
        onMarcarTodasLeidas={marcarTodasComoLeidas}
        disabled={loading}
      />

      {/* 4. Estados de la Bandeja */}
      {isPadreLoading || loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState
          title="Error al cargar las notificaciones"
          message={error}
          onRetry={refetch}
        />
      ) : isBackendPending ? (
        /* Caso especial: Supabase pendiente de migración o credenciales en el entorno */
        <div className="bg-white rounded-2xl border border-line p-8 text-center flex flex-col items-center justify-center gap-3 shadow-2xs my-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Alert02Icon size={28} />
          </div>
          <h3 className="text-base font-bold text-ink">
            Integración de Notificaciones Supabase en Espera
          </h3>
          <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
            El esquema de base de datos para la tabla <code>notificaciones_apoderado</code> ha sido propuesto para el Sprint 8. En cuanto se configure la conexión en las variables de entorno del servidor, se reflejarán aquí las notificaciones en tiempo real ordenadas por severidad.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-neutral hover:bg-slate-200 text-ink text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ReloadIcon size={14} /> Reintentar conexión
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<CheckmarkCircle01Icon size={28} className="text-emerald-600" />}
          title="Bandeja al día"
          description={
            filtroEstado === 'no_leidas'
              ? '¡Excelente! No tienes notificaciones pendientes de lectura.'
              : 'No se encontraron notificaciones con los filtros seleccionados.'
          }
          actionText={
            filtroEstado !== 'todas' || filtroPrioridad !== 'todas'
              ? 'Ver todas las notificaciones'
              : undefined
          }
          onAction={
            filtroEstado !== 'todas' || filtroPrioridad !== 'todas'
              ? () => {
                  setFiltroEstado('todas');
                  setFiltroPrioridad('todas');
                }
              : undefined
          }
        />
      ) : (
        /* 5. Listado de Notificaciones */
        <div className="space-y-3.5">
          {notificacionesFiltradas.map((notificacion) => (
            <NotificacionCard
              key={notificacion.id}
              notificacion={notificacion}
              onMarcarLeida={marcarComoLeida}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ApodNotificacionesView;

'use client';

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import {
  Alert02Icon,
  Download01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  File02Icon,
  ArrowReloadHorizontalIcon,
  LicenseIcon,
} from 'hugeicons-react';
import {
  managementAttendanceJustificationsService,
  guardianJustificationErrorMessage,
} from '@/services/admin/managementAttendanceJustificationsService';
import { ModalDetalleJustificacion } from './component/modalDetalleJustificacion';
import type {
  AttendanceJustificationsPage,
  JustificationStatus,
} from '@/types/guardianJustificationsApi';

const STATUS_BADGES: Record<JustificationStatus, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  OBSERVADA: { label: 'Observada', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  APROBADA: { label: 'Aprobada', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const FILTER_TABS: Array<{ id: JustificationStatus | 'TODAS'; label: string }> = [
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'OBSERVADA', label: 'Observadas' },
  { id: 'APROBADA', label: 'Aprobadas' },
  { id: 'RECHAZADA', label: 'Rechazadas' },
  { id: 'TODAS', label: 'Todas' },
];

export default function VistaBandejaJustificaciones() {
  const auth = useContext(AuthContext);

  if (
    auth?.status !== 'authenticated' ||
    !auth.sessionValid ||
    (auth.role !== 'ADMINISTRADOR' && auth.role !== 'DIRECTIVO')
  ) {
    return (
      <div className="p-6">
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-semibold"
        >
          No tienes acceso a la bandeja de justificaciones de asistencia.
        </p>
      </div>
    );
  }

  const canDecide = auth.role === 'DIRECTIVO';
  return <BandejaJustificacionesContent canDecide={canDecide} />;
}

function BandejaJustificacionesContent({ canDecide }: { canDecide: boolean }) {
  const [filter, setFilter] = useState<JustificationStatus | 'TODAS'>('PENDIENTE');
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<AttendanceJustificationsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJustificationId, setSelectedJustificationId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter === 'TODAS' ? null : filter;
      const result = await managementAttendanceJustificationsService.list({
        status: statusParam,
        page,
      });
      setPageData(result);
    } catch (cause) {
      setError(guardianJustificationErrorMessage(cause, 'list'));
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 p-4 sm:p-6 animate-in fade-in max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <LicenseIcon className="text-accent" size={24} />
            Bandeja de justificaciones de asistencia
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {canDecide
              ? 'Revisa y resuelve las solicitudes de inasistencias y tardanzas presentadas por los apoderados.'
              : 'Consulta las solicitudes de justificación presentadas por los apoderados (solo lectura).'}
          </p>
        </div>
      </div>

      {/* Pestañas de estado */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id);
                setPage(0);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                isActive
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-white text-muted border border-line hover:border-accent hover:text-accent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-line bg-white p-4 animate-pulse" />
          ))}
        </div>
      )}

      {/* Estado de error */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
          <Alert02Icon size={24} className="mx-auto mb-2 text-rose-600" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90"
          >
            <ArrowReloadHorizontalIcon size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && !error && (!pageData || pageData.content.length === 0) && (
        <div className="rounded-2xl border border-line bg-white p-12 text-center text-sm text-muted">
          <File02Icon size={32} className="mx-auto mb-3 text-muted/60" />
          <p className="font-semibold text-ink">
            {filter === 'TODAS'
              ? 'No hay solicitudes de justificación registradas en el sistema.'
              : `No hay solicitudes con estado «${filter}».`}
          </p>
        </div>
      )}

      {/* Listado / Tabla de solicitudes */}
      {!loading && !error && pageData && pageData.content.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-neutral/40 font-bold text-muted">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Estudiante</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Curso</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5">Adjunto</th>
                  <th className="p-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageData.content.map((j) => {
                  const badge = STATUS_BADGES[j.status];
                  return (
                    <tr key={j.id} className="hover:bg-neutral/20 transition">
                      <td className="p-3.5 font-bold text-ink">#{j.id}</td>
                      <td className="p-3.5 text-ink font-medium">Estudiante #{j.studentId}</td>
                      <td className="p-3.5 text-muted">{j.date}</td>
                      <td className="p-3.5 text-ink font-semibold">{j.courseName}</td>
                      <td className="p-3.5 uppercase font-medium text-muted">
                        {j.attendanceStatus === 'INASISTENCIA' ? 'Inasistencia' : 'Tardanza'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted">
                        {j.attachmentName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                            <File02Icon size={14} /> Con adjunto
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted/60">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedJustificationId(j.id)}
                          className="rounded-xl border border-accent bg-accent/5 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
                        >
                          {canDecide && j.status === 'PENDIENTE' ? 'Resolver' : 'Ver detalle'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pageData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-neutral disabled:opacity-50"
              >
                <ArrowLeft01Icon size={14} /> Anterior
              </button>
              <span className="text-xs text-muted">
                Página {pageData.page + 1} de {pageData.totalPages} (Total: {pageData.totalElements})
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= pageData.totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-neutral disabled:opacity-50"
              >
                Siguiente <ArrowRight01Icon size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle y Resolución */}
      {selectedJustificationId !== null && (
        <ModalDetalleJustificacion
          justificationId={selectedJustificationId}
          canDecide={canDecide}
          onClose={() => setSelectedJustificationId(null)}
          onDecisionSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}


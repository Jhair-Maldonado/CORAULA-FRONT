'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePadre } from '@/components/padres/PadreContext';
import {
  Alert02Icon,
  CheckmarkCircle01Icon,
  Download01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  File02Icon,
  ArrowReloadHorizontalIcon,
} from 'hugeicons-react';
import {
  guardianJustificationsService,
  guardianJustificationsErrorMessage,
} from '@/services/padres/guardianJustificationsService';
import { formatLimaDateTime } from '@/services/padres/guardianIncidentsService';
import { ModalFormularioJustificacion } from './component/modalFormularioJustificacion';
import type {
  AttendanceJustification,
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
  { id: 'TODAS', label: 'Todas' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'OBSERVADA', label: 'Observadas' },
  { id: 'APROBADA', label: 'Aprobadas' },
  { id: 'RECHAZADA', label: 'Rechazadas' },
];

export default function VistaPrincipalJustificacion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hijoActivo, isLoading: isPadreLoading, error: padreError, refreshPadreData } = usePadre();

  const [filter, setFilter] = useState<JustificationStatus | 'TODAS'>('TODAS');
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<AttendanceJustificationsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  // Modal para presentar justificación o subsanar observación
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'submit' | 'respond';
    attendanceId?: number;
    justificationId?: number;
    sessionInfo?: { date: string; courseName?: string; status?: string };
    observationComment?: string | null;
  } | null>(null);

  // Carga de justificaciones
  const loadJustifications = useCallback(async () => {
    if (!hijoActivo) return;
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter === 'TODAS' ? null : filter;
      const data = await guardianJustificationsService.list(String(hijoActivo.id), {
        status: statusParam,
        page,
      });
      setPageData(data);
    } catch (cause) {
      setError(guardianJustificationsErrorMessage(cause, 'list'));
    } finally {
      setLoading(false);
    }
  }, [hijoActivo, filter, page]);

  useEffect(() => {
    loadJustifications();
  }, [loadJustifications]);

  // Si la URL trae parámetros para justificar (desde Asistencia)
  useEffect(() => {
    const attendanceIdParam = searchParams.get('attendanceId');
    if (attendanceIdParam && hijoActivo) {
      const attendanceId = Number(attendanceIdParam);
      if (Number.isSafeInteger(attendanceId) && attendanceId > 0) {
        setModalState({
          isOpen: true,
          mode: 'submit',
          attendanceId,
          sessionInfo: {
            date: searchParams.get('date') ?? '',
            courseName: searchParams.get('course') ?? '',
            status: searchParams.get('status') ?? '',
          },
        });
      }
    }
  }, [searchParams, hijoActivo]);

  const handleDownloadAttachment = async (justificationId: number) => {
    if (!hijoActivo) return;
    setDownloadingId(justificationId);
    try {
      const { url } = await guardianJustificationsService.attachmentUrl(String(hijoActivo.id), justificationId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (cause) {
      alert(guardianJustificationsErrorMessage(cause, 'download'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenRespondModal = (justification: AttendanceJustification) => {
    if (!hijoActivo) return;
    setModalState({
      isOpen: true,
      mode: 'respond',
      justificationId: justification.id,
      sessionInfo: {
        date: justification.date,
        courseName: justification.courseName,
        status: justification.attendanceStatus,
      },
      observationComment: justification.reviewComment,
    });
  };

  const handleModalSuccess = () => {
    setModalState(null);
    // Limpiar query params si venían en la URL
    if (searchParams.get('attendanceId') || searchParams.get('justificationId')) {
      router.replace('/padre/justificacion');
    }
    loadJustifications();
  };

  // Estados previos de carga del apoderado
  if (isPadreLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200 mb-2" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-line bg-white p-5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (padreError) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
          <p className="font-semibold">{padreError}</p>
          <button
            onClick={() => refreshPadreData()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90"
          >
            <ArrowReloadHorizontalIcon size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!hijoActivo) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
          No tienes estudiantes vinculados a tu cuenta.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 animate-in fade-in">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Justificaciones de asistencia</h1>
          <p className="text-xs text-muted">
            Solicitudes de justificación de inasistencias y tardanzas de{' '}
            <span className="font-semibold text-ink">{hijoActivo.nombres}</span>.
          </p>
        </div>
        <Link
          href="/padre/asistencia"
          className="inline-flex items-center justify-center rounded-xl border border-accent bg-accent/5 px-4 py-2 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
        >
          Ver reporte de asistencia
        </Link>
      </div>

      {/* Aviso informativo de plazo */}
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-xs text-muted">
        <CheckmarkCircle01Icon size={18} className="shrink-0 text-accent mt-0.5" />
        <div>
          <p className="font-semibold text-ink">Plazo reglamentario de justificación</p>
          <p className="mt-0.5 text-[11px] leading-relaxed">
            Las inasistencias y tardanzas pueden justificarse dentro de los <strong>dos días hábiles</strong> posteriores a la sesión. Para iniciar una solicitud, dirígete al reporte de asistencia y haz clic en el botón «Justificar» de la clase correspondiente.
          </p>
        </div>
      </div>

      {/* Pestañas de filtro por estado */}
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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-line bg-white p-5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Estado de error */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
          <Alert02Icon size={24} className="mx-auto mb-2 text-rose-600" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={loadJustifications}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90"
          >
            <ArrowReloadHorizontalIcon size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && !error && (!pageData || pageData.content.length === 0) && (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">
          <File02Icon size={32} className="mx-auto mb-3 text-muted/60" />
          <p className="font-semibold text-ink">
            {filter === 'TODAS'
              ? `${hijoActivo.nombres} no tiene solicitudes de justificación registradas.`
              : `No se encontraron justificaciones con estado «${filter}» para ${hijoActivo.nombres}.`}
          </p>
          <p className="mt-1 text-xs text-muted">
            Si tu hijo tuvo una inasistencia o tardanza reciente, puedes justificarla desde el reporte de asistencia.
          </p>
          <Link
            href="/padre/asistencia"
            className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90"
          >
            Ir a Asistencia
          </Link>
        </div>
      )}

      {/* Listado de justificaciones */}
      {!loading && !error && pageData && pageData.content.length > 0 && (
        <div className="space-y-4">
          {pageData.content.map((item) => {
            const badge = STATUS_BADGES[item.status];
            const isObserved = item.status === 'OBSERVADA';
            const isDownloading = downloadingId === item.id;
            const isHistoryExpanded = expandedHistoryId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-xs transition hover:border-muted/60"
              >
                {/* Cabecera de la tarjeta */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">{item.date}</span>
                      <span className="text-xs font-medium text-muted">·</span>
                      <span className="text-xs font-medium text-muted">{item.courseName}</span>
                    </div>
                    <span className="mt-1 inline-block text-[11px] font-bold text-muted uppercase">
                      {item.attendanceStatus === 'INASISTENCIA' ? 'Inasistencia' : 'Tardanza'}
                    </span>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Motivo presentado */}
                <div className="mt-3 text-xs">
                  <span className="font-bold text-ink">Motivo: </span>
                  <span className="text-muted leading-relaxed whitespace-pre-wrap">{item.reason}</span>
                </div>

                {/* Comentario de revisión (Secretaría) */}
                {item.reviewComment && (
                  <div
                    className={`mt-3 rounded-xl border p-3 text-xs ${
                      isObserved
                        ? 'border-sky-200 bg-sky-50 text-sky-900'
                        : item.status === 'RECHAZADA'
                        ? 'border-rose-200 bg-rose-50 text-rose-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    <p className="font-bold mb-0.5">
                      {isObserved
                        ? 'Observación de Secretaría:'
                        : item.status === 'RECHAZADA'
                        ? 'Motivo del rechazo:'
                        : 'Comentario de revisión:'}
                    </p>
                    <p className="whitespace-pre-wrap">{item.reviewComment}</p>
                  </div>
                )}

                {/* Respuesta del apoderado si ya subsanó */}
                {item.response && (
                  <div className="mt-2 rounded-xl border border-line bg-neutral/30 p-3 text-xs text-ink">
                    <p className="font-bold text-muted mb-0.5">Tu respuesta a la observación:</p>
                    <p className="whitespace-pre-wrap">{item.response}</p>
                  </div>
                )}

                {/* Barra inferior: Adjunto y Acciones */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="flex items-center gap-2">
                    {item.attachmentName ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(item.id)}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-neutral/40 px-3 py-1.5 text-[11px] font-semibold text-ink transition hover:bg-neutral hover:border-muted disabled:opacity-50"
                        title="Descargar documento de sustento"
                      >
                        <Download01Icon size={14} className="text-accent" />
                        <span>{isDownloading ? 'Descargando...' : item.attachmentName}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted italic">Sin archivo adjunto</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botón para subsanar observación */}
                    {isObserved && (
                      <button
                        type="button"
                        onClick={() => handleOpenRespondModal(item)}
                        className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-accent/90"
                      >
                        Subsanar observación
                      </button>
                    )}

                    {/* Botón para alternar historial */}
                    {item.history.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryId(isHistoryExpanded ? null : item.id)
                        }
                        className="rounded-xl border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:text-ink hover:border-muted"
                      >
                        {isHistoryExpanded ? 'Ocultar historial' : `Historial (${item.history.length})`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Historial desplegable */}
                {isHistoryExpanded && item.history.length > 0 && (
                  <div className="mt-3 border-t border-line/60 pt-3">
                    <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                      Línea de tiempo de la solicitud
                    </p>
                    <ol className="relative border-l border-line ml-2 space-y-3 pl-3">
                      {item.history.map((change, index) => (
                        <li key={index} className="relative text-xs">
                          <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-accent" />
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">
                              {change.from ? `${change.from} → ${change.to}` : change.to}
                            </span>
                            <span className="text-[10px] text-muted">
                              {formatLimaDateTime(change.at)}
                            </span>
                          </div>
                          {change.comment && (
                            <p className="mt-0.5 text-muted text-[11px]">{change.comment}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}

          {/* Paginación */}
          {pageData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-neutral disabled:opacity-50"
              >
                <ArrowLeft01Icon size={14} /> Anterior
              </button>
              <span className="text-xs text-muted">
                Página {pageData.page + 1} de {pageData.totalPages}
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

      {/* Modal para enviar justificación o responder */}
      {modalState?.isOpen && hijoActivo && (
        <ModalFormularioJustificacion
          mode={modalState.mode}
          studentId={String(hijoActivo.id)}
          attendanceId={modalState.attendanceId}
          justificationId={modalState.justificationId}
          sessionInfo={modalState.sessionInfo}
          observationComment={modalState.observationComment}
          onClose={() => setModalState(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

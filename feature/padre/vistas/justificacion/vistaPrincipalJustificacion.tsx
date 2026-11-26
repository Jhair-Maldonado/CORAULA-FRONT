'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { monthLabel, shiftMonth, type CalendarCell, type CalendarSession } from '@/adapters/guardianAttendanceCalendarAdapter';
import { useGuardianAttendanceMonth, useGuardianAttendanceToday } from '@/hooks/useGuardianAttendanceMonth';
import { formatDayLong, limaToday } from '@/lib/limaClock';
import { ModalFormularioJustificacion } from './component/modalFormularioJustificacion';
import { CalendarioAsistencia } from './component/calendarioAsistencia';
import { EstadoHoyCard } from './component/estadoHoyCard';
import type {
  AttendanceJustification,
  AttendanceJustificationsPage,
  JustificationStatus,
} from '@/types/guardianJustificationsApi';

const STATUS_BADGES: Record<JustificationStatus, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-white text-warning-ink border-warning-ink/30' },
  OBSERVADA: { label: 'Observada', className: 'bg-neutral text-ink border-muted/40' },
  APROBADA: { label: 'Aprobada', className: 'bg-success text-success-ink border-success-ink/30' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-accent-soft text-accent border-accent/30' },
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
  const [downloadError, setDownloadError] = useState<{ id: number; message: string } | null>(null);
  const [focused, setFocused] = useState<AttendanceJustification | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  // Calendario: mes visible (empieza en el actual, hora de Lima) y día abierto en el detalle, ligado a su hijo.
  const [visible, setVisible] = useState(() => {
    const today = limaToday();
    return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  });
  const [selected, setSelected] = useState<{ hijoId: string; date: string } | null>(null);

  // Modal para presentar justificación o subsanar observación
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'submit' | 'respond';
    attendanceId?: number;
    justificationId?: number;
    sessionInfo?: { date: string; courseName?: string; status?: string };
    observationComment?: string | null;
  } | null>(null);

  const hijoId = hijoActivo ? String(hijoActivo.id) : null;
  const loadJustifications = useCallback(() => setReloadKey((k) => k + 1), []);
  const month = useGuardianAttendanceMonth(hijoId, visible.year, visible.month);
  const todayCard = useGuardianAttendanceToday(hijoId);
  const reloadMonth = month.reload;
  const reloadToday = todayCard.reload;
  const selectedDate = selected && selected.hijoId === hijoId ? selected.date : null;
  const todayDay = limaToday();
  const currentYear = Number(todayDay.slice(0, 4));
  const currentMonth = Number(todayDay.slice(5, 7));
  const canNextMonth = visible.year * 12 + visible.month < currentYear * 12 + currentMonth;

  const handleSelectDate = useCallback((date: string | null) => {
    setSelected(date && hijoId ? { hijoId, date } : null);
  }, [hijoId]);

  // «Justificar ahora» de la tarjeta de hoy: muestra el mes actual con el detalle de hoy abierto.
  const handleJustifyToday = () => {
    setVisible({ year: currentYear, month: currentMonth });
    handleSelectDate(todayDay);
  };

  // «Justificar ahora» del detalle del día: el mismo flujo del formulario que «Justificar» de Asistencia.
  const handleJustifySession = (session: CalendarSession, cell: CalendarCell) => {
    setModalState({
      isOpen: true,
      mode: 'submit',
      attendanceId: session.attendanceId,
      sessionInfo: { date: formatDayLong(cell.date), courseName: session.courseName, status: session.estadoLabel },
    });
  };

  // «Ver justificación»: el mismo mecanismo de enlace que usa Asistencia (?studentId=&justificationId=).
  const handleViewJustification = (justificationId: number) => {
    if (hijoId) router.push(`/padre/justificacion?studentId=${hijoId}&justificationId=${justificationId}`);
  };

  // Carga de justificaciones: cambiar de hijo, filtro o página cancela la consulta anterior.
  useEffect(() => {
    if (!hijoId) return;
    const controller = new AbortController();
    const statusParam = filter === 'TODAS' ? null : filter;
    setLoading(true);
    setError(null);
    guardianJustificationsService
      .list(hijoId, { status: statusParam, page }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPageData(data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(guardianJustificationsErrorMessage(cause, 'list'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hijoId, filter, page, reloadKey]);

  // Enlaces desde Asistencia: solo valen para el hijo con el que se generaron (studentId en la URL).
  const linkStudentId = searchParams.get('studentId');
  const linkMatchesHijo = hijoId !== null && linkStudentId === hijoId;
  const attendanceIdParam = linkMatchesHijo ? searchParams.get('attendanceId') : null;
  const justificationIdParam = linkMatchesHijo ? searchParams.get('justificationId') : null;
  const hasLinkParams = searchParams.has('attendanceId') || searchParams.has('justificationId');

  const clearLinkParams = useCallback(() => {
    if (hasLinkParams) router.replace('/padre/justificacion');
  }, [hasLinkParams, router]);

  // «Justificar» abre el formulario de esa sesión.
  useEffect(() => {
    if (!attendanceIdParam) return;
    const attendanceId = Number(attendanceIdParam);
    if (!Number.isSafeInteger(attendanceId) || attendanceId <= 0) return;
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
  }, [attendanceIdParam, searchParams]);

  // «Ver justificación» muestra esa solicitud destacada, aunque no esté en la página actual.
  useEffect(() => {
    setFocused(null);
    setFocusError(null);
    if (!hijoId || !justificationIdParam) return;
    const id = Number(justificationIdParam);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    const controller = new AbortController();
    guardianJustificationsService
      .detail(hijoId, id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setFocused(data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setFocusError(guardianJustificationsErrorMessage(cause, 'detail'));
      });
    return () => controller.abort();
  }, [hijoId, justificationIdParam, reloadKey]);

  // La solicitud destacada queda debajo del calendario: se lleva a la vista una vez por cada justificationId del
  // enlace, no en cada recarga de la solicitud.
  const scrolledJustificationId = useRef<string | null>(null);
  useEffect(() => {
    if (!focused || !justificationIdParam || scrolledJustificationId.current === justificationIdParam) return;
    scrolledJustificationId.current = justificationIdParam;
    if (typeof document !== 'undefined') document.getElementById('justificacion-destacada')?.scrollIntoView?.({ block: 'start' });
  }, [focused, justificationIdParam]);

  const handleDownloadAttachment = async (justificationId: number) => {
    if (!hijoId) return;
    setDownloadingId(justificationId);
    setDownloadError(null);
    try {
      const { url } = await guardianJustificationsService.attachmentUrl(hijoId, justificationId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (cause) {
      setDownloadError({ id: justificationId, message: guardianJustificationsErrorMessage(cause, 'download') });
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

  const handleModalClose = () => {
    setModalState(null);
    if (attendanceIdParam) clearLinkParams();
  };

  const handleModalSuccess = () => {
    setModalState(null);
    if (attendanceIdParam) clearLinkParams();
    loadJustifications();
    reloadMonth();
    reloadToday();
  };

  // Estados previos de carga del apoderado
  if (isPadreLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-line mb-2" />
        <div className="h-4 w-72 animate-pulse rounded bg-line mb-6" />
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
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6 text-center text-sm text-accent">
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

  const renderCard = (item: AttendanceJustification, destacada = false) => {
    const badge = STATUS_BADGES[item.status];
    const isObserved = item.status === 'OBSERVADA';
    const isDownloading = downloadingId === item.id;
    const isHistoryExpanded = expandedHistoryId === item.id;

    return (
      <div
        key={destacada ? `destacada-${item.id}` : item.id}
        id={destacada ? 'justificacion-destacada' : undefined}
        className="rounded-2xl border border-line bg-white p-5 shadow-xs transition hover:border-muted/60"
      >
        {/* Cabecera de la tarjeta */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">{formatDayLong(item.date)}</span>
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
                ? 'border-line bg-neutral text-ink'
                : item.status === 'RECHAZADA'
                ? 'border-accent/30 bg-accent-soft text-accent'
                : 'border-success-ink/30 bg-success text-success-ink'
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
            {downloadError?.id === item.id && (
              <span role="alert" className="text-[11px] font-semibold text-accent">
                {downloadError.message}
              </span>
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
  };

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
          prefetch={false}
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
            Las inasistencias y tardanzas pueden justificarse hasta el final del <strong>segundo día hábil</strong> posterior a la sesión (de lunes a viernes; los feriados cuentan como días hábiles). Para iniciar una solicitud, abre en el calendario un día marcado con «!» y elige «Justificar ahora».
          </p>
        </div>
      </div>

      {/* Estado de hoy y calendario del mes del estudiante seleccionado */}
      <EstadoHoyCard
        status={todayCard.status}
        loading={todayCard.loading}
        error={todayCard.error}
        onRetry={reloadToday}
        onJustificar={handleJustifyToday}
      />
      <CalendarioAsistencia
        weeks={month.weeks}
        mesLabel={monthLabel(visible.year, visible.month)}
        loading={month.loading}
        error={month.error}
        onRetry={reloadMonth}
        onPrevMes={() => setVisible(v => shiftMonth(v.year, v.month, -1))}
        onNextMes={() => setVisible(v => shiftMonth(v.year, v.month, 1))}
        canNext={canNextMonth}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onJustificar={handleJustifySession}
        onVerJustificacion={handleViewJustification}
      />

      {/* Solicitud enlazada desde Asistencia («Ver justificación») */}
      {focusError && (
        <p role="alert" className="rounded-2xl border border-accent/30 bg-accent-soft p-4 text-xs font-semibold text-accent">
          {focusError}
        </p>
      )}
      {focused && (
        <section aria-label="Solicitud seleccionada" className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Solicitud seleccionada</p>
            <button type="button" onClick={clearLinkParams} className="text-xs font-semibold text-accent underline">
              Ver todas
            </button>
          </div>
          {renderCard(focused, true)}
        </section>
      )}

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
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6 text-center text-sm text-accent">
          <Alert02Icon size={24} className="mx-auto mb-2 text-accent" />
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
            prefetch={false}
            className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90"
          >
            Ir a Asistencia
          </Link>
        </div>
      )}

      {/* Listado de justificaciones */}
      {!loading && !error && pageData && pageData.content.length > 0 && (
        <div className="space-y-4">
          {pageData.content.map((item) => renderCard(item))}

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
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Cancel01Icon,
  Download01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  File02Icon,
  ArrowReloadHorizontalIcon,
} from 'hugeicons-react';
import {
  managementAttendanceJustificationsService,
  justificationDecisionError,
  guardianJustificationErrorMessage,
} from '@/services/admin/managementAttendanceJustificationsService';
import { formatLimaDateTime } from '@/services/padres/guardianIncidentsService';
import { JUSTIFICATION_TEXT_MAX_LENGTH } from '@/services/padres/guardianJustificationsService';
import type {
  AttendanceJustification,
  JustificationDecisionRequest,
  JustificationStatus,
} from '@/types/guardianJustificationsApi';

const STATUS_BADGES: Record<JustificationStatus, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  OBSERVADA: { label: 'Observada', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  APROBADA: { label: 'Aprobada', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-rose-50 text-rose-800 border-rose-200' },
};

interface ModalDetalleJustificacionProps {
  justificationId: number;
  canDecide: boolean;
  onClose: () => void;
  onDecisionSuccess?: () => void;
}

export function ModalDetalleJustificacion({
  justificationId,
  canDecide,
  onClose,
  onDecisionSuccess,
}: ModalDetalleJustificacionProps) {
  const [data, setData] = useState<AttendanceJustification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para la descarga
  const [isDownloading, setIsDownloading] = useState(false);

  // Estado para la toma de decisión (solo DIRECTIVO)
  const [selectedDecision, setSelectedDecision] = useState<Exclude<JustificationStatus, 'PENDIENTE'> | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await managementAttendanceJustificationsService.detail(justificationId);
      setData(result);
    } catch (cause) {
      setError(guardianJustificationErrorMessage(cause, 'detail'));
    } finally {
      setLoading(false);
    }
  }, [justificationId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleDownloadAttachment = async () => {
    if (!data) return;
    setIsDownloading(true);
    try {
      const { url } = await managementAttendanceJustificationsService.attachmentUrl(data.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (cause) {
      alert(guardianJustificationErrorMessage(cause, 'download'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecision || !data) return;

    const validationErr = justificationDecisionError(selectedDecision, decisionComment);
    if (validationErr) {
      setDecisionError(validationErr);
      return;
    }

    setIsSubmittingDecision(true);
    setDecisionError(null);
    try {
      const req: JustificationDecisionRequest = {
        decision: selectedDecision,
        comment: decisionComment.trim(),
      };
      await managementAttendanceJustificationsService.decide(data.id, req);
      setSelectedDecision(null);
      setDecisionComment('');
      onDecisionSuccess?.();
      await loadDetail();
    } catch (cause) {
      setDecisionError(guardianJustificationErrorMessage(cause, 'detail'));
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-justificacion-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl border border-line">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-3">
            <h2 id="detalle-justificacion-title" className="text-base font-bold text-ink">
              Detalle de justificación #{justificationId}
            </h2>
            {data && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                  STATUS_BADGES[data.status].className
                }`}
              >
                {STATUS_BADGES[data.status].label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-neutral hover:text-ink transition"
            aria-label="Cerrar detalle"
          >
            <Cancel01Icon size={18} />
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="space-y-4 py-8">
              <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-20 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-12 w-full animate-pulse rounded bg-slate-200" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
              <Alert02Icon size={24} className="mx-auto mb-2 text-rose-600" />
              <p className="font-semibold">{error}</p>
              <button
                type="button"
                onClick={loadDetail}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90"
              >
                <ArrowReloadHorizontalIcon size={14} /> Reintentar
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Resumen de la sesión */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-neutral/20 p-4 sm:grid-cols-4 text-xs">
                <div>
                  <p className="text-muted font-medium">Estudiante ID</p>
                  <p className="font-bold text-ink mt-0.5">{data.studentId}</p>
                </div>
                <div>
                  <p className="text-muted font-medium">Fecha de clase</p>
                  <p className="font-bold text-ink mt-0.5">{data.date}</p>
                </div>
                <div>
                  <p className="text-muted font-medium">Curso</p>
                  <p className="font-bold text-ink mt-0.5">{data.courseName}</p>
                </div>
                <div>
                  <p className="text-muted font-medium">Tipo de falta</p>
                  <p className="font-bold text-ink mt-0.5 uppercase">
                    {data.attendanceStatus === 'INASISTENCIA' ? 'Inasistencia' : 'Tardanza'}
                  </p>
                </div>
              </div>

              {/* Motivo de la solicitud */}
              <div className="rounded-xl border border-line p-4">
                <p className="text-xs font-bold text-ink mb-1">Motivo expuesto por el apoderado:</p>
                <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{data.reason}</p>
              </div>

              {/* Archivo adjunto */}
              <div className="rounded-xl border border-line p-4">
                <p className="text-xs font-bold text-ink mb-2">Documento o comprobante de sustento:</p>
                {data.attachmentName ? (
                  <div className="flex items-center justify-between rounded-lg border border-line bg-neutral/30 p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File02Icon size={18} className="text-accent shrink-0" />
                      <div className="truncate text-xs">
                        <span className="font-semibold text-ink">{data.attachmentName}</span>
                        {data.attachmentSizeBytes && (
                          <span className="text-muted text-[10px] ml-2">
                            ({(data.attachmentSizeBytes / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadAttachment}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:bg-accent/90 disabled:opacity-50"
                    >
                      <Download01Icon size={14} />
                      <span>{isDownloading ? 'Generando enlace...' : 'Descargar'}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">La solicitud no incluye archivo adjunto.</p>
                )}
              </div>

              {/* Comentarios previos o respuesta */}
              {data.reviewComment && (
                <div className="rounded-xl border border-line bg-neutral/10 p-4 text-xs">
                  <p className="font-bold text-ink mb-1">Comentario de revisión vigente:</p>
                  <p className="text-muted leading-relaxed whitespace-pre-wrap">{data.reviewComment}</p>
                </div>
              )}

              {data.response && (
                <div className="rounded-xl border border-line bg-neutral/10 p-4 text-xs">
                  <p className="font-bold text-ink mb-1">Respuesta subsanada por el apoderado:</p>
                  <p className="text-muted leading-relaxed whitespace-pre-wrap">{data.response}</p>
                </div>
              )}

              {/* Historial de cambios */}
              {data.history.length > 0 && (
                <div className="rounded-xl border border-line p-4">
                  <p className="text-xs font-bold text-ink mb-3 uppercase tracking-wider text-[11px]">
                    Historial de revisiones
                  </p>
                  <ol className="relative border-l border-line ml-3 space-y-3 pl-3">
                    {data.history.map((change, index) => (
                      <li key={index} className="relative text-xs">
                        <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-accent" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">
                            {change.from ? `${change.from} → ${change.to}` : change.to}
                          </span>
                          <span className="text-[10px] text-muted">{formatLimaDateTime(change.at)}</span>
                        </div>
                        {change.comment && (
                          <p className="mt-0.5 text-muted text-[11px] whitespace-pre-wrap">
                            {change.comment}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Sección de decisión: SOLO para DIRECTIVO cuando está PENDIENTE */}
              {canDecide && data.status === 'PENDIENTE' && (
                <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4 space-y-3">
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">
                    Resolución de la solicitud (Directivo)
                  </p>

                  {decisionError && (
                    <div
                      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                      role="alert"
                    >
                      <Alert02Icon size={16} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{decisionError}</span>
                    </div>
                  )}

                  {/* Botones de decisión */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDecision('APROBADA');
                        setDecisionError(null);
                      }}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        selectedDecision === 'APROBADA'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-line text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      ✓ Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDecision('OBSERVADA');
                        setDecisionError(null);
                      }}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        selectedDecision === 'OBSERVADA'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white border border-line text-sky-800 hover:bg-sky-50'
                      }`}
                    >
                      ⚠ Observar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDecision('RECHAZADA');
                        setDecisionError(null);
                      }}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        selectedDecision === 'RECHAZADA'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white border border-line text-rose-800 hover:bg-rose-50'
                      }`}
                    >
                      ✕ Rechazar
                    </button>
                  </div>

                  {/* Formulario de comentario */}
                  {selectedDecision && (
                    <form onSubmit={handleSubmitDecision} className="mt-3 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="decision-comment" className="text-xs font-semibold text-ink">
                            Comentario de resolución ({selectedDecision.toLowerCase()}) <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-muted font-medium">
                            {decisionComment.length} / {JUSTIFICATION_TEXT_MAX_LENGTH}
                          </span>
                        </div>
                        <textarea
                          id="decision-comment"
                          value={decisionComment}
                          onChange={(e) => {
                            setDecisionComment(e.target.value);
                            setDecisionError(null);
                          }}
                          rows={3}
                          maxLength={JUSTIFICATION_TEXT_MAX_LENGTH}
                          placeholder={
                            selectedDecision === 'APROBADA'
                              ? 'Indica el motivo o sustento de la aprobación...'
                              : selectedDecision === 'OBSERVADA'
                              ? 'Indica la información adicional o corrección que el apoderado debe subsanar...'
                              : 'Indica el motivo por el cual no procede la justificación...'
                          }
                          disabled={isSubmittingDecision}
                          className="w-full resize-none rounded-xl border border-line bg-white p-3 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDecision(null);
                            setDecisionComment('');
                            setDecisionError(null);
                          }}
                          disabled={isSubmittingDecision}
                          className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-neutral disabled:opacity-50"
                        >
                          Cancelar selección
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingDecision || !decisionComment.trim()}
                          className="rounded-xl bg-accent px-4 py-1.5 text-xs font-bold text-white transition hover:bg-accent/90 disabled:opacity-50"
                        >
                          {isSubmittingDecision ? 'Guardando...' : `Confirmar ${selectedDecision.toLowerCase()}`}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-neutral"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}


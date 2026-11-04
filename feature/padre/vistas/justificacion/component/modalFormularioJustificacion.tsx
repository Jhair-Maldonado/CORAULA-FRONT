'use client';

import React, { useState } from 'react';
import {
  Cancel01Icon,
  Upload04Icon,
  Delete02Icon,
  Alert02Icon,
  File02Icon,
} from 'hugeicons-react';
import {
  guardianJustificationsService,
  guardianJustificationsErrorMessage,
  justificationTextError,
  justificationFileError,
  JUSTIFICATION_TEXT_MAX_LENGTH,
  JUSTIFICATION_ACCEPT,
} from '@/services/padres/guardianJustificationsService';
import type { AttendanceJustification } from '@/types/guardianJustificationsApi';

export interface ModalFormularioJustificacionProps {
  mode: 'submit' | 'respond';
  studentId: string;
  attendanceId?: number;
  justificationId?: number;
  sessionInfo?: {
    date: string;
    courseName?: string;
    status?: string;
  };
  observationComment?: string | null;
  onClose: () => void;
  onSuccess: (result: AttendanceJustification) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ModalFormularioJustificacion({
  mode,
  studentId,
  attendanceId,
  justificationId,
  sessionInfo,
  observationComment,
  onClose,
  onSuccess,
}: ModalFormularioJustificacionProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSubmitMode = mode === 'submit';
  const title = isSubmitMode ? 'Justificar inasistencia o tardanza' : 'Subsanar observación de justificación';
  const textLabel = isSubmitMode ? 'Motivo de la justificación' : 'Respuesta a la observación';
  const textPlaceholder = isSubmitMode
    ? 'Describe detalladamente el motivo de la inasistencia o tardanza...'
    : 'Indica la aclaración o información adicional solicitada...';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const fileErr = justificationFileError(selected);
    if (fileErr) {
      setError(fileErr);
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const txtErr = justificationTextError(text, isSubmitMode ? 'motivo' : 'respuesta');
    if (txtErr) {
      setError(txtErr);
      return;
    }

    const fileErr = justificationFileError(file);
    if (fileErr) {
      setError(fileErr);
      return;
    }

    setIsSubmitting(true);
    try {
      let result: AttendanceJustification;
      if (isSubmitMode) {
        if (!attendanceId) {
          setError('Selecciona una sesión de asistencia para justificar.');
          setIsSubmitting(false);
          return;
        }
        result = await guardianJustificationsService.submit(studentId, attendanceId, text, file);
      } else {
        if (!justificationId) {
          setError('Selecciona la solicitud de justificación a subsanar.');
          setIsSubmitting(false);
          return;
        }
        result = await guardianJustificationsService.respond(studentId, justificationId, text, file);
      }
      onSuccess(result);
    } catch (cause) {
      setError(guardianJustificationsErrorMessage(cause, isSubmitMode ? 'submit' : 'respond'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="justificacion-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-line">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 id="justificacion-modal-title" className="text-base font-bold text-ink">
              {title}
            </h2>
            {sessionInfo && (
              <p className="mt-1 text-xs text-muted">
                {sessionInfo.date} {sessionInfo.courseName ? `· ${sessionInfo.courseName}` : ''} {sessionInfo.status ? `· ${sessionInfo.status}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-muted hover:bg-neutral hover:text-ink transition disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <Cancel01Icon size={18} />
          </button>
        </div>

        {/* Contenido / Formulario */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Si responde a observación, mostrar el comentario del directivo/secretaría */}
          {!isSubmitMode && observationComment && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <Alert02Icon size={14} className="text-amber-700" />
                <span>Observación de Secretaría</span>
              </div>
              <p className="whitespace-pre-wrap">{observationComment}</p>
            </div>
          )}

          {/* Banner de error */}
          {error && (
            <div
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
              role="alert"
            >
              <Alert02Icon size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Textarea del motivo/respuesta */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="justificacion-texto" className="text-xs font-semibold text-ink">
                {textLabel} <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-medium ${text.length > JUSTIFICATION_TEXT_MAX_LENGTH ? 'text-rose-600 font-bold' : 'text-muted'}`}>
                {text.length} / {JUSTIFICATION_TEXT_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="justificacion-texto"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              maxLength={JUSTIFICATION_TEXT_MAX_LENGTH + 50}
              placeholder={textPlaceholder}
              disabled={isSubmitting}
              className="w-full resize-none rounded-xl border border-line bg-white p-3 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
              required
            />
          </div>

          {/* Archivo adjunto opcional */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Documento o comprobante de sustento (opcional)
            </label>
            <p className="text-[11px] text-muted mb-2">
              Formatos admitidos: PDF, JPEG o PNG (hasta 15 MB).
            </p>

            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-line bg-neutral/40 p-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <File02Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{file.name}</p>
                    <p className="text-[10px] text-muted">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isSubmitting}
                  className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50"
                  title="Quitar archivo"
                  aria-label="Quitar archivo adjunto"
                >
                  <Delete02Icon size={16} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-neutral/20 p-4 transition hover:border-accent hover:bg-accent/5">
                <Upload04Icon size={22} className="text-muted" />
                <span className="mt-1.5 text-xs font-medium text-ink">
                  Seleccionar un archivo
                </span>
                <span className="text-[10px] text-muted">Haz clic para buscar en tu dispositivo</span>
                <input
                  type="file"
                  accept={JUSTIFICATION_ACCEPT}
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-neutral disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !text.trim() || text.length > JUSTIFICATION_TEXT_MAX_LENGTH}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : isSubmitMode ? 'Enviar justificación' : 'Enviar respuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


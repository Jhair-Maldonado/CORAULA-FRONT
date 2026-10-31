'use client';

import React, { useState, useRef } from 'react';
import {
  Calendar01Icon,
  DocumentValidationIcon,
  FileUploadIcon,
  Delete02Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  InformationCircleIcon
} from 'hugeicons-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { MotivoJustificacion, MOTIVOS_JUSTIFICACION, NuevaJustificacionInput } from '../types';

interface FormularioJustificacionProps {
  estudianteId: string | number;
  apoderadoId: string | number;
  estudianteNombre: string;
  onEnviar: (data: NuevaJustificacionInput) => Promise<{ ok: boolean; error?: string }>;
  isSubmitting: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const FormularioJustificacion: React.FC<FormularioJustificacionProps> = ({
  estudianteId,
  apoderadoId,
  estudianteNombre,
  onEnviar,
  isSubmitting,
}) => {
  const [fechaInasistencia, setFechaInasistencia] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [motivo, setMotivo] = useState<MotivoJustificacion>('Salud / Médico');
  const [descripcion, setDescripcion] = useState<string>('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string>('');
  const [mensajeExito, setMensajeExito] = useState<string>('');
  const [mensajeError, setMensajeError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorArchivo('');
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    // Validación de tipo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorArchivo('Formato no permitido. Solo se aceptan archivos PDF o imágenes (JPG, PNG, WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validación de tamaño
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorArchivo(`El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setArchivo(file);
  };

  const handleEliminarArchivo = () => {
    setArchivo(null);
    setErrorArchivo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');

    if (!fechaInasistencia) {
      setMensajeError('Por favor seleccione la fecha de inasistencia.');
      return;
    }

    if (!descripcion.trim() || descripcion.trim().length < 10) {
      setMensajeError('Por favor detalle el motivo de la inasistencia (mínimo 10 caracteres).');
      return;
    }

    const resultado = await onEnviar({
      estudiante_id: estudianteId,
      apoderado_id: apoderadoId,
      fecha_inasistencia: fechaInasistencia,
      motivo,
      descripcion: descripcion.trim(),
      archivo,
    });

    if (resultado.ok) {
      setMensajeExito('¡Solicitud de justificación enviada exitosamente para revisión de Secretaría!');
      setDescripcion('');
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (resultado.error) {
      setMensajeError(resultado.error);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-2xs">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-line/60">
        <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center font-bold">
          <DocumentValidationIcon size={20} />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-black text-ink uppercase tracking-wide">
            Nueva Justificación de Inasistencia
          </h2>
          <p className="text-xs text-muted font-medium">
            Registrando solicitud para <strong>{estudianteNombre}</strong>
          </p>
        </div>
      </div>

      {/* Alertas de Resultado */}
      {mensajeExito && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckmarkCircle01Icon size={18} className="text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircleIcon size={18} className="text-rose-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fila 1: Fecha y Motivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="fecha_inasistencia"
            name="fecha_inasistencia"
            type="date"
            label="Fecha de Inasistencia"
            value={fechaInasistencia}
            onChange={(e) => setFechaInasistencia(e.target.value)}
            required
            disabled={isSubmitting}
            max={new Date().toISOString().split('T')[0]}
          />

          <Select
            id="motivo"
            name="motivo"
            label="Motivo Principal"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoJustificacion)}
            required
            disabled={isSubmitting}
            options={MOTIVOS_JUSTIFICACION.map((m) => ({ value: m, label: m }))}
          />
        </div>

        {/* Fila 2: Descripción Detallada */}
        <div>
          <Textarea
            id="descripcion"
            name="descripcion"
            label="Detalle y Explicación de la Falta"
            rows={3}
            placeholder="Explique las circunstancias que originaron la inasistencia (ej: diagnóstico médico, prescripción de descanso, trámite familiar impostergable)..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            disabled={isSubmitting}
            helperText="Mínimo 10 caracteres requeridos para la evaluación del departamento de Secretaría."
          />
        </div>

        {/* Fila 3: Carga de Archivo Adjunto (Supabase Storage) */}
        <div>
          <label className="text-xs font-bold text-ink mb-1.5 block">
            Comprobante / Justificante Médico (Opcional pero Recomendado)
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="hidden"
            id="archivo_justificante"
          />

          {!archivo ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-accent rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-rose-50/20 transition-all duration-150 flex flex-col items-center justify-center gap-1.5"
            >
              <FileUploadIcon size={24} className="text-muted" />
              <p className="text-xs font-bold text-ink">
                Haga clic aquí para seleccionar o arrastre su comprobante
              </p>
              <p className="text-[11px] text-muted font-medium">
                Formatos permitidos: PDF, JPG, PNG, WEBP (Máx. 5 MB)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <DocumentValidationIcon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate">{archivo.name}</p>
                  <p className="text-[10px] text-muted">
                    {(archivo.size / (1024 * 1024)).toFixed(2)} MB • Archivo listo para subir
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEliminarArchivo}
                disabled={isSubmitting}
                className="p-1.5 text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                title="Quitar archivo"
              >
                <Delete02Icon size={16} />
              </button>
            </div>
          )}

          {errorArchivo && (
            <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircleIcon size={12} /> {errorArchivo}
            </p>
          )}
        </div>

        {/* Fila 4: Botón de Envío */}
        <div className="pt-2 flex items-center justify-between">
          <p className="text-[11px] text-muted flex items-center gap-1">
            <InformationCircleIcon size={14} className="text-slate-400" />
            La solicitud será auditada por Dirección y Secretaría escolar.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className="px-6"
          >
            {isSubmitting ? 'Enviando solicitud...' : 'Enviar Justificación'}
          </Button>
        </div>
      </form>
    </div>
  );
};

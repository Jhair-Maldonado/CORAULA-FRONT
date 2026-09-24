// src/components/padres/JustificacionModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { MotivoJustificacion } from '@/types/padre';
import { enviarJustificacion } from '@/services/padres/padreService';
import { usePadre } from './PadreContext';

interface JustificacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MOTIVOS: MotivoJustificacion[] = [
  'Salud / Médico',
  'Familiar',
  'Viaje',
  'Fuerza Mayor',
  'Otro',
];

export const JustificacionModal: React.FC<JustificacionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { hijos, selectedHijoId } = usePadre();
  const [hijoId, setHijoId] = useState(selectedHijoId || (hijos[0]?.id ?? ''));
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<MotivoJustificacion>('Salud / Médico');
  const [descripcion, setDescripcion] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivoNombre(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setErrorMsg('Por favor ingrese el motivo o detalle de la inasistencia');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await enviarJustificacion({
        hijoId,
        fechaInasistencia: fecha,
        motivo,
        descripcion,
        archivoNombre: archivoNombre || undefined,
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        setDescripcion('');
        setArchivoNombre('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Justificar Inasistencia"
      description="Envíe una justificación formal dirigida a la coordinación académica y al tutor."
      maxWidth="lg"
    >
      {submittedSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h4 className="text-base font-bold text-[#111827]">
            ¡Justificación enviada con éxito!
          </h4>
          <p className="text-xs text-[#6B7280]">
            El tutor y la coordinación académica revisarán su solicitud a la brevedad.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Selector de estudiante */}
          <Select
            label="Estudiante"
            required
            value={hijoId}
            onChange={(e) => setHijoId(e.target.value)}
          >
            {hijos.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombreCompleto} ({h.grado} &quot;{h.seccion}&quot;)
              </option>
            ))}
          </Select>

          {/* Fecha de la falta */}
          <Input
            label="Fecha de la Inasistencia"
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            helperText="Seleccione el día en que el alumno faltó o faltará"
          />

          {/* Motivo */}
          <Select
            label="Motivo Principal"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoJustificacion)}
          >
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>

          {/* Descripción */}
          <Textarea
            label="Explicación detallada"
            rows={3}
            required
            placeholder="Describa brevemente la razón de la ausencia..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          {/* Adjuntar comprobante / constancia */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827]">
              Adjuntar Constancia o Certificado Médico (Opcional)
            </label>
            <div className="border border-dashed border-[#D1D5DB] rounded-xl p-3 bg-slate-50/50 flex items-center justify-between gap-3 text-xs text-[#6B7280]">
              <input
                type="file"
                id="doc-justificacion"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />
              <label
                htmlFor="doc-justificacion"
                className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] cursor-pointer hover:bg-slate-100"
              >
                Examinar archivo
              </label>
              <span className="truncate max-w-[200px] text-slate-500 font-mono text-[11px]">
                {archivoNombre || 'Ningún archivo seleccionado'}
              </span>
            </div>
            <p className="text-[10px] text-[#6B7280]">
              Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Enviar Justificación
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

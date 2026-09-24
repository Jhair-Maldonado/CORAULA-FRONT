// src/components/padres/ComunicadoModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ComunicadoPadre } from '@/types/padre';
import { firmarComunicado, marcarComunicadoLeido } from '@/services/padres/padreService';
import { usePadre } from './PadreContext';

interface ComunicadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  comunicado: ComunicadoPadre | null;
  onSuccess?: () => void;
}

export const ComunicadoModal: React.FC<ComunicadoModalProps> = ({
  isOpen,
  onClose,
  comunicado,
  onSuccess,
}) => {
  const { padre } = usePadre();
  const [nombreFirma, setNombreFirma] = useState(
    padre ? `${padre.nombres} ${padre.apellidos} (DNI ${padre.dni})` : ''
  );
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [firmaSuccess, setFirmaSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Marcar como leído al abrir
  React.useEffect(() => {
    if (comunicado && !comunicado.leido) {
      marcarComunicadoLeido(comunicado.id);
    }
  }, [comunicado]);

  if (!comunicado) return null;

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptoTerminos) {
      setErrorMsg('Debe marcar la casilla de consentimiento y autorización');
      return;
    }
    if (!nombreFirma.trim()) {
      setErrorMsg('Debe ingresar su nombre completo y documento de identidad');
      return;
    }

    try {
      setIsSigning(true);
      setErrorMsg('');
      await firmarComunicado(comunicado.id, nombreFirma);
      setFirmaSuccess(true);
      setTimeout(() => {
        setFirmaSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar la firma digital');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={comunicado.titulo}
      description={`Emitido el ${comunicado.fecha} por ${comunicado.emisor}`}
      maxWidth="lg"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Metadatos y Tipo */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <Badge
            variant={
              comunicado.tipo === 'Urgente'
                ? 'danger'
                : comunicado.tipo === 'Evento'
                ? 'accent'
                : 'info'
            }
          >
            {comunicado.tipo}
          </Badge>
          <span className="text-xs text-[#6B7280]">
            Emisor: <strong className="text-[#111827]">{comunicado.emisorCargo}</strong>
          </span>
        </div>

        {/* Contenido Completo */}
        <div className="text-sm text-[#111827] whitespace-pre-line leading-relaxed bg-slate-50/60 p-4 rounded-2xl border border-slate-200/60 font-sans">
          {comunicado.contenido}
        </div>

        {/* Archivos Adjuntos */}
        {comunicado.adjuntos && comunicado.adjuntos.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
              Documentos Adjuntos
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {comunicado.adjuntos.map((adj, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs hover:border-[#D1D5DB]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-rose-600 font-bold text-sm">PDF</span>
                    <span className="font-semibold text-[#111827] truncate">{adj.nombre}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">{adj.tamanio}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bloque de Autorización / Firma Digital */}
        {comunicado.requiereFirma && (
          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200/70 space-y-3">
            <h5 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
              <span>✍</span> Firma y Autorización Digital de Apoderado
            </h5>

            {comunicado.firmado ? (
              <div className="p-3 bg-[#DCFCE7] text-[#15803D] rounded-xl text-xs font-semibold flex items-center gap-2 border border-[#BBF7D0]">
                <span>✓</span> Firmado conforme por: {comunicado.firmaNombre || 'Apoderado'} el{' '}
                {comunicado.firmaFecha}
              </div>
            ) : firmaSuccess ? (
              <div className="p-3 bg-[#DCFCE7] text-[#15803D] rounded-xl text-xs font-semibold text-center">
                ¡Firma digital registrada con éxito!
              </div>
            ) : (
              <form onSubmit={handleSign} className="space-y-3">
                {errorMsg && (
                  <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
                )}
                <Input
                  label="Nombre Completo y DNI del Apoderado Firmante"
                  required
                  value={nombreFirma}
                  onChange={(e) => setNombreFirma(e.target.value)}
                  placeholder="Ej: Roberto Carlos Fernández Silva (DNI 08765432)"
                />
                <label className="flex items-start gap-2.5 text-xs text-[#4B5563] cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded text-[#BE123C] focus:ring-[#BE123C] cursor-pointer"
                    checked={aceptoTerminos}
                    onChange={(e) => setAceptoTerminos(e.target.checked)}
                  />
                  <span>
                    Otorgo mi consentimiento expreso e informado para la actividad descrita en
                    este comunicado oficial del colegio.
                  </span>
                </label>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSigning}
                  >
                    Firmar Digitalmente
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#E5E7EB]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

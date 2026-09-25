// src/components/padres/PagoModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { CuotaPension, MetodoPago } from '@/types/padre';
import { registrarPago } from '@/lib/api';

interface PagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuota: CuotaPension | null;
  onSuccess?: () => void;
}

export const PagoModal: React.FC<PagoModalProps> = ({
  isOpen,
  onClose,
  cuota,
  onSuccess,
}) => {
  const [metodo, setMetodo] = useState<MetodoPago>('Transferencia');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [comprobanteNombre, setComprobanteNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!cuota) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroOperacion.trim()) {
      setErrorMsg('Por favor ingrese el número de operación o referencia del comprobante');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await registrarPago({
        pagoId: cuota.id,
        metodoPago: metodo,
        numeroOperacion,
        comprobanteNombre: comprobanteNombre || undefined,
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        setNumeroOperacion('');
        setComprobanteNombre('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pago de Pensión"
      description="Reporte la constancia de abono realizada a las cuentas oficiales del colegio."
      maxWidth="md"
    >
      {submittedSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h4 className="text-base font-bold text-[#111827]">
            ¡Pago reportado correctamente!
          </h4>
          <p className="text-xs text-[#6B7280]">
            El departamento de finanzas y tesorería validará la transacción en 24 a 48 horas hábiles.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Resumen del Concepto y Monto */}
          <div className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Concepto
              </span>
              <p className="text-sm font-bold text-[#111827]">{cuota.concepto}</p>
              <p className="text-xs text-[#6B7280]">Vence: {cuota.fechaVencimiento}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Total a Pagar
              </span>
              <p className="text-lg font-black text-[#BE123C]">
                S/ {cuota.total.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Método de Pago */}
          <Select
            label="Canal / Método de Pago"
            required
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoPago)}
          >
            <option value="Transferencia">Transferencia Bancaria (BCP / BBVA / Interbank)</option>
            <option value="Yape">Yape / Plin Institucional</option>
            <option value="Tarjeta">Tarjeta Débito / Crédito (Pasarela)</option>
            <option value="Ventanilla">Depósito en Agente / Ventanilla</option>
          </Select>

          {/* Número de Operación */}
          <Input
            label="Número de Operación / Código de Referencia"
            required
            placeholder="Ej: BCP-90218491 o 8 dígitos"
            value={numeroOperacion}
            onChange={(e) => setNumeroOperacion(e.target.value)}
            helperText="Número impreso en el voucher o notificación digital"
          />

          {/* Adjuntar Voucher */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827]">
              Foto del Comprobante / Voucher (Opcional)
            </label>
            <div className="border border-dashed border-[#D1D5DB] rounded-xl p-3 bg-slate-50/50 flex items-center justify-between gap-3 text-xs text-[#6B7280]">
              <input
                type="file"
                id="doc-voucher"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setComprobanteNombre(e.target.files[0].name);
                  }
                }}
              />
              <label
                htmlFor="doc-voucher"
                className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] cursor-pointer hover:bg-slate-100"
              >
                Subir imagen / PDF
              </label>
              <span className="truncate max-w-[200px] text-slate-500 font-mono text-[11px]">
                {comprobanteNombre || 'Sin archivo adjunto'}
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Confirmar y Reportar Pago
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

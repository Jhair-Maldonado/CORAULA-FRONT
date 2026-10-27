'use client';

import { useState } from 'react';
import { SectionDialog, secondaryButtonClass, destructiveButtonClass, inputClass, labelClass } from '../secciones/sectionUi';

export default function AnnulBimesterDialog({ bimesterName, periodName, onCancel, onConfirm }: {
  bimesterName: string; periodName: string; onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  return <SectionDialog title="Anular bimestre" busy={false} onClose={onCancel}>
    <form aria-label="Anulación del bimestre" noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      if (!reason.trim()) { setError('Ingresa el motivo de la anulación.'); return; }
      onConfirm(reason.trim());
    }}>
      <p className="text-sm">Anular <strong>{bimesterName}</strong> del periodo académico <strong>{periodName}</strong>.</p>
      <p className="text-xs text-muted">El bimestre queda en estado Anulado y no se puede editar, abrir ni reactivar. Su número queda libre para otro bimestre. Solo es posible si aún no tiene información académica registrada.</p>
      <label className={labelClass}>Motivo de la anulación<textarea tabIndex={0} aria-label="Motivo de la anulación" required rows={3} value={reason} aria-invalid={!!error} aria-describedby={error ? 'annul-reason-error' : undefined}
        className={`${inputClass} normal-case tracking-normal`} onChange={e => { setReason(e.target.value); setError(null); }} /></label>
      {error && <p id="annul-reason-error" role="alert" className="text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={destructiveButtonClass}>Confirmar anulación</button>
      </div>
    </form>
  </SectionDialog>;
}

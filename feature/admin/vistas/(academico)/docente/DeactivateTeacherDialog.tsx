'use client';

import { SectionDialog, secondaryButtonClass, destructiveButtonClass } from '../secciones/sectionUi';

export default function DeactivateTeacherDialog({ message, onCancel, onConfirm }: {
  message: string; onCancel: () => void; onConfirm: () => void;
}) {
  return <SectionDialog title="Desactivar docente" busy={false} onClose={onCancel}>
    <div className="flex flex-col gap-4">
      <p className="text-sm">{message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
        <button type="button" className={destructiveButtonClass} onClick={onConfirm}>Desactivar docente</button>
      </div>
    </div>
  </SectionDialog>;
}

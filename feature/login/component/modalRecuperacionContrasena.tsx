'use client';

// Recuperación de contraseña (FRONT #35). No existe recuperación por correo (RF-03 fuera de alcance): el
// restablecimiento lo hacen Secretaría o Dirección (procedimiento SOL-023). El modal solo informa: no pide
// datos, no hace peticiones ni simula envíos.
import React from 'react';
import { Cancel01Icon, SecurityCheckIcon } from 'hugeicons-react';

export const RECUPERACION_CONTRASENA_TEXTO =
  'Para restablecer tu contraseña, comunícate con Secretaría o la Dirección del colegio. Te entregarán una contraseña temporal que deberás cambiar al ingresar.';

export function ModalRecuperacionContrasena({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recuperacion-titulo"
        aria-describedby="recuperacion-texto"
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        className="w-full max-w-sm bg-white rounded-2xl border border-line/80 shadow-2xl p-6 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 inline-flex items-center justify-center min-w-6 min-h-6 text-muted hover:text-ink cursor-pointer"
        >
          <Cancel01Icon size={18} />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <SecurityCheckIcon size={20} />
            </div>
            <h3 id="recuperacion-titulo" className="text-base font-bold text-ink">Recuperar acceso</h3>
          </div>

          <p id="recuperacion-texto" className="text-[12.5px] text-muted leading-relaxed">
            {RECUPERACION_CONTRASENA_TEXTO}
          </p>

          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="w-full py-2.5 bg-ink text-white font-bold text-[13px] rounded-xl shadow-md hover:bg-ink/90 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

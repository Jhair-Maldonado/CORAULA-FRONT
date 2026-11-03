// Indicador del modo de ejecución, visible en todos los portales (src/app/layout.tsx).
// MOCK: banda fija abajo. LOCAL: etiqueta en la esquina inferior derecha. PRODUCTION: nada.
// pointer-events-none y z-30 (los modales usan z-50): nunca tapa clics en botones fijos ni modales.
import React from 'react';
import { APP_MODE, type AppMode } from '@/config/appConfig';

export const MOCK_BANNER_TEXT = 'MODO SIMULADO: datos de prueba, sin backend';

export function ModoEntornoBanner({ mode = APP_MODE }: { mode?: AppMode }) {
  if (mode === 'MOCK') {
    return (
      <>
        {/* Espacio al final de la página para que la banda no cubra el último contenido. */}
        <div aria-hidden="true" className="h-6 shrink-0" />
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-amber-500/90 py-1 text-center text-[11px] font-bold tracking-wide text-white"
        >
          {MOCK_BANNER_TEXT}
        </div>
      </>
    );
  }
  if (mode === 'LOCAL') {
    return (
      <span
        aria-label="Modo local"
        className="pointer-events-none fixed bottom-2 right-2 z-30 rounded-md bg-slate-800/70 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white"
      >
        LOCAL
      </span>
    );
  }
  return null;
}

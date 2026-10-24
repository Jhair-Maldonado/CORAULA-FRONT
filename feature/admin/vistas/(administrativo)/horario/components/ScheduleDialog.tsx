'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Cancel01Icon } from 'hugeicons-react';

export default function ScheduleDialog({ title, busy = false, onClose, children }: { title: string; busy?: boolean; onClose: () => void; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    container.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div ref={container} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}
      className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-line border-t-4 border-t-accent rounded-2xl p-5 sm:p-6 shadow-2xl text-ink"
      onKeyDown={event => {
        if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const nodes = container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]');
          if (!nodes?.length) { event.preventDefault(); return; }
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === container.current)) { event.preventDefault(); first.focus(); }
        }
      }}>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3 mb-5"><h2 id={titleId} className="text-base font-bold tracking-tight">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar diálogo" className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl text-muted hover:bg-neutral hover:text-ink transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"><Cancel01Icon size={18} aria-hidden="true" /></button></div>
      {children}
    </div>
  </div>;
}

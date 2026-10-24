'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircleIcon, Cancel01Icon, School01Icon, Clock01Icon } from 'hugeicons-react';
import type { SectionResponse } from '@/types/sectionApi';

export const buttonClass = 'min-h-10 px-3 py-2 rounded-xl border border-line text-xs font-bold transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
export const inputClass = 'min-h-10 min-w-0 px-3 py-2 rounded-lg border border-line bg-neutral/50 text-xs font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
export const labelClass = 'flex flex-col gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider';
export const primaryButtonClass = `${buttonClass} bg-accent text-white shadow-sm`;
export const secondaryButtonClass = `${buttonClass} bg-white text-ink hover:bg-neutral`;
export const destructiveButtonClass = `${buttonClass} bg-white text-rose-700 border-rose-200 hover:bg-rose-50`;
export const sectionName = (name: string) => /^sección\b/i.test(name) ? name : `Sección ${name}`;

export function SectionBadge({ positive, children }: { positive: boolean; children: ReactNode }) {
  return <span className={`inline-flex w-fit px-2 py-1 rounded-md border text-[10px] font-bold whitespace-nowrap ${positive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral text-muted border-line'}`}>{children}</span>;
}

export function SectionLoading({ children }: { children: ReactNode }) {
  return <div role="status" className="flex items-center gap-2.5 p-4 bg-white border border-line rounded-xl shadow-sm text-xs font-medium text-muted"><Clock01Icon size={18} aria-hidden="true" className="shrink-0 text-accent" />{children}</div>;
}

export function SectionEmpty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="bg-white border border-dashed border-line rounded-xl p-8 flex flex-col items-center gap-2 text-center"><School01Icon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold text-ink">{title}</p><p className="text-xs text-muted max-w-lg">{children}</p></div>;
}

export function SectionIdentity({ section }: { section: SectionResponse }) {
  return <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
    {[
      ['Nivel', section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'],
      ['Grado', section.grade], ['Sección', sectionName(section.name)],
      ['Capacidad', section.maxCapacity], ['Matrícula', section.enrollmentOpen ? 'Abierta' : 'Cerrada'],
      ['Estado', section.active ? 'Activo' : 'Inactivo'],
    ].map(([label, value]) => <div key={label} className="min-w-0 p-3 bg-neutral/50 border border-line rounded-xl"><dt className="text-muted text-[10px] font-bold uppercase tracking-wider mb-1.5">{label}</dt><dd className="font-bold break-words">{label === 'Matrícula' ? <SectionBadge positive={section.enrollmentOpen}>{value}</SectionBadge> : label === 'Estado' ? <SectionBadge positive={section.active}>{value}</SectionBadge> : value}</dd></div>)}
  </dl>;
}

export function Failure({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs shadow-sm">
    <div className="flex items-start gap-2"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0 mt-0.5" /><p className="whitespace-pre-wrap break-words font-medium leading-relaxed">{message}</p></div>
    {retry && <button type="button" className={`${secondaryButtonClass} mt-3`} onClick={retry}>Reintentar</button>}
  </div>;
}

export function SectionDialog({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    container.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div ref={container} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="section-dialog-title" aria-busy={busy}
      className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-line border-t-4 border-t-accent rounded-2xl p-5 sm:p-6 shadow-xl text-ink font-sans"
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
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3 mb-5"><h2 id="section-dialog-title" className="text-base font-bold tracking-tight">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar diálogo" className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-muted hover:bg-neutral hover:text-ink transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"><Cancel01Icon size={18} aria-hidden="true" /></button></div>
      {children}
    </div>
  </div>;
}

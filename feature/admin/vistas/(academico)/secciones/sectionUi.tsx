'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { SectionResponse } from '@/types/sectionApi';

export const buttonClass = 'px-3 py-2 rounded-lg border border-line bg-white text-xs font-bold disabled:opacity-50 hover:bg-neutral';
export const inputClass = 'px-3 py-2 rounded-lg border border-line bg-white text-sm';
export const sectionName = (name: string) => /^sección\b/i.test(name) ? name : `Sección ${name}`;

export function SectionIdentity({ section }: { section: SectionResponse }) {
  return <dl className="flex flex-wrap gap-5 text-sm">
    {[
      ['Nivel', section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'],
      ['Grado', section.grade], ['Sección', sectionName(section.name)],
      ['Capacidad', section.maxCapacity], ['Matrícula', section.enrollmentOpen ? 'Abierta' : 'Cerrada'],
      ['Estado', section.active ? 'Activo' : 'Inactivo'],
    ].map(([label, value]) => <div key={label}><dt className="text-muted text-xs">{label}</dt><dd className="font-bold">{value}</dd></div>)}
  </dl>;
}

export function Failure({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-800 text-sm">
    <p className="whitespace-pre-wrap break-words">{message}</p>
    {retry && <button className={`${buttonClass} mt-3`} onClick={retry}>Reintentar</button>}
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
  return <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
    <div ref={container} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="section-dialog-title" aria-busy={busy}
      className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-line rounded-2xl p-6 shadow-xl"
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
      <h2 id="section-dialog-title" className="text-lg font-bold mb-4">{title}</h2>
      {children}
    </div>
  </div>;
}

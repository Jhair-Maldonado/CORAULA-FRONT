import React from 'react';
import { AlertCircle, AlertTriangle, ClipboardList, ShieldAlert } from 'lucide-react';
import type { IncidentKpis } from '@/adapters/guardianIncidentsAdapter';

/** Total y conteo por gravedad del rango consultado. */
export function IncidenciasKpiBanner({ kpis }: { kpis: IncidentKpis }) {
  const items = [
    { label: 'Total', value: kpis.total, Icon: ClipboardList, tone: 'bg-neutral text-muted' },
    { label: 'Leves', value: kpis.leve, Icon: AlertCircle, tone: 'bg-success text-success-ink' },
    { label: 'Moderadas', value: kpis.moderada, Icon: AlertTriangle, tone: 'bg-canvas/50 text-warning-ink' },
    { label: 'Graves', value: kpis.grave, Icon: ShieldAlert, tone: 'bg-accent-soft text-accent' },
  ];
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Resumen de incidencias">
      {items.map(({ label, value, Icon, tone }) => (
        <div key={label} className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-0.5 text-2xl font-black text-ink">{value}</p>
          </div>
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} aria-hidden="true" /></span>
        </div>
      ))}
    </div>
  );
}

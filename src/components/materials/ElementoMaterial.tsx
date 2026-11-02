'use client';

import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import type { ClassMaterial } from '@/types/teacherMaterialsApi';

// One class material (BACK #53) as listed to the teacher (FRONT #52) and to management.
// Actions (download, withdraw) are provided by each view.
const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const formatLabel: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
};

export default function ElementoMaterial({ material: m, actions }: { material: ClassMaterial; actions?: ReactNode }) {
  return <li className={`p-3 rounded-lg border text-xs ${m.status === 'RETIRADO' ? 'border-line bg-neutral/30' : 'border-line bg-white'}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-bold text-sm text-ink break-words"><FileText size={14} aria-hidden="true" />{m.title}</p>
        <p className="text-muted mt-1">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.status === 'RETIRADO' ? 'bg-neutral text-muted border-line' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{m.status === 'RETIRADO' ? 'Retirado' : 'Publicado'}</span>
          {' '}{formatLabel[m.file.mimeType] ?? m.file.mimeType} · {size(m.file.sizeBytes)} · {m.authorTeacherName} · <time dateTime={m.publishedAt}>{dateTime.format(new Date(m.publishedAt))}</time>
        </p>
        <p className="text-[11px] text-muted font-mono mt-1 break-all">{m.file.originalName}</p>
        {m.description && <p className="text-muted mt-1 whitespace-pre-line break-words">{m.description}</p>}
        {m.status === 'RETIRADO' && <p className="mt-1 text-amber-800">Retirado{m.withdrawnAt && <> el <time dateTime={m.withdrawnAt}>{dateTime.format(new Date(m.withdrawnAt))}</time></>}. Motivo: {m.withdrawalReason}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  </li>;
}

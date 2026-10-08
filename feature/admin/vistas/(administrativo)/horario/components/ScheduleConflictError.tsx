import type { ScheduleError } from '@/services/admin/schedulesService';
import { AlertCircleIcon } from 'hugeicons-react';
import { buttonClass } from './scheduleUi';

export default function ScheduleConflictError({ error, retry }: { error: ScheduleError; retry?: () => void }) {
  return <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs break-words shadow-sm">
    <p className="flex items-start gap-2 font-bold leading-relaxed"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0 mt-0.5" />{error.message}</p>
    {error.details.length > 0 && <ul className="list-disc pl-5 mt-2 space-y-1">{error.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}
    {retry && <button className={`${buttonClass} mt-3`} onClick={retry}>Reintentar</button>}
  </div>;
}

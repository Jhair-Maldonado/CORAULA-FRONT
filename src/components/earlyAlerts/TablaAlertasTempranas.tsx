'use client';

import { formatIsoDate } from '@/lib/gradeWindowContract';
import type { EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';

// Table and pagination of early alerts, shared by the teacher (FRONT #107) and management views.
// Values are the ones recorded at detection.
export const earlyAlertsButtonClass = 'min-h-10 px-3 py-2 rounded-lg bg-white border border-line text-xs font-bold hover:bg-neutral focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';
const paFormat = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const detectedFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

export default function TablaAlertasTempranas({ data, caption, showCourse = false, onPageChange }: {
  data: EarlyWarningsPage;
  caption: string;
  /** Management lists several courses: adds the Curso and Sección columns. */
  showCourse?: boolean;
  onPageChange: (page: number) => void;
}) {
  return <>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead><tr className="border-b border-line text-muted uppercase tracking-wider">
          <th scope="col" className="py-2 pr-3">Código</th>
          <th scope="col" className="py-2 pr-3">Alumno</th>
          {showCourse && <th scope="col" className="py-2 pr-3">Curso</th>}
          {showCourse && <th scope="col" className="py-2 pr-3">Sección</th>}
          <th scope="col" className="py-2 pr-3 text-center">PA al detectarse</th>
          <th scope="col" className="py-2 pr-3 text-center">Actividades</th>
          <th scope="col" className="py-2 pr-3">Fecha de evaluación</th>
          <th scope="col" className="py-2">Detectada</th>
        </tr></thead>
        <tbody className="divide-y divide-line">
          {data.content.map(alert => <tr key={alert.alertId}>
            <td className="py-2 pr-3 text-muted">{alert.studentCode ?? 'Sin código'}</td>
            <th scope="row" className="py-2 pr-3 font-bold text-ink">{alert.fullName}</th>
            {showCourse && <td className="py-2 pr-3">{alert.courseName}</td>}
            {showCourse && <td className="py-2 pr-3">{alert.sectionName}</td>}
            <td className="py-2 pr-3 text-center font-bold text-rose-700">{paFormat.format(alert.paAtDetection)}</td>
            <td className="py-2 pr-3 text-center">{alert.activityCount}</td>
            <td className="py-2 pr-3"><time dateTime={alert.evaluatedOn}>{formatIsoDate(alert.evaluatedOn)}</time></td>
            <td className="py-2"><time dateTime={alert.detectedAt}>{detectedFormat.format(new Date(alert.detectedAt))}</time></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <nav aria-label="Paginación de alertas" className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span>{data.totalElements} {data.totalElements === 1 ? 'alerta' : 'alertas'} · Página {Math.min(data.page + 1, Math.max(data.totalPages, 1))} de {Math.max(data.totalPages, 1)}</span>
      <span className="flex gap-2">
        <button type="button" className={earlyAlertsButtonClass} disabled={data.page === 0} onClick={() => onPageChange(Math.max(0, data.page - 1))}>Anterior</button>
        <button type="button" className={earlyAlertsButtonClass} disabled={data.page + 1 >= data.totalPages} onClick={() => onPageChange(data.page + 1)}>Siguiente</button>
      </span>
    </nav>
  </>;
}

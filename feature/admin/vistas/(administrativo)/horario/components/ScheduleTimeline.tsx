import type { ScheduleResponse, SchoolDay } from '@/types/scheduleApi';
import { Clock01Icon, UserIcon, School01Icon, Calendar01Icon } from 'hugeicons-react';
import { SCHOOL_DAYS, buttonClass } from './scheduleUi';

export default function ScheduleTimeline({ blocks, day, onSelect }: { blocks: ScheduleResponse[]; day: SchoolDay | ''; onSelect: (block: ScheduleResponse) => void }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
    {SCHOOL_DAYS.filter(item => !day || item.value === day).map(item => <section key={item.value} aria-label={item.label} className="min-w-0 bg-white border border-line rounded-xl p-3 shadow-sm">
      <h2 className="font-bold text-xs uppercase tracking-wider border-b border-line pb-3 mb-3 flex items-center gap-2"><Calendar01Icon size={15} aria-hidden="true" className="text-accent" />{item.label}</h2>
      <ol className="space-y-3">{blocks.filter(block => block.day === item.value).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id).map(block => <li key={block.id}>
        <button onClick={() => onSelect(block)} className={`${buttonClass} w-full min-w-0 text-left bg-white border-l-4 border-l-accent shadow-sm hover:shadow-md hover:border-accent/40 hover:bg-neutral/50 cursor-pointer flex flex-col gap-2.5 group`}>
          <span className="font-bold text-ink leading-snug break-words group-hover:text-accent transition-colors">{block.courseName}</span>
          <span className="flex items-center gap-1.5 text-accent"><Clock01Icon size={14} aria-hidden="true" className="shrink-0" />{block.startTime} – {block.endTime}</span>
          <span className={`flex items-start gap-1.5 text-[11px] font-medium break-words border-t border-line pt-2 ${block.teacherName === null ? 'text-muted' : 'text-ink'}`}><UserIcon size={14} aria-hidden="true" className="shrink-0 text-muted" />{block.teacherName ?? 'Sin docente asignado'}</span>
          <span className="flex items-start gap-1.5 text-[11px] font-medium text-muted break-words"><School01Icon size={14} aria-hidden="true" className="shrink-0" />{block.classroom ?? 'Sin aula'}</span>
        </button>
      </li>)}</ol>
      {!blocks.some(block => block.day === item.value) && <div className="rounded-xl border border-dashed border-line bg-neutral/40 py-6 px-3 text-center flex flex-col items-center gap-2"><Clock01Icon size={22} aria-hidden="true" className="text-muted" /><p className="text-xs font-bold text-ink">Sin clases</p><p className="text-[11px] text-muted">Sin bloques programados para este día.</p></div>}
    </section>)}
  </div>;
}

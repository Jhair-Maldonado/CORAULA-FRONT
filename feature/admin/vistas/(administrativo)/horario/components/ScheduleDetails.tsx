import type { ScheduleResponse } from '@/types/scheduleApi';
import { BookOpen01Icon, Calendar01Icon, Clock01Icon, UserIcon, School01Icon, PencilEdit01Icon, Delete01Icon } from 'hugeicons-react';
import ScheduleDialog from './ScheduleDialog';
import { buttonClass, dayLabel } from './scheduleUi';

export default function ScheduleDetails({ block, onClose, onEdit, onDelete }: { block: ScheduleResponse; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  return <ScheduleDialog title="Detalle del bloque" onClose={onClose}>
    <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0"><BookOpen01Icon size={20} aria-hidden="true" /></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-muted">Curso</p><h3 className="font-bold text-base leading-snug break-words mt-1">{block.courseName}</h3></div></div>
    <dl className="flex flex-col gap-3 text-xs">
      <div className="rounded-xl bg-neutral/50 border border-line p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5"><Calendar01Icon size={14} aria-hidden="true" />Día y horario</dt><dd className="font-bold mt-2">{dayLabel(block.day)}</dd><dd className="flex items-center gap-1.5 text-accent font-bold mt-1"><Clock01Icon size={14} aria-hidden="true" />{block.startTime} – {block.endTime}</dd></div>
      <div className="rounded-xl bg-accent-soft/40 border border-line p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5"><UserIcon size={14} aria-hidden="true" />Docente</dt><dd className={`font-bold mt-1 break-words ${block.teacherName === null ? 'text-muted' : 'text-ink'}`}>{block.teacherName ?? 'Sin docente asignado'}</dd></div>
      <div className="rounded-xl bg-neutral/50 border border-line p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5"><School01Icon size={14} aria-hidden="true" />Aula</dt><dd className="font-bold mt-1 break-words">{block.classroom ?? 'Sin aula'}</dd></div>
    </dl>
    <div className="flex flex-wrap gap-2 justify-end border-t border-line mt-5 pt-4">
      <button className={buttonClass} onClick={onClose}>Cerrar</button>
      <button className={`${buttonClass} text-rose-700 flex items-center gap-1.5`} onClick={onDelete}><Delete01Icon size={15} aria-hidden="true" />Eliminar</button>
      <button className={`${buttonClass} bg-accent text-white shadow-sm flex items-center gap-1.5`} onClick={onEdit}><PencilEdit01Icon size={15} aria-hidden="true" />Editar</button>
    </div>
  </ScheduleDialog>;
}

import type { CSSProperties } from 'react';
import type { ScheduleResponse } from '@/types/scheduleApi';
import { GRID_ROWS_PER_HOUR, type GridBlock, type ScheduleGridModel } from '@/types/scheduleGrid';
import { SCHEDULE_PALETTE } from './scheduleUi';

/** Alto de una hora: 3,5 rem = 56 px (h-14). Cada fila de 5 minutos mide 1/12 de hora. */
const HOUR_REM = 3.5;
const rem = (rows: number) => `${(rows * HOUR_REM) / GRID_ROWS_PER_HOUR}rem`;

/** Líneas tenues cada 15 minutos y marcadas cada hora; solo con tokens de globals.css. */
const guideLines: CSSProperties = {
  backgroundImage: [
    `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR_REM}rem)`,
    `repeating-linear-gradient(to bottom, color-mix(in srgb, var(--line) 45%, transparent) 0, color-mix(in srgb, var(--line) 45%, transparent) 1px, transparent 1px, transparent ${HOUR_REM / 4}rem)`,
  ].join(', '),
};

/**
 * Cuánto texto cabe en un bloque según su duración (1 hora = 56 px; el botón mide 2 px menos que su fila por el `py-px` del `li`).
 * Alturas de línea con `leading-tight` (1,25): nombre 11 px = 13,75; hora y docente 10 px = 12,5; insignia de aula = 9 + 2 + 2 = 13; separación 2.
 * - compact (< 60 min), `p-1`: 45 min = 40 px de botón, 30 de contenido; nombre + hora y aula en una línea = 13,75 + 2 + 12,5 = 28,25.
 * - medium (60 a 89 min), `p-2`: 60 min = 54 px, 36 de contenido; igual que compact, 28,25. Se oculta el docente: con él serían 43.
 * - full (>= 90 min), `p-2`: 90 min = 82 px, 64 de contenido; nombre + hora + docente + insignia = 13,75 + 12,5 + 12,5 + 13 + 3 x 2 = 57,75.
 * El docente de los niveles reducidos sigue en el `aria-label` y en el detalle.
 */
export type BlockDetail = 'compact' | 'medium' | 'full';
export function detailLevel(block: Pick<GridBlock, 'startMinute' | 'endMinute'>): BlockDetail {
  const minutes = block.endMinute - block.startMinute;
  return minutes < 60 ? 'compact' : minutes < 90 ? 'medium' : 'full';
}

const room = (block: GridBlock) => <span className="inline-block max-w-full truncate px-1.5 py-px rounded-full border border-current/40 text-[9px] leading-none font-bold">{block.classroom ?? 'Sin aula'}</span>;

function blockStyle(block: GridBlock): CSSProperties {
  return {
    top: rem(block.rowStart - 1), height: rem(block.rowSpan),
    left: `${(block.lane / block.lanes) * 100}%`, width: `${100 / block.lanes}%`,
  };
}

/**
 * Grilla semanal del horario: horas en filas y un día por columna. Cada bloque es un botón que abre su detalle.
 * Recibe el modelo ya calculado por `toScheduleGrid`; no consulta datos.
 */
export default function ScheduleGrid({ grid, onSelect }: { grid: ScheduleGridModel; onSelect: (block: ScheduleResponse) => void }) {
  const columns = `6rem repeat(${grid.days.length}, minmax(0, 1fr))`;
  return <div role="region" aria-label="Horario semanal" tabIndex={0} className="overflow-x-auto bg-white border border-line rounded-xl shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
    <div className="min-w-[760px]">
      <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
        <div className="bg-neutral/60 py-3 px-2 text-[9px] font-bold uppercase tracking-wider text-muted text-center">Hora</div>
        {grid.days.map(column => <h2 key={column.day} id={`schedule-day-${column.day}`} className="bg-neutral/60 py-3 px-2 text-[9px] font-bold uppercase tracking-wider text-ink text-center border-l border-line">{column.label}</h2>)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: columns }}>
        <div aria-hidden="true" className="text-[10px] font-semibold text-muted">
          {grid.hours.map(hour => <div key={hour.label} className="h-14 px-2 pt-1 text-right">{hour.label}</div>)}
        </div>
        {grid.days.map(column => <section key={column.day} aria-labelledby={`schedule-day-${column.day}`} className="relative border-l border-line min-w-0">
          <ol className="relative" style={{ ...guideLines, height: rem(grid.rows) }}>
            {column.blocks.map(block => { const detail = detailLevel(block); return <li key={block.id} className="absolute px-0.5 py-px" data-detail={detail} style={blockStyle(block)}>
              <button type="button" aria-label={block.ariaLabel} onClick={() => onSelect(block.source)}
                className={`${SCHEDULE_PALETTE[block.colorIndex]} relative focus-visible:z-10 h-full w-full min-w-0 overflow-hidden text-left leading-tight rounded-xl ${detail === 'compact' ? 'p-1' : 'p-2'} border shadow-xs hover:brightness-105 transition cursor-pointer flex flex-col gap-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}>
                <span className="block truncate text-[11px] font-bold">{block.courseName}</span>
                {detail === 'full'
                  ? <>
                    <span className="block truncate text-[10px] font-semibold">{block.startTime} – {block.endTime}</span>
                    <span className="block truncate text-[10px] font-medium">{block.teacherName ?? 'Sin docente asignado'}</span>
                    <span className="flex min-w-0 text-[9px] leading-none">{room(block)}</span>
                  </>
                  : <span className="block truncate text-[10px] font-semibold">{block.startTime} – {block.endTime} · {block.classroom ?? 'Sin aula'}</span>}
              </button>
            </li>; })}
          </ol>
        </section>)}
      </div>
    </div>
  </div>;
}

'use client';

import React from 'react';
import { ResumenDashboardPadre } from '@/types/padre';

interface TabHorarioProps {
  resumen: ResumenDashboardPadre;
}

export function TabHorario({ resumen }: TabHorarioProps) {
  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-black text-ink uppercase tracking-wider">Horario Semanal</h3>
        <span className="text-[9px] font-bold bg-neutral text-muted px-2 py-1 rounded-md border border-line">
          Sección {resumen.hijo[0].seccion}
        </span>
      </div>
      
      <div className="overflow-x-auto border border-line rounded-xl bg-neutral shadow-sm">
        <table className="w-full text-left min-w-[500px]">
          <thead>
            <tr className="bg-white border-b border-line">
              <th className="p-2 text-[9px] font-bold text-muted uppercase tracking-wider w-16 text-center border-r border-line">Hora</th>
              <th className="p-2 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line">Lun</th>
              <th className="p-2 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line">Mar</th>
              <th className="p-2 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line">Mié</th>
              <th className="p-2 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line">Jue</th>
              <th className="p-2 text-[9px] font-bold text-muted uppercase tracking-wider text-center">Vie</th>
            </tr>
          </thead>
          <tbody className="text-[10px] font-medium text-ink">
            {[
              { time: '08:00', blocks: ['Matemáticas', 'Comunicación', 'Ciencias', 'Historia', 'Inglés'], bg: 'bg-accent-soft/30' },
              { time: '09:30', blocks: ['Comunicación', 'Ciencias', 'Inglés', 'Educ. Física', 'Matemáticas'], bg: 'bg-success/30' },
              { time: '11:00', blocks: ['RECREO', 'RECREO', 'RECREO', 'RECREO', 'RECREO'], bg: 'bg-[#FEF3C7] text-warning-ink font-bold text-center border-y border-[#FDE68A]' },
              { time: '11:30', blocks: ['Historia', 'Matemáticas', 'Arte', 'Ciencias', 'Tutoría'], bg: 'bg-accent-soft/30' },
            ].map((row, rIdx) => (
              <tr key={rIdx} className={`border-b border-line ${row.bg}`}>
                <td className="p-2 text-[9px] font-bold text-muted text-center border-r border-line bg-white">
                  {row.time}
                </td>
                {row.blocks.map((block, cIdx) => (
                  <td key={cIdx} className={`p-2 text-center border-r border-line ${block === 'RECREO' ? '' : 'cursor-pointer hover:font-bold hover:text-ink transition-colors'}`}>
                    {block}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

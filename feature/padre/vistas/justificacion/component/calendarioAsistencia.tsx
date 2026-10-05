import React from 'react';
import { Calendar01Icon, CheckmarkCircle01Icon, Clock01Icon, PlusSignIcon } from 'hugeicons-react';

interface DiaCalendario {
  dia: number;
  estado: string;
}

interface CalendarioAsistenciaProps {
  calendario: DiaCalendario[];
  onJustificarDia: (dia: number) => void;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarioAsistencia({ calendario, onJustificarDia }: CalendarioAsistenciaProps) {
  return (
    <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b border-line flex items-center justify-between bg-neutral/30">
        <h3 className="text-[11px] font-black text-ink uppercase tracking-wider flex items-center gap-2">
          <Calendar01Icon size={14} className="text-accent" />
          Mayo 2026
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-[8px] font-bold">
          <span className="flex items-center gap-1 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Asistió</span>
          <span className="flex items-center gap-1 text-amber-500"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Tardanza</span>
          <span className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500"></div> Falta</span>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[8px] font-black text-muted uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-[280px]">
          {/* Espacios vacíos al inicio (Ej. 4 días porque empieza viernes) */}
          {Array.from({length: 4}).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 rounded-lg"></div>
          ))}

          {calendario.map((d) => {
            let bgColor = 'bg-white';
            let content = null;
            let requiresJustification = false;

            if (d.estado === 'fin_semana') {
              bgColor = 'bg-slate-50';
            } else if (d.estado === 'futuro') {
              bgColor = 'bg-white';
            } else if (d.estado === 'asistio') {
              bgColor = 'bg-emerald-50/30';
              content = (
                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                  <CheckmarkCircle01Icon size={32} className="text-emerald-500" />
                </div>
              );
            } else if (d.estado.includes('tardanza')) {
              bgColor = 'bg-amber-50/30';
              const isJustificada = d.estado === 'tardanza_justificada';
              requiresJustification = !isJustificada;
              
              content = (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-[3px] shadow-sm flex items-center justify-center ${isJustificada ? 'bg-amber-400 border-white text-white' : 'bg-amber-500 border-red-200 text-white animate-pulse'}`}>
                      <Clock01Icon size={16} />
                    </div>
                    {!isJustificada ? (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-black border border-white">!</div>
                    ) : (
                      <div className="absolute -bottom-1 -right-1 text-emerald-600 bg-white rounded-full">
                        <CheckmarkCircle01Icon size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            } else if (d.estado.includes('falta')) {
              bgColor = 'bg-red-50/30';
              const isJustificada = d.estado === 'falta_justificada';
              requiresJustification = !isJustificada;

              content = (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    <div className={`flex items-center justify-center px-2 py-1 rounded-md text-white font-black text-[10px] rotate-[-15deg] shadow-sm uppercase tracking-tighter ${isJustificada ? 'bg-red-400' : 'bg-red-600 border border-red-700'}`}>
                      FALTA
                    </div>
                    {!isJustificada ? (
                      <div className="absolute -top-3 -right-3 w-5 h-5 bg-red-700 rounded-full flex items-center justify-center text-white text-[11px] font-black border border-white animate-bounce">!</div>
                    ) : (
                      <div className="absolute -bottom-2 -right-2 text-emerald-600 bg-white rounded-full shadow-sm">
                        <CheckmarkCircle01Icon size={16} />
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={d.dia} 
                className={`group relative border border-line rounded-lg p-2 flex flex-col ${bgColor} hover:border-muted transition-colors overflow-hidden h-full min-h-[70px]`}
              >
                <span className={`text-[11px] font-bold z-10 ${
                  d.estado === 'fin_semana' ? 'text-muted' : 
                  d.estado === 'futuro' ? 'text-slate-300' : 'text-ink'
                }`}>{d.dia}</span>
                {content}

                {requiresJustification && (
                  <div className="absolute inset-0 bg-ink/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                      onClick={() => onJustificarDia(d.dia)}
                      className="bg-white text-ink text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm hover:bg-neutral transition-colors flex items-center gap-1"
                    >
                      <PlusSignIcon size={10} /> Justificar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

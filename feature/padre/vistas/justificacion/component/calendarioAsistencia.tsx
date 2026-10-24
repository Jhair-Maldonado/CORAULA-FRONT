import React from 'react';
import { Calendar01Icon, CheckmarkCircle01Icon, Clock01Icon, PlusSignIcon, ArrowLeft01Icon, ArrowRight01Icon } from 'hugeicons-react';

interface DiaCalendario {
  dia: number;
  estado: string;
  hora?: string;
}

interface CalendarioAsistenciaProps {
  calendario: DiaCalendario[];
  mesActual: string;
  onPrevMes: () => void;
  onNextMes: () => void;
  canPrev: boolean;
  canNext: boolean;
  onJustificarDia: (dia: number) => void;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarioAsistencia({ 
  calendario, 
  mesActual,
  onPrevMes,
  onNextMes,
  canPrev,
  canNext,
  onJustificarDia 
}: CalendarioAsistenciaProps) {
  return (
    <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b border-line flex items-center justify-between bg-neutral/30">
        <div className="flex items-center gap-3">
          <button 
            onClick={onPrevMes} 
            disabled={!canPrev}
            className="p-1 rounded-md text-muted hover:bg-white hover:text-ink disabled:opacity-30 transition-colors"
          >
            <ArrowLeft01Icon size={16} />
          </button>
          
          <h3 className="text-[11px] font-black text-ink uppercase tracking-wider flex items-center gap-2 min-w-[120px] justify-center">
            <Calendar01Icon size={14} className="text-accent" />
            {mesActual}
          </h3>

          <button 
            onClick={onNextMes} 
            disabled={!canNext}
            className="p-1 rounded-md text-muted hover:bg-white hover:text-ink disabled:opacity-30 transition-colors"
          >
            <ArrowRight01Icon size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
          <span className="flex items-center gap-1 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Asistió</span>
          <span className="flex items-center gap-1 text-amber-500"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Tardanza</span>
          <span className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500"></div> Falta</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[10px] font-black text-muted uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2 flex-1 min-h-[400px]">
          {/* Espacios vacíos al inicio (Ej. 4 días porque empieza viernes) */}
          {Array.from({length: 4}).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 rounded-xl"></div>
          ))}

          {calendario.map((d) => {
            let bgColor = 'bg-white';
            let content = null;
            let requiresJustification = false;

            if (d.estado === 'fin_semana') {
              bgColor = 'bg-slate-50 border border-slate-100';
            } else if (d.estado === 'futuro') {
              bgColor = 'bg-white border border-line/50';
            } else if (d.estado === 'asistio') {
              bgColor = 'bg-emerald-50/30 border border-emerald-100';
              content = (
                <div className="flex flex-col items-center justify-center mt-2 z-10">
                  <span className="text-[12px] font-black text-emerald-700">{d.hora}</span>
                  <CheckmarkCircle01Icon size={14} className="text-emerald-500 mt-1" />
                </div>
              );
            } else if (d.estado.includes('tardanza')) {
              bgColor = 'bg-amber-50/30 border border-amber-100';
              const isJustificada = d.estado === 'tardanza_justificada';
              requiresJustification = !isJustificada;
              
              content = (
                <div className="flex flex-col items-center justify-center mt-2 z-10">
                  <span className="text-[12px] font-black text-amber-700">{d.hora}</span>
                  <div className="relative mt-1">
                    <Clock01Icon size={14} className="text-amber-500" />
                    {!isJustificada && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full flex items-center justify-center text-white text-[7px] font-black border border-white">!</div>
                    )}
                  </div>
                </div>
              );
            } else if (d.estado.includes('falta')) {
              bgColor = 'bg-red-50/30 border border-red-100';
              const isJustificada = d.estado === 'falta_justificada';
              requiresJustification = !isJustificada;

              content = (
                <div className="flex flex-col items-center justify-center mt-2 z-10 opacity-70">
                  <span className="text-[11px] font-bold text-red-700 uppercase">{isJustificada ? 'Falta Just.' : 'Falta'}</span>
                  <div className="relative mt-1">
                     {!isJustificada && (
                       <div className="w-3 h-3 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] font-black">!</div>
                     )}
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={d.dia} 
                className={`group relative rounded-xl p-2 flex flex-col items-center hover:shadow-sm transition-all duration-200 overflow-hidden min-h-[80px] ${bgColor}`}
              >
                <span className={`text-[12px] font-bold ${
                  d.estado === 'fin_semana' ? 'text-[#9CA3AF]' : 
                  d.estado === 'futuro' ? 'text-[#D1D5DB]' : 'text-[#111827]'
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

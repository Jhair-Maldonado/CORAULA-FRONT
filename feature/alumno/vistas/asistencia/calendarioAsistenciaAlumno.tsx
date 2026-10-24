import React from 'react';
import { Calendar01Icon, CheckmarkCircle01Icon, Clock01Icon, Alert01Icon, ArrowLeft01Icon, ArrowRight01Icon } from 'hugeicons-react';
import { RegistroAsistenciaAlumno } from '@/types/alumno';

interface CalendarioAsistenciaAlumnoProps {
  marcaciones: RegistroAsistenciaAlumno[];
  mesActual: string;
  onPrevMes: () => void;
  onNextMes: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarioAsistenciaAlumno({ 
  marcaciones, 
  mesActual,
  onPrevMes,
  onNextMes,
  canPrev,
  canNext
}: CalendarioAsistenciaAlumnoProps) {
  // Para propósitos de la demostración, asumiendo que todos los meses empiezan en Martes (1 espacio) y tienen 30 días
  // En un caso real se calcularía según el mes y año real.
  const DIAS_EN_MES = 30;
  const ESPACIOS_INICIALES = 1;

  const calendarioDias = Array.from({ length: DIAS_EN_MES }, (_, i) => {
    const diaNum = i + 1;
    const marcacion = marcaciones.find(m => {
      const match = m.fecha.match(/\d{2}/);
      return match ? parseInt(match[0], 10) === diaNum : false;
    });

    const isFinSemana = (diaNum + ESPACIOS_INICIALES) % 7 === 6 || (diaNum + ESPACIOS_INICIALES) % 7 === 0;

    return {
      dia: diaNum,
      isFinSemana,
      marcacion
    };
  });

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <button 
            onClick={onPrevMes} 
            disabled={!canPrev}
            className="p-1 rounded-md text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827] disabled:opacity-30 transition-colors"
          >
            <ArrowLeft01Icon size={16} />
          </button>
          
          <h3 className="text-[11px] font-black text-[#111827] uppercase tracking-wider flex items-center gap-2 min-w-[120px] justify-center">
            <Calendar01Icon size={14} className="text-[#BE123C]" />
            {mesActual}
          </h3>

          <button 
            onClick={onNextMes} 
            disabled={!canNext}
            className="p-1 rounded-md text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827] disabled:opacity-30 transition-colors"
          >
            <ArrowRight01Icon size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[8px] font-bold">
          <span className="flex items-center gap-1 text-[#15803D]"><div className="w-2 h-2 rounded-full bg-[#15803D]"></div> Puntual</span>
          <span className="flex items-center gap-1 text-[#BE123C]"><div className="w-2 h-2 rounded-full bg-[#BE123C]"></div> Tardanza</span>
          <span className="flex items-center gap-1 text-[#4B5563]"><div className="w-2 h-2 rounded-full bg-[#E5E7EB]"></div> Justificada</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[10px] font-black text-[#6B7280] uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2 flex-1 min-h-[400px]">
          {/* Espacios vacíos al inicio */}
          {Array.from({length: ESPACIOS_INICIALES}).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/30 rounded-xl"></div>
          ))}

          {calendarioDias.map((d) => {
            let bgColor = 'bg-white';
            let content = null;

            if (d.isFinSemana) {
              bgColor = 'bg-slate-50 border border-slate-100';
            } else if (!d.marcacion) {
              bgColor = 'bg-white border border-[#E5E7EB]/50';
            } else {
              const isPuntual = d.marcacion.estado === 'Puntual';
              const isTardanza = d.marcacion.estado === 'Tardanza';
              const isJustificada = d.marcacion.estado === 'Justificada';

              if (isPuntual) {
                bgColor = 'bg-[#DCFCE7]/30 border border-[#DCFCE7]';
                content = (
                  <div className="flex flex-col items-center justify-center mt-2">
                    <span className="text-[12px] font-black text-[#15803D]">{d.marcacion.hora}</span>
                    <CheckmarkCircle01Icon size={14} className="text-[#15803D] mt-1" />
                  </div>
                );
              } else if (isTardanza) {
                bgColor = 'bg-[#FFE4E6]/30 border border-[#FFE4E6]';
                content = (
                  <div className="flex flex-col items-center justify-center mt-2">
                    <span className="text-[12px] font-black text-[#BE123C]">{d.marcacion.hora}</span>
                    <Clock01Icon size={14} className="text-[#BE123C] mt-1" />
                  </div>
                );
              } else if (isJustificada) {
                bgColor = 'bg-slate-50 border border-[#E5E7EB]';
                content = (
                  <div className="flex flex-col items-center justify-center mt-2 opacity-60">
                    <span className="text-[12px] font-bold text-[#4B5563]">Justif.</span>
                    <Alert01Icon size={14} className="text-[#4B5563] mt-1" />
                  </div>
                );
              }
            }

            return (
              <div 
                key={d.dia} 
                className={`group relative rounded-xl p-2 flex flex-col items-center hover:shadow-sm transition-all duration-200 overflow-hidden min-h-[80px] ${bgColor}`}
              >
                <span className={`text-[12px] font-bold ${
                  d.isFinSemana ? 'text-[#9CA3AF]' : 
                  !d.marcacion ? 'text-[#D1D5DB]' : 'text-[#111827]'
                }`}>{d.dia}</span>
                {content}
                
                {d.marcacion && (
                  <div className="absolute inset-x-0 bottom-0 py-1 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[8px] text-white text-center font-medium px-1 truncate">
                      {d.marcacion.observacion}
                    </p>
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

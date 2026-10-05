import React from 'react';

interface CardJustificacionProps {
  item: {
    id: string;
    fecha: string;
    tipoIncidencia: string;
    estado: string;
    motivo: string;
    detalle: string;
  };
  onJustificar: (dia: number) => void;
}

export function CardJustificacion({ item, onJustificar }: CardJustificacionProps) {
  const esInjustificada = item.estado === 'Falta Justificar';

  return (
    <div className={`border rounded-xl p-3 shadow-sm transition-colors bg-white ${
      esInjustificada ? 'border-red-300 bg-red-50/50' : 'border-line hover:border-muted'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black text-ink">{item.fecha}</span>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
          item.estado === 'Aprobada' ? 'bg-emerald-100 text-emerald-700' : 
          item.estado === 'Rechazada' ? 'bg-amber-100 text-amber-700' : 
          'bg-red-600 text-white animate-pulse'
        }`}>
          {item.estado}
        </span>
      </div>
      
      <div className="mb-2 flex items-center gap-1">
        <span className={`text-xs font-bold uppercase ${
          item.tipoIncidencia.includes('Falta') ? 'text-red-500' : 'text-amber-500'
        }`}>
          • {item.tipoIncidencia}
        </span>
      </div>

      {!esInjustificada && (
        <h4 className="text-sm font-black text-ink leading-tight mb-1">{item.motivo}</h4>
      )}
      
      <p className={`text-xs font-medium leading-relaxed ${esInjustificada ? 'text-red-800' : 'text-muted'}`}>
        {item.detalle}
      </p>

      {esInjustificada && (
        <button 
          onClick={() => onJustificar(parseInt(item.fecha.split(' ')[0]))}
          className="mt-3 w-full py-2 bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider rounded-lg border border-red-200 hover:bg-red-200 transition-colors"
        >
          Justificar Ahora
        </button>
      )}
    </div>
  );
}

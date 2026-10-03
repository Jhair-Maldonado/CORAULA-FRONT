import React from 'react';
import { FingerPrintIcon, CheckmarkBadge01Icon } from 'hugeicons-react';

interface CardGradoHuellaProps {
  id: string;
  nombre: string;
  totalAlumnos: number;
  totalRegistrados: number;
  onClick: () => void;
}

export const CardGradoHuella: React.FC<CardGradoHuellaProps> = ({
  nombre,
  totalAlumnos,
  totalRegistrados,
  onClick,
}) => {
  const percentage = Math.round((totalRegistrados / totalAlumnos) * 100);
  const isComplete = totalRegistrados === totalAlumnos;

  return (
    <button
      onClick={onClick}
      className="flex flex-col p-3 rounded-xl border border-line hover:border-accent/40 bg-white shadow-xs hover:shadow-sm transition-all text-left group"
    >
      <div className="flex justify-between items-center w-full mb-2">
        <h3 className="font-bold text-xs text-ink group-hover:text-accent transition-colors leading-tight truncate mr-2">
          {nombre}
        </h3>
        {isComplete ? (
          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckmarkBadge01Icon size={12} />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
            <FingerPrintIcon size={12} />
          </div>
        )}
      </div>
      
      <div className="w-full bg-neutral rounded-full h-1.5 mb-1.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-accent'}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center w-full text-[9px] font-bold">
        <span className="text-muted uppercase tracking-wider">Registrados</span>
        <span className={isComplete ? 'text-emerald-600' : 'text-ink'}>
          {totalRegistrados} / {totalAlumnos}
        </span>
      </div>
    </button>
  );
};

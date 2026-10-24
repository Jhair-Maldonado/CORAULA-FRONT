'use client';

import React from 'react';
import Image from 'next/image';
import { CheckmarkBadge01Icon } from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';

export function ChildSelectorCards() {
  const { hijos, selectedHijoId, setSelectedHijoId } = usePadre();

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
      {hijos.map((hijo) => {
        const isSelected = hijo.id === selectedHijoId;
        return (
          <button
            key={hijo.id}
            onClick={() => setSelectedHijoId(hijo.id)}
            className={`relative flex items-center gap-3 p-3 pr-6 rounded-2xl border transition-all text-left shrink-0 min-w-[240px]
              ${isSelected 
                ? 'bg-ink border-ink shadow-md transform scale-[1.02]' 
                : 'bg-white border-line shadow-sm hover:border-muted hover:bg-neutral'
              }`}
          >
            {/* Indicador de selección */}
            {isSelected && (
              <div className="absolute top-3 right-3 text-success-ink">
                <CheckmarkBadge01Icon size={18} />
              </div>
            )}
            
            {/* Avatar */}
            {hijo.fotoUrl ? (
              <div className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 ${isSelected ? 'border-ink' : 'border-line'}`}>
                <Image src={hijo.fotoUrl} alt={hijo.nombres} fill className="object-cover" />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0
                ${isSelected ? 'bg-ink text-white' : 'bg-neutral text-muted'}
              `}>
                {hijo.nombres.charAt(0)}
              </div>
            )}
            
            {/* Info */}
            <div className="min-w-0">
              <h3 className={`font-bold text-[11px] truncate ${isSelected ? 'text-white' : 'text-ink'}`}>
                {hijo.nombres.split(' ')[0]} {hijo.apellidos.split(' ')[0]}
              </h3>
              <p className={`text-[10px] font-semibold truncate ${isSelected ? 'text-muted' : 'text-muted'}`}>
                {hijo.grado} &quot;{hijo.seccion}&quot;
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// src/components/padres/PadreHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Notification01Icon,
  Calendar01Icon,
  ArrowDown01Icon,
} from 'hugeicons-react';
import { usePadre } from './PadreContext';

export const PadreHeader: React.FC = () => {
  const { hijos, selectedHijoId, setSelectedHijoId, selectedHijo } = usePadre();

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left side: Context and Child Selector */}
      <div className="flex items-center gap-3 pl-12 md:pl-0">
        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#BE123C]">
            ESTUDIANTE SELECCIONADO
          </span>
          <span className="text-xs text-[#6B7280]">
            Viendo información académica de:
          </span>
        </div>

        {/* Dropdown Selector for Children */}
        {hijos.length > 0 && (
          <div className="relative inline-block">
            <div className="flex items-center gap-2 p-1.5 sm:px-3 bg-slate-100/80 hover:bg-slate-200/70 border border-[#E5E7EB] rounded-xl transition-all cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-[#BE123C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {selectedHijo ? selectedHijo.nombres.charAt(0) : 'E'}
              </div>
              <select
                aria-label="Seleccionar estudiante a cargo"
                value={selectedHijoId}
                onChange={(e) => setSelectedHijoId(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-[#111827] focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                {hijos.map((hijo) => (
                  <option key={hijo.id} value={hijo.id}>
                    {hijo.nombres} ({hijo.grado} &quot;{hijo.seccion}&quot;)
                  </option>
                ))}
              </select>
              <ArrowDown01Icon size={14} className="text-[#6B7280] pointer-events-none -ml-3" />
            </div>
          </div>
        )}
      </div>

      {/* Right side: School Year, Notifications, Quick Actions */}
      <div className="flex items-center gap-3">
        {/* School Year Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#DCFCE7] text-[#15803D] rounded-full text-xs font-bold border border-[#BBF7D0]">
          <Calendar01Icon size={14} />
          <span>Año Lectivo 2026</span>
        </div>

        {/* Notification Icon */}
        <Link
          href="/padre/comunicados"
          className="relative p-2 text-[#4B5563] hover:text-[#111827] hover:bg-slate-100 rounded-xl transition-colors"
          title="Ver comunicados escolares"
        >
          <Notification01Icon size={20} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#BE123C] rounded-full ring-2 ring-white" />
        </Link>
      </div>
    </header>
  );
};

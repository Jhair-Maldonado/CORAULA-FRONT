// src/components/padres/PadreHeader.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Notification01Icon,
  Calendar01Icon,
  ArrowDown01Icon,
  CheckmarkBadge01Icon
} from 'hugeicons-react';
import { usePadre } from './PadreContext';

export const PadreHeader: React.FC = () => {
  const { hijos, selectedHijoId, setSelectedHijoId, selectedHijo } = usePadre();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-sm">
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

        {/* Custom Dropdown Selector for Children */}
        {hijos.length > 0 && (
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 sm:pr-3 sm:pl-1.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-rose-600 font-bold text-sm shrink-0 border border-slate-200">
                {selectedHijo?.fotoUrl ? (
                  <Image src={selectedHijo.fotoUrl} alt={selectedHijo.nombres} width={32} height={32} className="object-cover w-full h-full" />
                ) : (
                  selectedHijo ? selectedHijo.nombres.charAt(0) : 'E'
                )}
              </div>
              <div className="flex flex-col items-start hidden sm:flex text-left">
                <span className="text-sm font-bold text-slate-800 leading-none">
                  {selectedHijo ? selectedHijo.nombres.split(' ')[0] : 'Seleccionar'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {selectedHijo ? `${selectedHijo.grado} "${selectedHijo.seccion}"` : ''}
                </span>
              </div>
              <ArrowDown01Icon 
                size={16} 
                className={`text-slate-400 ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tus Hijos</span>
                </div>
                {hijos.map((hijo) => (
                  <button
                    key={hijo.id}
                    onClick={() => {
                      setSelectedHijoId(hijo.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-left ${selectedHijoId === hijo.id ? 'bg-rose-50/50' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-rose-600 font-bold text-sm shrink-0 border border-slate-200">
                      {hijo.fotoUrl ? (
                        <Image src={hijo.fotoUrl} alt={hijo.nombres} width={40} height={40} className="object-cover w-full h-full" />
                      ) : (
                        hijo.nombres.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className={`text-sm font-bold ${selectedHijoId === hijo.id ? 'text-rose-700' : 'text-slate-800'}`}>
                        {hijo.nombres.split(' ')[0]}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {hijo.grado} &quot;{hijo.seccion}&quot;
                      </span>
                    </div>
                    {selectedHijoId === hijo.id && (
                      <CheckmarkBadge01Icon size={18} className="text-rose-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: School Year, Notifications, Quick Actions */}
      <div className="flex items-center gap-3">
        {/* School Year Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 shadow-sm">
          <Calendar01Icon size={14} />
          <span>Año Lectivo 2026</span>
        </div>

        {/* Notification Icon */}
        <Link
          href="/padre/comunicados"
          className="relative p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors border border-transparent hover:border-slate-200"
          title="Ver comunicados escolares"
        >
          <Notification01Icon size={20} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
        </Link>
      </div>
    </header>
  );
};

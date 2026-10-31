'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UserSwitchIcon, ArrowDown01Icon, CheckmarkCircle01Icon, UserIcon } from 'hugeicons-react';
import { VinculoEstudiante } from '../types';

interface SelectorHijoProps {
  estudiantes: VinculoEstudiante[];
  selectedStudentId: string | number | null;
  onSelectStudent: (id: string | number) => void;
  disabled?: boolean;
}

export const SelectorHijo: React.FC<SelectorHijoProps> = ({
  estudiantes,
  selectedStudentId,
  onSelectStudent,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (estudiantes.length <= 1) {
    return null;
  }

  const estudianteActivo =
    estudiantes.find((e) => String(e.studentId) === String(selectedStudentId)) || estudiantes[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2.5 bg-white border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink hover:bg-slate-50 transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-6 h-6 rounded-lg bg-rose-50 text-accent flex items-center justify-center shrink-0">
          <UserSwitchIcon size={14} />
        </div>

        <div className="text-left flex flex-col">
          <span className="text-[10px] text-muted font-bold uppercase tracking-wider leading-none">
            Estudiante Activo
          </span>
          <span className="text-xs font-extrabold text-ink max-w-[140px] sm:max-w-[190px] truncate">
            {estudianteActivo.fullName}
          </span>
        </div>

        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
          {estudianteActivo.grade} {estudianteActivo.sectionName}
        </span>

        <ArrowDown01Icon
          size={14}
          className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-line rounded-2xl shadow-xl z-50 p-2 divide-y divide-slate-100 animate-in fade-in duration-150"
        >
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Hijos Vinculados ({estudiantes.length})
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Seleccionar</span>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
            {estudiantes.map((estudiante) => {
              const isSelected = String(estudiante.studentId) === String(selectedStudentId);

              return (
                <button
                  key={estudiante.studentId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectStudent(estudiante.studentId);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-rose-50/80 text-ink font-bold border border-rose-200/60'
                      : 'text-ink hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        isSelected
                          ? 'bg-accent text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {estudiante.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink">
                        {estudiante.fullName}
                      </p>
                      <p className="text-[10px] text-muted flex items-center gap-1.5 font-medium">
                        <span>Cód: {estudiante.studentCode}</span>
                        <span>•</span>
                        <span>
                          {estudiante.grade} - {estudiante.sectionName}
                        </span>
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckmarkCircle01Icon size={16} className="text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

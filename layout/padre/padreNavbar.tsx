'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePadre } from '@/components/padres/PadreContext'; 
import { 
  Notification01Icon, 
  UserSwitchIcon,
  CheckmarkBadge01Icon,
  Menu01Icon
} from 'hugeicons-react';
import { formatGradoSeccion } from '@/components/padres/hijoFormat';

// Títulos según las rutas reales de src/app/padre/*.
const TITULOS_RUTA: readonly [string, string][] = [
  ['/padre/hijos', 'Mis Estudiantes'],
  ['/padre/asistencia', 'Asistencia General'],
  ['/padre/libreta', 'Libreta de Calificaciones'],
  ['/padre/incidencias', 'Incidencias'],
  ['/padre/justificacion', 'Control de Asistencia (Justificación)'],
  ['/padre/mensajeria', 'Mensajería'],
  ['/padre/avisos', 'Centro de Comunicados'],
];

export function padreTituloDeRuta(path: string | null): string {
  if (path === '/padre') return 'Panel General';
  const match = TITULOS_RUTA.find(([ruta]) => path === ruta || path?.startsWith(`${ruta}/`));
  return match ? match[1] : 'Portal de Padres';
}

export const PadreNavbar: React.FC = () => {
  const pathname = usePathname();
  const { hijos, hijoActivo, setSelectedHijoId } = usePadre();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-sm flex justify-center">
      <div className="w-full max-w-[1600px] px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Lado Izquierdo: Título */}
        <div className="flex items-center gap-3">
          {/* Botón menú móvil (opcional/reservado) */}
          <button className="md:hidden text-[#6B7280] hover:text-[#111827]">
            <Menu01Icon size={20} />
          </button>
          <h1 className="text-sm font-black text-[#111827] uppercase tracking-wider hidden sm:block">
            {padreTituloDeRuta(pathname)}
          </h1>
        </div>

        {/* Lado Derecho: Acciones y Selector de Hijo */}
        <div className="flex items-center gap-4">
          
          {/* Sin indicador de no leídos: no existe un conteo real hasta el módulo de notificaciones (#58). */}
          <button type="button" aria-label="Notificaciones" className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#6B7280] hover:bg-slate-100 hover:text-[#111827] transition-colors">
            <Notification01Icon size={18} aria-hidden="true" />
          </button>

          <div className="w-px h-6 bg-[#E5E7EB]"></div>

          {/* Selector de Hijo Global */}
          <div className="relative" ref={dropdownRef}>
            {hijoActivo ? (
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1.5 rounded-xl border border-transparent hover:border-[#E5E7EB] transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full border border-[#E5E7EB] bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs overflow-hidden shrink-0 shadow-sm">
                  {hijoActivo.fotoUrl ? (
                    <img src={hijoActivo.fotoUrl} alt={hijoActivo.nombres} className="w-full h-full object-cover" />
                  ) : (
                    <span>{hijoActivo.nombres.charAt(0)}{hijoActivo.apellidos.charAt(0)}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left min-w-[100px]">
                  <h3 className="text-[11px] font-black text-[#111827] leading-none truncate max-w-[140px]">{hijoActivo.nombres}</h3>
                  <p className="text-[9px] font-bold text-[#6B7280] flex items-center gap-1 mt-0.5">
                    Cambiar hijo <UserSwitchIcon size={10} />
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-muted">Cargando...</div>
            )}
            
            {/* Dropdown */}
            {isDropdownOpen && hijos.length > 0 && (
              <div className="absolute top-full right-0 mt-2 w-full min-w-[220px] bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
                <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-wider mb-2 px-2">Seleccione un estudiante</p>
                {hijos.map(h => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setSelectedHijoId(h.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      h.id === (hijoActivo?.id) ? 'bg-rose-50 border-rose-200 border' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-[#111827] overflow-hidden shrink-0 border border-[#E5E7EB]">
                      {h.fotoUrl ? (
                        <img src={h.fotoUrl} alt={h.nombres} className="w-full h-full object-cover" />
                      ) : (
                        <span>{h.nombres.charAt(0)}{h.apellidos.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-black truncate ${h.id === (hijoActivo?.id) ? 'text-[#BE123C]' : 'text-[#111827]'}`}>
                        {h.nombres} {h.apellidos}
                      </p>
                      <p className="text-[9px] font-bold text-[#6B7280] truncate">{formatGradoSeccion(h)}</p>
                    </div>
                    {h.id === (hijoActivo?.id) && <CheckmarkBadge01Icon size={14} className="text-[#BE123C]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

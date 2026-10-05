'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { 
  Notification01Icon, 
  CheckmarkBadge01Icon, 
  UserSwitchIcon,
  Alert02Icon,
  BookOpen01Icon,
  Calendar01Icon,
  FilterIcon,
  Message01Icon
} from 'hugeicons-react';
import { TipoComunicado, ComunicadoPadre } from '@/types/padre';

// Datos Mockeados de Comunicados
const MOCK_COMUNICADOS: ComunicadoPadre[] = [
  {
    id: 'c-1',
    titulo: 'Suspensión de clases presenciales por lluvias',
    resumen: 'Debido a las fuertes lluvias, las clases se realizarán de manera virtual este viernes.',
    contenido: 'Estimados padres de familia, se les comunica que...',
    tipo: 'Urgente',
    fecha: 'Hoy, 08:30 AM',
    emisor: 'Dirección General',
    emisorCargo: 'Director',
    leido: false,
    requiereFirma: true
  },
  {
    id: 'c-2',
    titulo: 'Entrega de libretas del 1er Bimestre',
    resumen: 'La reunión de entrega de libretas se realizará el próximo miércoles a las 4:00 PM.',
    contenido: 'Estimados padres, los invitamos a la entrega de libretas...',
    tipo: 'Académico',
    fecha: 'Ayer, 04:15 PM',
    emisor: 'Coordinación Académica',
    emisorCargo: 'Coordinador',
    leido: false,
    requiereFirma: false
  },
  {
    id: 'c-3',
    titulo: 'Olimpiadas Deportivas 2026',
    resumen: 'Inscripciones abiertas para participar en las disciplinas deportivas del colegio.',
    contenido: 'Inscriba a sus hijos en las próximas olimpiadas...',
    tipo: 'Evento',
    fecha: '12 de Mayo, 10:00 AM',
    emisor: 'Departamento de Ed. Física',
    emisorCargo: 'Profesor',
    leido: true,
    requiereFirma: false
  },
  {
    id: 'c-4',
    titulo: 'Recordatorio de pago de pensión de Mayo',
    resumen: 'Se recuerda que el vencimiento de la pensión del mes de Mayo es el 15.',
    contenido: 'Evite moras pagando a tiempo...',
    tipo: 'Administrativo',
    fecha: '05 de Mayo, 09:00 AM',
    emisor: 'Tesorería',
    emisorCargo: 'Tesorero',
    leido: true,
    requiereFirma: false
  }
];

export default function ComunicadosPage() {
  const { hijos, selectedHijoId, setSelectedHijoId } = usePadre();
  const [filtro, setFiltro] = useState<'Todas' | 'Leídas' | 'Faltantes'>('Todas');
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hijoActivo = hijos.find(h => h.id === selectedHijoId) || hijos[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  if (!hijoActivo) {
    return (
      <div className="p-6 text-center text-[11px] font-bold text-muted">
        Cargando datos del estudiante...
      </div>
    );
  }

  // Filtrado
  const comunicadosFiltrados = MOCK_COMUNICADOS.filter(c => {
    if (filtro === 'Leídas') return c.leido;
    if (filtro === 'Faltantes') return !c.leido;
    return true; // 'Todas'
  });

  const noLeidasCount = MOCK_COMUNICADOS.filter(c => !c.leido).length;

  const getTipoEstilo = (tipo: TipoComunicado) => {
    switch (tipo) {
      case 'Urgente': return { bg: 'bg-red-500', text: 'text-red-700', bgLight: 'bg-red-50', icon: <Alert02Icon size={14} className="text-white" /> };
      case 'Académico': return { bg: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50', icon: <BookOpen01Icon size={14} className="text-white" /> };
      case 'Administrativo': return { bg: 'bg-blue-500', text: 'text-blue-700', bgLight: 'bg-blue-50', icon: <Message01Icon size={14} className="text-white" /> };
      case 'Evento': return { bg: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50', icon: <Calendar01Icon size={14} className="text-white" /> };
      default: return { bg: 'bg-slate-500', text: 'text-slate-700', bgLight: 'bg-slate-50', icon: <Notification01Icon size={14} className="text-white" /> };
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in w-full">
      
      {/* Contenedor Principal de Comunicados */}
      <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
        
        {/* Barra de Filtros */}
        <div className="p-3 border-b border-line bg-neutral/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterIcon size={14} className="text-muted mr-1" />
            <button
              onClick={() => setFiltro('Todas')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                filtro === 'Todas' ? 'bg-ink text-white' : 'bg-white border border-line text-muted hover:bg-slate-50'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltro('Faltantes')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 ${
                filtro === 'Faltantes' ? 'bg-red-600 text-white' : 'bg-white border border-line text-muted hover:bg-slate-50'
              }`}
            >
              Faltantes {noLeidasCount > 0 && <span className="bg-white text-red-600 px-1 rounded-sm text-[8px]">{noLeidasCount}</span>}
            </button>
            <button
              onClick={() => setFiltro('Leídas')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                filtro === 'Leídas' ? 'bg-emerald-600 text-white' : 'bg-white border border-line text-muted hover:bg-slate-50'
              }`}
            >
              Leídas
            </button>
          </div>
        </div>

        {/* Lista de Comunicados */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {comunicadosFiltrados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted">
              <Notification01Icon size={32} className="mb-2 opacity-30" />
              <p className="text-[11px] font-bold">No se encontraron comunicados</p>
              <p className="text-[9px]">Prueba cambiando el filtro de búsqueda.</p>
            </div>
          ) : (
            comunicadosFiltrados.map((com, index) => {
              const estilos = getTipoEstilo(com.tipo);
              const isFaltante = !com.leido;

              return (
                <div 
                  key={com.id} 
                  className={`group relative flex items-start gap-4 p-4 border-b border-line hover:bg-slate-50/80 transition-colors cursor-pointer ${isFaltante ? 'bg-white' : 'bg-neutral/20'}`}
                >
                  {/* Punto indicador de "no leído" */}
                  {isFaltante && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  )}

                  {/* Icono de Prioridad */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${estilos.bg}`}>
                    {estilos.icon}
                  </div>

                  {/* Contenido (Truncado para ahorrar espacio) */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${estilos.bgLight} ${estilos.text}`}>
                        {com.tipo}
                      </span>
                      {com.requiereFirma && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          Requiere Firma
                        </span>
                      )}
                    </div>
                    
                    <h3 className={`text-[12px] font-black truncate leading-tight mb-1 ${isFaltante ? 'text-ink' : 'text-slate-600'}`}>
                      {com.titulo}
                    </h3>
                    
                    <p className={`text-[10px] font-medium truncate ${isFaltante ? 'text-slate-600' : 'text-slate-400'}`}>
                      {com.resumen}
                    </p>
                    
                    <p className="text-[8px] font-bold text-muted uppercase mt-1">
                      De: {com.emisor} ({com.emisorCargo})
                    </p>
                  </div>

                  {/* Fecha / Hora a la derecha */}
                  <div className="shrink-0 text-right">
                    <span className={`text-[9px] font-black uppercase whitespace-nowrap ${isFaltante ? 'text-accent' : 'text-muted'}`}>
                      {com.fecha}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

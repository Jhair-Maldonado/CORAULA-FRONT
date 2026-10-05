'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePadre } from '@/components/padres/padreContext'; 
import { 
  Alert02Icon, 
  CheckmarkCircle01Icon,
  DocumentValidationIcon,
  UserSwitchIcon
} from 'hugeicons-react';
import { FormularioInasistencia } from './component/formularioInasistencia';
import { CalendarioAsistencia } from './component/calendarioAsistencia';
import { CardJustificacion } from './component/cardJustificacion'; 

// Datos Mockeados
const MOCK_ALERTAS: any[] = [];

const MOCK_HISTORIAL = [
  {
    id: 'h-1',
    fecha: '15 de Mayo, 2026',
    tipoIncidencia: 'Falta Injustificada',
    estado: 'Aprobada',
    motivo: 'Cita Médica',
    detalle: 'Se adjuntó receta médica del pediatra.'
  },
  {
    id: 'h-2',
    fecha: '08 de Mayo, 2026',
    tipoIncidencia: 'Tardanza al Colegio',
    estado: 'Falta Justificar',
    motivo: '—',
    detalle: 'Requiere justificación formal del apoderado.'
  },
  {
    id: 'h-3',
    fecha: '02 de Mayo, 2026',
    tipoIncidencia: 'Tardanza al Colegio',
    estado: 'Rechazada',
    motivo: 'Problemas de Tráfico',
    detalle: 'El motivo no es considerado de fuerza mayor por el reglamento.'
  }
];

// Generar mock de días del mes (Mayo 2026 aprox)
const MOCK_CALENDARIO = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  let estado = 'asistio'; 
  
  if ([2, 3, 9, 10, 16, 17, 23, 24, 30, 31].includes(day)) {
    estado = 'fin_semana';
  } else {
    if (day === 15) estado = 'falta_justificada'; // Cita Médica
    if (day === 8) estado = 'tardanza_injustificada'; // Falta Justificar
    if (day === 2) estado = 'tardanza_justificada'; // Tráfico (rechazada o no, está justificada)
    if (day >= 26) estado = 'futuro'; // Días que aún no pasan
  }
  return { dia: day, estado };
});

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function VistaPrincipalJustificacion() {
  const { hijos, selectedHijoId, setSelectedHijoId } = usePadre();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fechaJustificar, setFechaJustificar] = useState<string | undefined>(undefined);
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

  const alertaActiva = MOCK_ALERTAS.find(a => a.hijoId === hijoActivo.id);

  const handleJustificarDia = (dia: number) => {
    const diaFormateado = dia < 10 ? `0${dia}` : dia;
    setFechaJustificar(`2026-05-${diaFormateado}`);
    setIsModalOpen(true);
  };

  const handleAbrirModalVacio = () => {
    setFechaJustificar(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in max-w-[1200px] mx-auto py-6">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-2">
        <div>
          <h1 className="text-[14px] font-black text-ink uppercase tracking-wider">Control de Asistencia</h1>
          <p className="text-[10px] text-muted font-medium mt-1">
            Gestione las inasistencias y tardanzas de {hijoActivo.nombres}.
          </p>
        </div>
      </div>

      {/* Grid de Estado Diario y Selector de Hijo - SÚPER COMPACTO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        
        {/* Panel Izquierdo: Alerta o Estado de Hoy (Ocupa 3/4) */}
        <div className="md:col-span-3">
          {alertaActiva ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm flex items-center justify-between h-full animate-pulse-slow gap-4">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-red-100 flex items-center justify-center text-red-500 font-black text-xs">
                    {hijoActivo.fotoUrl ? (
                      <img src={hijoActivo.fotoUrl} alt={hijoActivo.nombres} className="w-full h-full object-cover" />
                    ) : (
                      <span>{hijoActivo.nombres.charAt(0)}{hijoActivo.apellidos.charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                    <Alert02Icon size={8} />
                  </div>
                </div>
                <div>
                  <span className="text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-100 px-1.5 py-0.5 rounded-full inline-block mb-0.5">
                    Tardanza Activa
                  </span>
                  <h2 className="text-[11px] font-black text-red-950 leading-tight">
                    Retraso de {alertaActiva.minutosRetraso} minutos en {alertaActiva.tipoRetraso}.
                  </h2>
                </div>
              </div>
              <button 
                onClick={handleAbrirModalVacio}
                className="shrink-0 px-3 py-1.5 bg-red-600 text-white text-[9px] font-bold rounded-lg shadow-sm hover:bg-red-700 transition-colors"
              >
                Justificar Ahora
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 shadow-sm flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                  <CheckmarkCircle01Icon size={20} />
                </div>
                <div>
                  <h3 className="text-[12px] font-black text-emerald-900 leading-tight">¡Todo en orden hoy!</h3>
                  <p className="text-[9px] font-medium text-emerald-700 mt-0.5">El estudiante llegó a tiempo y no registra alertas.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel Derecho: Selector Rápido de Hijo Local (Ocupa 1/4) */}
        <div className="md:col-span-1 relative" ref={dropdownRef}>
          <div 
            className="bg-white border border-line rounded-xl p-2.5 shadow-sm flex items-center gap-3 h-full cursor-pointer hover:border-accent transition-colors"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-10 h-10 rounded-full border border-line bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs overflow-hidden shrink-0">
              {hijoActivo.fotoUrl ? (
                <img src={hijoActivo.fotoUrl} alt={hijoActivo.nombres} className="w-full h-full object-cover" />
              ) : (
                <span>{hijoActivo.nombres.charAt(0)}{hijoActivo.apellidos.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] font-black text-ink truncate">{hijoActivo.nombres}</h3>
              <p className="text-[8px] font-bold text-muted uppercase tracking-wider">Cambiar Hijo <UserSwitchIcon size={10} className="inline ml-0.5 pb-0.5" /></p>
            </div>
          </div>
          
          {/* Dropdown de Hijos */}
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-full min-w-[220px] bg-white border border-line rounded-xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
              <p className="text-[9px] font-black text-muted uppercase tracking-wider mb-2 px-2">Seleccione un estudiante</p>
              {hijos.map(h => (
                <button
                  key={h.id}
                  onClick={() => {
                    setSelectedHijoId(h.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    h.id === hijoActivo.id ? 'bg-accent/10 border-accent/20 border' : 'hover:bg-neutral border border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-ink overflow-hidden shrink-0">
                    {h.fotoUrl ? (
                      <img src={h.fotoUrl} alt={h.nombres} className="w-full h-full object-cover" />
                    ) : (
                      <span>{h.nombres.charAt(0)}{h.apellidos.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black truncate ${h.id === hijoActivo.id ? 'text-accent' : 'text-ink'}`}>
                      {h.nombres} {h.apellidos}
                    </p>
                    <p className="text-[8px] font-bold text-muted truncate">{h.grado} - {h.seccion}</p>
                  </div>
                  {h.id === hijoActivo.id && <CheckmarkCircle01Icon size={12} className="text-accent" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal: Calendario y Justificaciones (2/3 vs 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Calendario de Asistencia (Ocupa 2/3) */}
        <div className="lg:col-span-2">
          <CalendarioAsistencia 
            calendario={MOCK_CALENDARIO} 
            onJustificarDia={handleJustificarDia} 
          />
        </div>

        {/* Panel Derecho: Lista de Historial e Injustificadas (Ocupa 1/3) */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-line rounded-xl shadow-sm h-full flex flex-col">
            <div className="p-3 border-b border-line bg-neutral/30 flex justify-between items-center">
              <h3 className="text-[11px] font-black text-ink uppercase tracking-wider flex items-center gap-1.5">
                <DocumentValidationIcon size={14} className="text-muted" />
                Historial de Registro
              </h3>
            </div>
            
            <div className="p-3 flex flex-col gap-2.5 flex-1 overflow-y-auto">
              {MOCK_HISTORIAL.map((item) => (
                <CardJustificacion 
                  key={item.id} 
                  item={item} 
                  onJustificar={handleJustificarDia} 
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      {isModalOpen && (
        <FormularioInasistencia
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          fechaPrecargada={fechaJustificar}
        />
      )}

    </div>
  );
}

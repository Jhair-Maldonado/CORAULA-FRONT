
'use client';

import React, { useState } from 'react';
import { usePadre } from '@/components/padres/padreContext'; 
import { CheckmarkCircle01Icon, Alert01Icon, PencilEdit02Icon, StarIcon } from 'hugeicons-react';
import { EdicionHijoModal } from './component/edicionHijoModal'; 
import { HijoResumen } from '@/types/padre';

export default function HijosMatriculados() {
  const { hijos, selectedHijoId, setSelectedHijoId, isLoading, error, refreshPadreData } = usePadre();
  
  // Estado para el modal de edición
  const [hijoEditando, setHijoEditando] = useState<HijoResumen | null>(null);
  
  // Simulación de actualización local
  const [hijosLocal, setHijosLocal] = useState<HijoResumen[]>([]);

  // Sincronizar hijos locales si cambian
  React.useEffect(() => {
    if (hijos.length > 0 && hijosLocal.length === 0) {
      setHijosLocal(hijos);
    }
  }, [hijos]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse p-4">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="h-20 bg-slate-100 rounded-xl w-full" />
        <div className="h-20 bg-slate-100 rounded-xl w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-accent font-bold text-xs">
        No pudimos cargar la lista de estudiantes.
        <button onClick={refreshPadreData} className="ml-2 underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in w-full">
      <div className="mb-6 px-2">
        <h1 className="text-[14px] font-black text-ink uppercase tracking-wider">Estudiantes a Cargo</h1>
        <p className="text-[10px] text-muted font-medium mt-1">
          Seleccione un estudiante para visualizar su rendimiento y asistencia en el tablero principal.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {hijosLocal.length === 0 ? (
          <div className="text-center p-8 bg-neutral/50 rounded-xl border border-line border-dashed">
            <p className="text-[11px] font-bold text-muted">No tiene estudiantes registrados</p>
          </div>
        ) : (
          hijosLocal.map((hijo) => {
            const isSelected = hijo.id === selectedHijoId;
            const desaprobados = hijo.cursosBajos || 0;
            const aprobados = 12 - desaprobados; // Simulado en base a 12 cursos totales
            const promedioStr = hijo.promedioGeneral ? hijo.promedioGeneral.toFixed(1) : (hijo.promedio || 14.5).toFixed(1);

            return (
              <div 
                key={hijo.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all shadow-sm gap-4 border-line bg-white hover:border-muted"
              >
                {/* Lado Izquierdo: Info (No clickable) */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shrink-0 border bg-slate-100 text-slate-500 border-slate-200">
                    {hijo.fotoUrl ? (
                      <img src={hijo.fotoUrl} alt={hijo.nombres} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      hijo.nombres.charAt(0) + hijo.apellidos.charAt(0)
                    )}
                  </div>
                  
                  {/* Info Básica */}
                  <div>
                    <h2 className="text-[12px] font-black leading-tight text-ink">
                      {hijo.nombreCompleto}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider bg-neutral px-1.5 py-0.5 rounded">
                        {hijo.grado} "{hijo.seccion}" - {hijo.nivel}
                      </span>
                      <span className="text-[9px] font-bold text-muted">
                        Tutor: <span className="text-ink">{hijo.tutor}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Derecho: Resumen, Promedio y Edición */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-line/60">
                  
                  {/* Resumen de Rendimiento (Promedio y Cursos) */}
                  <div className="flex items-center gap-4">
                    {/* Promedio General */}
                    <div className="flex flex-col items-center justify-center bg-white border border-line px-2.5 py-1.5 rounded-lg shadow-sm">
                      <span className="text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">Promedio</span>
                      <div className="flex items-center gap-1 text-accent">
                        <StarIcon size={12} className="fill-accent" />
                        <span className="text-[14px] font-black">{promedioStr}</span>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-line hidden sm:block"></div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">Aprobados</span>
                        <div className="flex items-center gap-1 text-success-ink">
                          <CheckmarkCircle01Icon size={12} />
                          <span className="text-[11px] font-black">{aprobados} cursos</span>
                        </div>
                      </div>
                      
                      <div className="w-px h-6 bg-line"></div>
                      
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">En Riesgo</span>
                        <div className={`flex items-center gap-1 ${desaprobados > 0 ? 'text-accent' : 'text-muted'}`}>
                          <Alert01Icon size={12} />
                          <span className="text-[11px] font-black">{desaprobados} cursos</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHijoEditando(hijo);
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-neutral text-ink border border-line hover:bg-line/40 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <PencilEdit02Icon size={14} /> Editar Ficha
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Render Modal de Edición */}
      {hijoEditando && (
        <EdicionHijoModal
          hijo={hijoEditando}
          onClose={() => setHijoEditando(null)}
          onSave={(hijoEditado) => {
            setHijosLocal(prev => prev.map(h => h.id === hijoEditado.id ? hijoEditado : h));
            setHijoEditando(null);
            // Aquí idealmente llamaríamos a la API para actualizar los datos en BD.
          }}
        />
      )}
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { EdicionHijoModal } from './component/edicionHijoModal';
import { TarjetaHijoVinculado } from './component/tarjetaHijoVinculado';
import { HijoResumen } from '@/types/padre';
import { isMockDataEnabled } from '@/lib/mockMode';

export default function HijosMatriculados() {
  const { hijos, selectedHijoId, setSelectedHijoId, isLoading, error, refreshPadreData } = usePadre();
  // No existe endpoint para que el apoderado edite la ficha: la edición solo existe en modo demostración.
  const mocksActivos = isMockDataEnabled();

  // Estado para el modal de edición
  const [hijoEditando, setHijoEditando] = useState<HijoResumen | null>(null);

  // Simulación de actualización local
  const [hijosLocal, setHijosLocal] = useState<HijoResumen[]>([]);

  // Sincronizar hijos locales si cambian
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (hijos.length > 0 && hijosLocal.length === 0) {
      setHijosLocal(hijos);
    }
  }, [hijos]);

  const listaHijos = mocksActivos ? hijosLocal : hijos;

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
        {error}
        <button onClick={refreshPadreData} className="ml-2 underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in w-full">
      <div className="mb-6 px-2">
        <h1 className="text-base font-black text-ink uppercase tracking-wider">Estudiantes a Cargo</h1>
        <p className="text-xs text-muted font-medium mt-1">
          Seleccione un estudiante para consultar su asistencia y los demás módulos del portal.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {listaHijos.length === 0 ? (
          <div className="text-center p-8 bg-neutral/50 rounded-xl border border-line border-dashed">
            <p className="text-[11px] font-bold text-muted">No tiene estudiantes vinculados</p>
          </div>
        ) : (
          listaHijos.map((hijo) => (
            <TarjetaHijoVinculado
              key={hijo.id}
              hijo={hijo}
              seleccionado={hijo.id === selectedHijoId}
              onSeleccionar={() => setSelectedHijoId(hijo.id)}
              onEditar={mocksActivos ? () => setHijoEditando(hijo) : undefined}
            />
          ))
        )}
      </div>

      {/* Render Modal de Edición */}
      {mocksActivos && hijoEditando && (
        <EdicionHijoModal
          hijo={hijoEditando}
          onClose={() => setHijoEditando(null)}
          onSave={(hijoEditado) => {
            setHijosLocal(prev => prev.map(h => h.id === hijoEditado.id ? hijoEditado : h));
            setHijoEditando(null);
          }}
        />
      )}
    </div>
  );
}

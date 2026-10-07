'use client';

import ImportadorMatricula from '@/feature/admin/component/ImportadorMatricula';

export default function PantallaVistaMatricula() {
  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <header>
          <span className="text-accent text-xs font-bold tracking-widest uppercase">Módulo administrativo</span>
          <h1 className="text-ink text-2xl font-bold mt-1">Importación y Matrícula Masiva</h1>
          <p className="text-muted text-sm mt-1">Carga un archivo .XLSX y valida sus filas con el servidor antes de confirmar.</p>
        </header>
        <ImportadorMatricula />
      </div>
    </div>
  );
}

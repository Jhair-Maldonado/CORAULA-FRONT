// Vista de un módulo del apoderado aún sin endpoint en el backend (ver GUARDIAN_MODULOS_CON_BACKEND).
// No muestra datos: el aviso de módulo simulado lo pone PadreSimulationNotice desde el layout.
export function ModuloPendiente({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="mx-auto max-w-5xl py-4">
      <h1 className="text-xl font-black text-ink">{titulo}</h1>
      <p className="mt-1 text-sm text-muted">{descripcion}</p>
      <p className="mt-6 rounded-xl border border-dashed border-line bg-white p-6 text-sm text-muted">
        Este módulo estará disponible cuando el colegio habilite la consulta. Por ahora no hay información para mostrar.
      </p>
    </div>
  );
}

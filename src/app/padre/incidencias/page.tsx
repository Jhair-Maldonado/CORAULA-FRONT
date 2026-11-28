'use client';

import { Suspense } from 'react';
import VistaIncidencias from '../../../../feature/padre/vistas/incidencias/vistaIncidencias';
import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';
import { guardianModuloUsaBackend } from '@/services/padres/guardianModules';

// FRONT #59 y #163 / BACK #117. Módulo registrado: en MOCK, el adaptador simulado de httpClient responde el servicio.
// Los filtros viven en la URL (useSearchParams), por eso la vista va bajo Suspense.
export default function IncidenciasPage() {
  if (!guardianModuloUsaBackend('incidencias')) {
    return <ModuloPendiente titulo="Incidencias" descripcion="Incidencias registradas por los docentes del estudiante." />;
  }
  return (
    <Suspense fallback={<p role="status" className="py-4 text-sm text-muted">Cargando incidencias…</p>}>
      <VistaIncidencias />
    </Suspense>
  );
}

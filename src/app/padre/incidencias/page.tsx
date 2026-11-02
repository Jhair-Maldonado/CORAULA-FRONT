'use client';

import VistaIncidencias from '../../../../feature/padre/vistas/incidencias/vistaIncidencias';
import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';
import { guardianModuloUsaBackend } from '@/services/padres/guardianModules';

// FRONT #59 / BACK #117. Con mocks activos no hay incidencias de demostración: no se consulta el backend.
export default function IncidenciasPage() {
  if (!guardianModuloUsaBackend('incidencias')) {
    return <ModuloPendiente titulo="Incidencias" descripcion="Incidencias registradas por los docentes del estudiante." />;
  }
  return <VistaIncidencias />;
}

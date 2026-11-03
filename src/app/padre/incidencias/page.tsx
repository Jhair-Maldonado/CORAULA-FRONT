'use client';

import VistaIncidencias from '../../../../feature/padre/vistas/incidencias/vistaIncidencias';
import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';
import { guardianModuloUsaBackend } from '@/services/padres/guardianModules';

// FRONT #59 / BACK #117. Módulo registrado: en MOCK, el adaptador simulado de httpClient responde el servicio.
export default function IncidenciasPage() {
  if (!guardianModuloUsaBackend('incidencias')) {
    return <ModuloPendiente titulo="Incidencias" descripcion="Incidencias registradas por los docentes del estudiante." />;
  }
  return <VistaIncidencias />;
}

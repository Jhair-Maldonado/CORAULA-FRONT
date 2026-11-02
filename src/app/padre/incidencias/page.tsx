import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';

// FRONT #59 / BACK #117: la vista de incidencias llega en su propio PR cuando exista el endpoint.
export default function IncidenciasPage() {
  return <ModuloPendiente titulo="Incidencias" descripcion="Incidencias registradas por los docentes del estudiante." />;
}

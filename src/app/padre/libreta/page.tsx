import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';

// FRONT #56: la vista de libreta llega en su propio PR cuando exista el endpoint.
export default function LibretaPage() {
  return <ModuloPendiente titulo="Libreta de calificaciones" descripcion="Libreta bimestral publicada del estudiante." />;
}

'use client';

import VistaLibreta from '../../../../feature/padre/vistas/libreta/vistaLibreta';
import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';
import { guardianModuloUsaBackend } from '@/services/padres/guardianModules';

// FRONT #56 / BACK #56. Módulo registrado: en MOCK, el adaptador simulado de httpClient responde el servicio.
export default function LibretaPage() {
  if (!guardianModuloUsaBackend('libreta')) {
    return <ModuloPendiente titulo="Libreta de calificaciones" descripcion="Libreta bimestral publicada del estudiante." />;
  }
  return <VistaLibreta />;
}

'use client';

import VistaPrincipalJustificacion from '../../../../feature/padre/vistas/justificacion/vistaPrincipalJustificacion';
import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';
import { isMockDataEnabled } from '@/lib/mockMode';

// FRONT #57: la vista conectada llega en su propio PR. Con mocks apagados nunca se muestra el formulario
// simulado (su envío sería un falso éxito); solo el modo demostración conserva la vista anterior.
export default function JustificacionesPage() {
  if (!isMockDataEnabled()) {
    return <ModuloPendiente titulo="Justificación de inasistencias" descripcion="Solicitudes de justificación de inasistencias y tardanzas del estudiante." />;
  }
  return <VistaPrincipalJustificacion />;
}

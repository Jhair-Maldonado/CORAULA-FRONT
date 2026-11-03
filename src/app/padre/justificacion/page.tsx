'use client';

import React, { Suspense } from 'react';
import VistaPrincipalJustificacion from '../../../../feature/padre/vistas/justificacion/vistaPrincipalJustificacion';
import { ModuloPendiente } from '../../../../feature/padre/vistas/moduloPendiente/moduloPendiente';
import { guardianModuloUsaBackend } from '@/services/padres/guardianModules';

// APOD-JUSTIFICACIONES-UI (RF-28, BACK #57). Módulo conectado al backend real.
export default function JustificacionesPage() {
  if (!guardianModuloUsaBackend('justificaciones')) {
    return (
      <ModuloPendiente
        titulo="Justificación de inasistencias"
        descripcion="Solicitudes de justificación de inasistencias y tardanzas del estudiante."
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      }
    >
      <VistaPrincipalJustificacion />
    </Suspense>
  );
}

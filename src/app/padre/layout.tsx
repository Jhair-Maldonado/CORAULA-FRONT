import React from 'react';
import { PadreProvider } from '@/components/padres/PadreContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';
import { PadreWorkspace } from '../../../layout/padre/padreWorkspace'; 

export const metadata = {
  title: 'Portal de Padres y Apoderados | CORAULA',
  description: 'Seguimiento académico, asistencia, calificaciones y comunicados escolares en tiempo real.',
};

export default function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={['APODERADO']}>
      <PadreProvider>
        <PadreWorkspace>
          <AvisoModuloSimulado
            activo={true}
            detalle="la información que ves es de demostración y no corresponde a tus hijos vinculados."
          />
          {children}
        </PadreWorkspace>
      </PadreProvider>
    </AuthGuard>
  );
}

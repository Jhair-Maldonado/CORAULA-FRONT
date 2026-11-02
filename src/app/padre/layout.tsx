import React from 'react';
import { PadreProvider } from '@/components/padres/PadreContext';
import { AuthGuard } from '@/components/AuthGuard';
import { PadreSimulationNotice } from '@/components/padres/PadreSimulationNotice';
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
          <PadreSimulationNotice />
          {children}
        </PadreWorkspace>
      </PadreProvider>
    </AuthGuard>
  );
}

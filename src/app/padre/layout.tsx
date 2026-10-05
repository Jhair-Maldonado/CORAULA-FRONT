import React from 'react';
import { PadreProvider } from '@/components/padres/padreContext';
import { AuthGuard } from '@/components/AuthGuard';
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
          {children}
        </PadreWorkspace>
      </PadreProvider>
    </AuthGuard>
  );
}

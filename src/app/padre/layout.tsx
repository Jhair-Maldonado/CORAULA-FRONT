import React from 'react';
import { PadreHeader } from './components/PadreHeader';
import { AuthGuard } from '@/components/AuthGuard';

export default function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={['APODERADO']}>
      <div className="min-h-screen bg-slate-50">
        <PadreHeader />
        <main className="p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

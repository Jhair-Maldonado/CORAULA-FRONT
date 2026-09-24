import React from 'react';
import { DocenteNav } from './components/DocenteNav';
import { AuthGuard } from '@/components/AuthGuard';

export default function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={['DOCENTE']}>
      <div className="min-h-screen bg-slate-50">
        <DocenteNav />
        <main className="p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

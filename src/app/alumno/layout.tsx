import React from 'react';
import { AlumnoNav } from './components/AlumnoNav';
import { AuthGuard } from '@/components/AuthGuard';

export default function AlumnoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={['ESTUDIANTE']}>
      <div className="min-h-screen bg-slate-50">
        <AlumnoNav />
        <main className="p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

import React from 'react';
import { AdminSidebar } from '../../../layout/adminSidebar';
import { AuthGuard } from '@/components/AuthGuard';

export default function AdministradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={['ADMINISTRADOR', 'DIRECTIVO']}>
      <div className="flex h-screen w-full bg-canvas font-sans overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

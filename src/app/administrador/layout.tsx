import React from 'react';
import { AdminSidebar } from './components/AdminSidebar';
// Ejemplo de importación de hugeicons-react
// import { DashboardIcon, UserGroupIcon } from 'hugeicons-react';

export default function AdministradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 bg-slate-50">
        {children}
      </main>
    </div>
  );
}

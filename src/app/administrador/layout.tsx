import React from 'react';
import { SidebarAdmin } from './components/SidebarAdmin';

export default function AdministradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas font-sans">
      <SidebarAdmin />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

import React from 'react';
import { SidebarAdmin } from './components/SidebarAdmin';

export default function AdministradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-canvas font-sans overflow-hidden">
      <SidebarAdmin />
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative">
        {children}
      </main>
    </div>
  );
}

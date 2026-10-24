// src/app/docente/layout.tsx
'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { DocenteSidebar } from './components/DocenteSidebar';
import { DocenteNavbar } from './components/DocenteNavbar';
import { DocenteSessionProvider } from './components/DocenteSessionContext';

function DocenteLayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] font-sans overflow-hidden text-[#111827]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full">
        <DocenteSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex h-full">
            <DocenteSidebar onMobileClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-[#F8FAFC]">
        <DocenteNavbar onMobileToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 w-full mx-auto max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/docente/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard allowedRoles={['DOCENTE']}>
      <DocenteSessionProvider>
        <DocenteLayoutShell>{children}</DocenteLayoutShell>
      </DocenteSessionProvider>
    </AuthGuard>
  );
}

import React from 'react';
import { SuperAdminHeader } from './components/SuperAdminHeader';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <SuperAdminHeader />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

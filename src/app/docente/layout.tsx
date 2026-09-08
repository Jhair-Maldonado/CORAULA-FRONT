import React from 'react';
import { DocenteNav } from './components/DocenteNav';

export default function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DocenteNav />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

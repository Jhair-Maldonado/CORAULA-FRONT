import React from 'react';
import { AlumnoNav } from './components/AlumnoNav';

export default function AlumnoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AlumnoNav />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

import React from 'react';
import { PadreHeader } from './components/PadreHeader';

export default function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PadreHeader />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

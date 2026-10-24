'use client';

import Link from 'next/link';
import { BookOpen01Icon } from 'hugeicons-react';

export const GradosSidebar = () => (
  <aside className="w-[190px] h-full bg-white border-r border-line p-3 shrink-0 font-sans">
    <h2 className="text-ink text-xs font-bold flex items-center gap-2 mb-3"><BookOpen01Icon size={15} className="text-accent" />Alumnado</h2>
    <Link href="/administrador/alumnos" className="block text-center px-3 py-2 rounded-lg text-xs font-bold bg-accent text-white">
      Todos los alumnos
    </Link>
  </aside>
);

'use client';

import React from 'react';
import { BookOpen01Icon } from 'hugeicons-react';

export function TabAsistencia() {
  return (
    <div className="h-full flex flex-col items-center justify-center py-10 text-muted">
      <BookOpen01Icon size={32} className="mb-2 text-slate-200" />
      <h3 className="text-xs font-bold text-ink mb-1">Sección en construcción</h3>
      <p className="text-[10px] font-medium text-muted max-w-sm text-center">
        La vista detallada de asistencia se implementará en la siguiente fase.
      </p>
    </div>
  );
}

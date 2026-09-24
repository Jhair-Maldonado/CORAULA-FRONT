// src/app/(padres)/padre/hijos/page.tsx
'use client';

import React from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { HijoCard } from '@/components/padres/HijoCard';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui';

export default function HijosPage() {
  const { hijos, selectedHijoId, setSelectedHijoId, isLoading, error, refreshPadreData } = usePadre();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar la lista de estudiantes"
          message={error}
          onRetry={refreshPadreData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-2">
          ESTUDIANTES MATRICULADOS
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
          Mis Hijos a Cargo
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] max-w-2xl leading-relaxed mt-1">
          Listado de estudiantes vinculados a su cuenta de apoderado. Seleccione un estudiante
          para actualizar el contexto de notas, asistencia y horarios del portal.
        </p>
      </div>

      {/* Grid of Children Cards */}
      {hijos.length === 0 ? (
        <EmptyState
          title="No tiene estudiantes registrados"
          description="Comuníquese con secretaría académica para asociar a sus menores hijos."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {hijos.map((hijo) => (
            <HijoCard
              key={hijo.id}
              hijo={hijo}
              isSelected={hijo.id === selectedHijoId}
              onSelect={() => setSelectedHijoId(hijo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

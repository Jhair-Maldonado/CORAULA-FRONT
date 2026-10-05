import React from 'react';
import VistaDetalleMateriales from '@/../feature/alumno/vistas/materiales/vistaDetalleMateriales';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MaterialesDetallePage({ params }: PageProps) {
  const resolvedParams = await params;
  return (
    <main className="animate-in fade-in flex-1">
      <VistaDetalleMateriales slug={resolvedParams.id} />
    </main>
  );
}

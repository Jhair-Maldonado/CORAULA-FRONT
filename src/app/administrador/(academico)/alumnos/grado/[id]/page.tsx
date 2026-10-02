import React from 'react';
import { notFound } from 'next/navigation';
import { getSeccionById, MOCK_GRADOS } from '@/data/mockAlumnos';

import AlumnoPorSeccion from '../../../../../../../feature/admin/vistas/(academico)/alumnos/alumnoPorSeccion';

export const metadata = {
  title: 'Alumnos por Sección - CORAULA',
};

// Help Next.js statically generate routes for this dynamic page
export function generateStaticParams() {
  const paths: { seccionId: string }[] = [];
  MOCK_GRADOS.forEach(grado => {
    grado.secciones.forEach(seccion => {
      paths.push({ seccionId: seccion.id });
    });
  });
  return paths;
}

export default async function SeccionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <AlumnoPorSeccion params={params} />
    </>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { getSeccionById, MOCK_GRADOS } from '@/data/mockAlumnos';
import { StudentsGrid } from '../../components/StudentsGrid';

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

export default async function SeccionPage({ params }: { params: Promise<{ seccionId: string }> }) {
  const { seccionId } = await params;

  // We need to find the gradoId and seccionId to retrieve the student data
  let seccionData = null;
  for (const grado of MOCK_GRADOS) {
    const s = getSeccionById(grado.id, seccionId);
    if (s) {
      seccionData = s;
      break;
    }
  }

  if (!seccionData) {
    notFound();
  }

  return <StudentsGrid seccion={seccionData} />;
}

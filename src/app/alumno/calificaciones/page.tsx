// src/app/alumno/calificaciones/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getCalificacionesAlumno } from '@/lib/api';
import { CalificacionesAlumnoData } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CalificacionesTable } from '@/components/alumno/CalificacionesTable';
import { TendenciaProgresoChart } from '@/components/alumno/TendenciaProgresoChart';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AlumnoCalificacionesPage() {
  const [data, setData] = useState<CalificacionesAlumnoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [selectedPeriodo, setSelectedPeriodo] = useState('Semestre 1');
  const [selectedCurso, setSelectedCurso] = useState('Todos los cursos');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCalificacionesAlumno(selectedPeriodo, selectedCurso);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las calificaciones del alumno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriodo, selectedCurso]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <TableSkeleton rows={5} />
          </div>
          <div className="lg:col-span-4">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No pudimos cargar tus calificaciones"
        message={error}
        onRetry={fetchData}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header exactly matching screenshot */}
      <AlumnoHeader
        eyebrow="EQUIPO ACADÉMICO"
        title="Registro de calificaciones del alumno"
        subtitle="Consulta tus resultados y evolución académica"
      />

      {/* Filter Bar */}
      <AlumnoFilterBar
        filters={[
          {
            label: 'Periodo Académico',
            value: selectedPeriodo,
            options: ['Semestre 1', 'Semestre 2', 'Bimestre 1', 'Bimestre 2', 'Bimestre 3', 'Bimestre 4'],
            onChange: setSelectedPeriodo
          },
          {
            label: 'Curso',
            value: selectedCurso,
            options: [
              'Todos los cursos',
              'Matemática',
              'Comunicación',
              'Ciencia y Tecnología',
              'Historia',
              'Inglés'
            ],
            onChange: setSelectedCurso
          }
        ]}
        badgeText="Periodo actual"
        badgeVariant="accent"
      />

      {/* Content Columns: Table Left + Tendencia Right */}
      {data && data.cursos.length === 0 ? (
        <EmptyState
          title="No hay calificaciones para este filtro"
          description="Selecciona otro periodo o curso para consultar tus notas registradas."
          actionText="Restablecer filtros"
          onAction={() => {
            setSelectedPeriodo('Semestre 1');
            setSelectedCurso('Todos los cursos');
          }}
        />
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Table Card (8 cols) */}
          <div className="lg:col-span-8">
            <CalificacionesTable
              cursos={data.cursos}
              fechaCorte={data.fechaCorte}
            />
          </div>

          {/* Right Card: KPI & Tendencia (4 cols) */}
          <div className="lg:col-span-4">
            <TendenciaProgresoChart
              promedioGeneral={data.promedioGeneral}
              comparativaPeriodo={data.comparativaPeriodo}
              tendencia={data.tendenciaProgreso}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

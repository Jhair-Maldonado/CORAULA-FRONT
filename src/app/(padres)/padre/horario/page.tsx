// src/app/(padres)/padre/horario/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { getHorario } from '@/lib/api';
import { HorarioSemanaPadre } from '@/types/padre';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Tabs,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { Clock01Icon, Location01Icon, TeacherIcon } from 'hugeicons-react';

export default function HorarioPage() {
  const { selectedHijo, selectedHijoId } = usePadre();
  const [horario, setHorario] = useState<HorarioSemanaPadre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diaActivo, setDiaActivo] = useState('Lunes');

  const fetchData = async () => {
    if (!selectedHijoId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getHorario(selectedHijoId);
      setHorario(data);
    } catch (err) {
      console.error('Error cargando horario:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el horario escolar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedHijoId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar el horario"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  if (!selectedHijo) {
    return (
      <div className="py-12">
        <EmptyState
          title="Seleccione un estudiante"
          description="Seleccione a su hijo para consultar la distribución de clases semanal."
        />
      </div>
    );
  }

  const diaData = horario.find((h) => h.dia === diaActivo) || horario[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
          ORGANIZACIÓN SEMANAL DE CLASES
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
          Horario Escolar Semanal
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Cronograma de materias, aulas y docentes para{' '}
          <strong className="text-[#111827]">{selectedHijo.nombreCompleto}</strong> ({selectedHijo.grado} &quot;{selectedHijo.seccion}&quot;).
        </p>
      </div>

      {/* Tabs por Día */}
      <Tabs
        tabs={[
          { id: 'Lunes', label: 'Lunes' },
          { id: 'Martes', label: 'Martes' },
          { id: 'Miércoles', label: 'Miércoles' },
          { id: 'Jueves', label: 'Jueves' },
          { id: 'Viernes', label: 'Viernes' },
        ]}
        activeTab={diaActivo}
        onChange={setDiaActivo}
      />

      {/* Bloques de Clase del Día Seleccionado */}
      {!diaData || diaData.bloques.length === 0 ? (
        <EmptyState
          title="No hay clases programadas"
          description={`No se han registrado asignaturas para el día ${diaActivo}.`}
        />
      ) : (
        <div className="space-y-4">
          {diaData.bloques.map((bloque, index) => (
            <React.Fragment key={bloque.id}>
              {/* Insertar recreo entre bloques según horario estándar */}
              {index === 2 && (
                <div className="p-3 bg-amber-50/70 border border-dashed border-amber-300 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
                  <Clock01Icon size={16} />
                  <span>11:00 AM - 11:30 AM · Receso y Refrigerio General</span>
                </div>
              )}

              <Card className="hover:border-[#BE123C]/40 transition-all">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Time and Subject */}
                  <div className="flex items-center gap-4">
                    <div className="w-24 sm:w-28 p-2.5 bg-slate-100 rounded-xl text-center shrink-0 border border-slate-200">
                      <span className="text-[10px] font-extrabold uppercase text-[#6B7280] block">
                        Horario
                      </span>
                      <strong className="text-xs sm:text-sm font-black text-[#111827]">
                        {bloque.horaInicio} - {bloque.horaFin}
                      </strong>
                    </div>

                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-[#111827]">
                        {bloque.curso}
                      </h4>
                      <p className="text-xs text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                        <TeacherIcon size={14} className="text-[#BE123C]" />
                        <span>Docente: <strong className="text-[#111827]">{bloque.docente}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Classroom location pill */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200">
                      <Location01Icon size={14} className="text-slate-500" />
                      <span>{bloque.salon}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

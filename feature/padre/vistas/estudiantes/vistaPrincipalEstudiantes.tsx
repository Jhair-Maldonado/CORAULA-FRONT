'use client';

import React from 'react';
import {
  Folder01Icon,
  InformationCircleIcon,
  ReloadIcon,
  UserGroupIcon,
  CheckmarkBadge01Icon,
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useApodEstudiantes } from './useApodEstudiantes';
import { SelectorHijo } from './components/SelectorHijo';
import { TarjetaHijoVinculado } from './components/TarjetaHijoVinculado';
import { SinEstudiantesVinculados } from './components/SinEstudiantesVinculados';

export function ApodHijoView() {
  const { setSelectedHijoId } = usePadre();

  const {
    estudiantes,
    selectedStudent,
    selectedStudentId,
    setSelectedStudentId,
    loading,
    error,
    errorCode,
    isEmpty,
    refetch,
  } = useApodEstudiantes();

  // Sincronizar selección con el contexto global de Padre
  const handleSelectStudent = (id: string | number) => {
    setSelectedStudentId(id);
    setSelectedHijoId(String(id));
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in max-w-[1200px] mx-auto py-6 px-3 sm:px-6">
      {/* 1. Encabezado Principal y Selector Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Folder01Icon size={16} /> Portal del Apoderado • Gestión Familiar
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Mis Estudiantes Vinculados
          </h1>
          <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
            Consulta y selección del estudiante para seguimiento académico y control de asistencia (RF-26).
          </p>
        </div>

        {/* Acciones Superiores: Selector de Hijo y Botón de Recarga */}
        <div className="flex flex-wrap items-center gap-2.5">
          {estudiantes.length > 1 && (
            <SelectorHijo
              estudiantes={estudiantes}
              selectedStudentId={selectedStudentId}
              onSelectStudent={handleSelectStudent}
              disabled={loading}
            />
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            title="Actualizar lista de estudiantes"
            className="w-9 h-9 rounded-xl border border-line bg-white flex items-center justify-center text-muted hover:text-ink hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <ReloadIcon size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Banner Informativo del Vínculo */}
      <div
        role="status"
        className="mb-6 p-4 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-800 shadow-2xs flex flex-col sm:flex-row items-start gap-3.5"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <InformationCircleIcon size={18} />
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-900">
              Vínculo Oficial de Apoderado
            </span>
            <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
              Periodo 2026
            </span>
          </div>
          <p className="text-muted font-medium">
            Al seleccionar un estudiante, sus calificaciones, asistencias, justificaciones e incidencias se sincronizan automáticamente en todos los módulos del portal.
          </p>
        </div>
      </div>

      {/* 3. Estados de Carga, Error, Vacío y Contenido */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState
          title={
            errorCode === '403'
              ? 'Acceso restringido'
              : errorCode === '401'
              ? 'Sesión expirada'
              : 'Error al consultar estudiantes'
          }
          message={error}
          onRetry={refetch}
        />
      ) : isEmpty ? (
        <SinEstudiantesVinculados onRetry={refetch} isRetrying={loading} />
      ) : (
        <div className="space-y-6">
          {/* Estudiante Activo Seleccionado */}
          {selectedStudent && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <CheckmarkBadge01Icon size={16} className="text-accent" />
                  <span>Estudiante Activo en el Portal</span>
                </h2>
                <span className="text-[11px] text-muted font-medium">
                  {selectedStudent.grade} - Sección {selectedStudent.sectionName}
                </span>
              </div>

              <TarjetaHijoVinculado
                estudiante={selectedStudent}
                isActive={true}
                showActions={true}
              />
            </div>
          )}

          {/* Lista de todos los estudiantes si tiene más de 1 */}
          {estudiantes.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <UserGroupIcon size={16} className="text-slate-500" />
                  <span>Todos los Estudiantes a su Cargo ({estudiantes.length})</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">
                  Haga clic para alternar
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {estudiantes.map((estudiante) => {
                  const isCurrentActive =
                    String(estudiante.studentId) === String(selectedStudentId);

                  return (
                    <TarjetaHijoVinculado
                      key={estudiante.studentId}
                      estudiante={estudiante}
                      isActive={isCurrentActive}
                      onSelect={() => handleSelectStudent(estudiante.studentId)}
                      showActions={false}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

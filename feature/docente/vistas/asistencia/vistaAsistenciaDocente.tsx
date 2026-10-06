// feature/docente/vistas/asistencia/vistaAsistenciaDocente.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Save,
  Users
} from 'lucide-react';
import {
  getAsistenciaCursoDocente,
  guardarAsistenciaDocente,
  getCursosDocente
} from '@/lib/api';
import {
  AsistenciaCursoDocente,
  EstudianteAsistenciaDocente,
  CursoDocente
} from '@/types/docentes';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export default function VistaAsistenciaDocente() {
  const router = useRouter();
  const { cursoActivo, setCursoActivo } = useDocenteSession();
  const [cursos, setCursos] = useState<CursoDocente[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState(cursoActivo?.id || 'mat-3a');
  const [selectedMes, setSelectedMes] = useState('Septiembre 2026');

  const [data, setData] = useState<AsistenciaCursoDocente | null>(null);
  const [estudiantes, setEstudiantes] = useState<EstudianteAsistenciaDocente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchCursos = async () => {
    try {
      const res = await getCursosDocente();
      setCursos(res);
      if (res.length > 0 && !selectedCursoId) {
        setSelectedCursoId(res[0].id);
      }
    } catch (err) {
      console.error('Error al cargar cursos:', err);
    }
  };

  const fetchAsistencia = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAsistenciaCursoDocente(selectedCursoId, selectedMes);
      setData(res);
      setEstudiantes(res.estudiantes);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar la lista de asistencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  useEffect(() => {
    fetchAsistencia();
  }, [selectedCursoId, selectedMes]);

  const handleUpdateEstado = (estudianteId: string, nuevoEstado: EstudianteAsistenciaDocente['estadoHoy']) => {
    setEstudiantes((prev) =>
      prev.map((est) =>
        est.id === estudianteId ? { ...est, estadoHoy: nuevoEstado } : est
      )
    );
  };

  const handleMarcarTodos = (estado: EstudianteAsistenciaDocente['estadoHoy']) => {
    setEstudiantes((prev) =>
      prev.map((est) => ({ ...est, estadoHoy: estado }))
    );
  };

  const handleGuardar = async () => {
    try {
      setSaving(true);
      const registros = estudiantes.map((e) => ({
        estudianteId: e.id,
        estado: e.estadoHoy
      }));
      await guardarAsistenciaDocente(selectedCursoId, registros);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error al guardar asistencia:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && cursos.length === 0) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No pudimos cargar el control de asistencia"
        message={error}
        onRetry={fetchAsistencia}
      />
    );
  }

  // Métricas calculadas
  const promedioAsistencia = estudiantes.length > 0
    ? Math.round(estudiantes.reduce((acc, e) => acc + e.asistenciaPorcentaje, 0) / estudiantes.length)
    : 0;

  const totalIncidencias = estudiantes.reduce((acc, e) => acc + e.incidencias, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header con botón Volver y botón Ver Notas (Frame Ud5N0) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/docente')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#64748B] hover:text-[#111827] transition-colors cursor-pointer border border-[#E5E7EB]"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
              {data ? `${data.cursoNombre} - ${data.grado}` : 'Control de Asistencia'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Registro biométrico y diario de asistencia escolar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/docente/notas"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#111827] text-[#111827] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Award size={16} />
            <span>Ver Notas</span>
          </Link>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>La asistencia diaria se ha actualizado y sincronizado correctamente con el servidor.</span>
        </div>
      )}

      {/* Contenedor de Filtros (Frame Ud5N0 Filters Container) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Selector Grado / Sección */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFE4E6] text-[#BE123C] flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Grado / Sección
            </span>
            <select
              value={selectedCursoId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedCursoId(newId);
                const found = cursos.find((c) => c.id === newId);
                if (found) setCursoActivo(found);
              }}
              className="w-full text-xs font-bold text-[#111827] bg-transparent border-none p-0 focus:outline-hidden cursor-pointer"
            >
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.grado})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selector Mes */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Mes
            </span>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="w-full text-xs font-bold text-[#111827] bg-transparent border-none p-0 focus:outline-hidden cursor-pointer"
            >
              <option value="Septiembre 2026">Septiembre 2026</option>
              <option value="Octubre 2026">Octubre 2026</option>
              <option value="Noviembre 2026">Noviembre 2026</option>
            </select>
          </div>
        </div>

        {/* KPI Asistencia Promedio */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Asistencia promedio
            </span>
            <span className="text-base font-extrabold text-[#111827]">
              {promedioAsistencia}%
            </span>
          </div>
        </div>

        {/* KPI Incidencias */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Total incidencias
            </span>
            <span className="text-base font-extrabold text-[#111827]">
              {totalIncidencias} registradas
            </span>
          </div>
        </div>
      </div>

      {/* Barra de acción rápida para marcar todos */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl border border-[#E5E7EB]">
        <span className="text-xs font-bold text-[#64748B]">
          Marcar asistencia para hoy ({estudiantes.length} estudiantes):
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMarcarTodos('Presente')}
            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors"
          >
            Todos Presentes
          </button>
          <button
            type="button"
            onClick={() => handleMarcarTodos('Tardanza')}
            className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors"
          >
            Todos Tardanza
          </button>
          <button
            type="button"
            onClick={() => handleMarcarTodos('Falta')}
            className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors"
          >
            Todos Falta
          </button>
        </div>
      </div>

      {/* Lista detallada de Estudiantes (Frame Ud5N0 Student List) */}
      <div className="flex flex-col gap-3">
        {estudiantes.map((est) => (
          <div
            key={est.id}
            className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#BE123C]/30 hover:shadow-2xs transition-all"
          >
            {/* Info Alumno con Avatar Circular */}
            <div className="flex items-center gap-3.5 min-w-[200px]">
              <div className="w-10 h-10 rounded-full bg-[#FFE4E6] text-[#BE123C] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#BE123C]/20 shadow-2xs">
                {est.avatar}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#111827]">
                  {est.nombre}
                </h4>
                <span className="text-[11px] text-[#64748B]">
                  Código: {est.id.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Barras de Asistencia y Faltas (Frame Ud5N0) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 max-w-xl">
              {/* Asistencia % */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#64748B]">Asistencia</span>
                  <span className="font-bold text-[#111827]">{est.asistenciaPorcentaje}%</span>
                </div>
                <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${est.asistenciaPorcentaje}%` }}
                  />
                </div>
              </div>

              {/* Faltas % */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#64748B]">Faltas</span>
                  <span className="font-bold text-[#111827]">{est.faltasPorcentaje}%</span>
                </div>
                <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${est.faltasPorcentaje}%` }}
                  />
                </div>
              </div>

              {/* Incidencias Badge */}
              <div className="flex flex-col gap-1 justify-center sm:items-center">
                <span className="text-[10px] font-semibold text-[#64748B]">Incidencias</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                    est.incidencias > 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-[#F3F4F6] text-[#64748B]'
                  }`}
                >
                  {est.incidencias} {est.incidencias === 1 ? 'Incidencia' : 'Incidencias'}
                </span>
              </div>
            </div>

            {/* Botones de Marcación Estado Hoy */}
            <div className="flex items-center gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5E7EB]">
              {(['Presente', 'Tardanza', 'Falta', 'Justificada'] as const).map((estado) => {
                const isSelected = est.estadoHoy === estado;

                let activeClasses = '';
                if (estado === 'Presente') activeClasses = 'bg-emerald-600 text-white font-bold';
                else if (estado === 'Tardanza') activeClasses = 'bg-amber-500 text-white font-bold';
                else if (estado === 'Falta') activeClasses = 'bg-rose-600 text-white font-bold';
                else activeClasses = 'bg-blue-600 text-white font-bold';

                return (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => handleUpdateEstado(est.id, estado)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer font-medium ${
                      isSelected
                        ? activeClasses
                        : 'bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB] hover:text-[#111827]'
                    }`}
                  >
                    {estado === 'Presente'
                      ? 'P'
                      : estado === 'Tardanza'
                      ? 'T'
                      : estado === 'Falta'
                      ? 'F'
                      : 'J'}
                    <span className="hidden xl:inline ml-1">{estado}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// feature/docente/vistas/notas/vistaNotasDocente.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  ClipboardCheck,
  Save,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  getNotasCursoDocente,
  guardarNotasDocente,
  getCursosDocente
} from '@/lib/api';
import {
  NotasCursoDocente,
  RegistroNotaEstudianteDocente,
  CursoDocente
} from '@/types/docentes';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export default function VistaNotasDocente() {
  const router = useRouter();
  const { cursoActivo, setCursoActivo } = useDocenteSession();
  const [cursos, setCursos] = useState<CursoDocente[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState(cursoActivo?.id || 'mat-3a');
  const [selectedMes, setSelectedMes] = useState('Septiembre 2026');
  const [selectedPeriodo, setSelectedPeriodo] = useState('3er Bimestre');

  const [data, setData] = useState<NotasCursoDocente | null>(null);
  const [estudiantes, setEstudiantes] = useState<RegistroNotaEstudianteDocente[]>([]);
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

  const fetchNotas = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getNotasCursoDocente(selectedCursoId, selectedMes, selectedPeriodo);
      setData(res);
      setEstudiantes(res.estudiantes);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las calificaciones del curso');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  useEffect(() => {
    fetchNotas();
  }, [selectedCursoId, selectedMes, selectedPeriodo]);

  const handleNotaChange = (
    estudianteId: string,
    campo: keyof Omit<RegistroNotaEstudianteDocente, 'estudianteId' | 'nombre' | 'notaFinal'>,
    valorStr: string
  ) => {
    const valorNum = Math.min(20, Math.max(0, Number(valorStr) || 0));

    setEstudiantes((prev) =>
      prev.map((est) => {
        if (est.estudianteId !== estudianteId) return est;

        const updated = { ...est, [campo]: valorNum };
        // Cálculo del promedio final (P. Entrada + T. clases + Ejercicios + Tareas + R. Cuaderno + P. Salida) / 6
        const suma =
          updated.pasoEntrada +
          updated.trabajoClase +
          updated.ejercicios +
          updated.tareas +
          updated.revisionCuaderno +
          updated.pasoSalida;
        const promedio = Number((suma / 6).toFixed(1));

        return { ...updated, notaFinal: promedio };
      })
    );
  };

  const handleGuardar = async () => {
    try {
      setSaving(true);
      await guardarNotasDocente(selectedCursoId, estudiantes);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error al guardar notas:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportar = () => {
    alert('Generando registro auxiliar en formato Excel/PDF...');
  };

  if (loading && cursos.length === 0) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No pudimos cargar la planilla de notas"
        message={error}
        onRetry={fetchNotas}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header con botón Volver y botón Ver Asistencia (Frame K24L9) */}
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
              {data ? `${data.cursoNombre} - ${data.grado}` : 'Registro de Notas'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Planilla oficial de calificaciones y evaluación por competencias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Ver Asistencia (Frame K24L9) */}
          <Link
            href="/docente/asistencia"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#111827] text-[#111827] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ClipboardCheck size={16} />
            <span>Ver Asistencia</span>
          </Link>

          <button
            type="button"
            onClick={handleExportar}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Guardando...' : 'Guardar Notas'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>Calificaciones guardadas exitosamente en la base de datos central.</span>
        </div>
      )}

      {/* Contenedor de Filtros (Frame K24L9 Filters Container) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Periodo / Bimestre */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <span className="font-extrabold text-sm">3B</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Periodo lectivo
            </span>
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="w-full text-xs font-bold text-[#111827] bg-transparent border-none p-0 focus:outline-hidden cursor-pointer"
            >
              <option value="3er Bimestre">3er Bimestre</option>
              <option value="4to Bimestre">4to Bimestre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Calificaciones (Columnas exactas de cary.pen K24L9) */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[200px]">Estudiante</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">P. Entrada</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">T. clases</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">Ejercicios</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">Tareas</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">R. Cuaderno</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">P. Salida</th>
                <th className="py-3.5 px-4 text-center min-w-[90px] bg-[#F8FAFC]">Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {estudiantes.map((est) => {
                const esAprobado = est.notaFinal >= 13;

                return (
                  <tr key={est.estudianteId} className="hover:bg-[#F9FAFB] transition-colors">
                    {/* Nombre del alumno */}
                    <td className="py-3 px-4 font-bold text-[#111827]">
                      {est.nombre}
                    </td>

                    {/* P. Entrada */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={est.pasoEntrada}
                        onChange={(e) =>
                          handleNotaChange(est.estudianteId, 'pasoEntrada', e.target.value)
                        }
                        className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* T. clases */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={est.trabajoClase}
                        onChange={(e) =>
                          handleNotaChange(est.estudianteId, 'trabajoClase', e.target.value)
                        }
                        className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* Ejercicios */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={est.ejercicios}
                        onChange={(e) =>
                          handleNotaChange(est.estudianteId, 'ejercicios', e.target.value)
                        }
                        className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* Tareas */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={est.tareas}
                        onChange={(e) =>
                          handleNotaChange(est.estudianteId, 'tareas', e.target.value)
                        }
                        className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* R. Cuaderno */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={est.revisionCuaderno}
                        onChange={(e) =>
                          handleNotaChange(est.estudianteId, 'revisionCuaderno', e.target.value)
                        }
                        className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* P. Salida */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={est.pasoSalida}
                        onChange={(e) =>
                          handleNotaChange(est.estudianteId, 'pasoSalida', e.target.value)
                        }
                        className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* Nota Final */}
                    <td className="py-2.5 px-4 text-center bg-[#F8FAFC]">
                      <span
                        className={`inline-block px-3 py-1 rounded-md font-extrabold text-xs ${
                          esAprobado
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {est.notaFinal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

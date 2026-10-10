// feature/docente/vistas/notas/vistaNotasDocente.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Save,
  Download,
} from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import type { Bimester, EvaluationStudentRow, TeacherEvaluationData, TeacherEvaluationSelection } from '@/types/evaluationApi';
import { evaluationColumns, matchesEvaluationContext, participationGrade } from '@/lib/evaluationPreparation';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

// Configuration and records must come from an authorized teacher read contract.
// Management routes are deliberately not used from the teacher portal.
export default function VistaNotasDocente({ evaluation, bimesters = [], bimestersLoading = false, bimestersError, evaluationLoading = false, evaluationError, onSelectionChange, onRetryBimesters, onRetryEvaluation }: {
  evaluation?: TeacherEvaluationData;
  bimesters?: Bimester[];
  bimestersLoading?: boolean;
  bimestersError?: string;
  evaluationLoading?: boolean;
  evaluationError?: string;
  onSelectionChange?: (selection: TeacherEvaluationSelection | null) => void;
  onRetryBimesters?: () => void;
  onRetryEvaluation?: () => void;
} = {}) {
  const router = useRouter();
  const { cursos, cursoActivo, setCursoActivo, isLoading, coursesError, refreshCursos } = useDocenteSession();
  const [selectedId, setSelectedId] = useState(cursoActivo?.id ?? '');
  const [selectedBimesterId, setSelectedBimesterId] = useState('');
  const bimester = bimesters.find(b => String(b.id) === selectedBimesterId);
  const course = cursos.find(c => String(c.sectionCourseId) === selectedId) ?? cursos[0];
  const selectedCursoId = course ? String(course.sectionCourseId) : '';
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; rows?: EvaluationStudentRow[]; error?: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const key = JSON.stringify([selectedCursoId, revision]);
  const loading = isLoading || (!!selectedCursoId && result?.key !== key);
  const error = coursesError ?? (result?.key === key ? result.error : undefined);
  const scopedEvaluation = !evaluationLoading && !evaluationError && !bimestersLoading && !bimestersError && matchesEvaluationContext(evaluation, course?.sectionCourseId, course?.courseId, bimester) ? evaluation : undefined;
  const config = scopedEvaluation?.configuration;
  const { manual: criteria, participation } = evaluationColumns(config);
  const estudiantes = result?.key === key ? result.rows ?? [] : [];
  const data = course ? { cursoNombre: course.name, grado: course.grade + '° ' + course.sectionName } : null;
  const fetchNotas = () => { if (coursesError) void refreshCursos(); else setRevision(n => n + 1); };
  const courseId = course?.courseId;
  const sectionId = course?.sectionId;
  const bimesterId = !bimestersLoading && !bimestersError ? bimester?.id : undefined;
  const academicPeriodId = !bimestersLoading && !bimestersError ? bimester?.academicPeriodId : undefined;
  useEffect(() => {
    // The future N2 consumer owns the authorized fetch and its loading/error state.
    onSelectionChange?.(courseId !== undefined && sectionId !== undefined && selectedCursoId ? {
      sectionCourseId: Number(selectedCursoId), courseId, sectionId,
      bimesterId: bimesterId ?? null, academicPeriodId: academicPeriodId ?? null,
    } : null);
  }, [selectedCursoId, courseId, sectionId, bimesterId, academicPeriodId, onSelectionChange]);
  useEffect(() => {
    if (!selectedCursoId) return;
    let current = true;
    teacherCoursesService.getStudents(Number(selectedCursoId)).then(students => {
      if (current) setResult({ key, rows: students.map(s => ({ enrollmentId: s.enrollmentId, studentId: s.studentId, fullName: s.fullName, grades: {}, pa: null })) });
    }).catch(error => { if (current) setResult({ key, error: teacherCoursesErrorMessage(error) }); });
    return () => { current = false; };
  }, [selectedCursoId, key]);

  if (loading && cursos.length === 0) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
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
            title="Volver" aria-label="Volver"
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
            disabled title="Exportación pendiente de integración" aria-label="Exportar"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            aria-describedby="grades-integration"
            disabled
            className="flex items-center gap-1.5 px-4 py-2 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Save size={16} />
            <span>Guardar Notas</span>
          </button>
        </div>
      </div>

      <p id="grades-integration" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">Los cambios son temporales. El guardado de notas está pendiente de integración.</p>

      {/* Contenedor de Filtros (Frame K24L9 Filters Container) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              aria-label="Grado / Sección"
              value={selectedCursoId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedId(newId);
                setDrafts({});
                const found = cursos.find((c) => String(c.sectionCourseId) === newId);
                if (found) setCursoActivo({ id: String(found.sectionCourseId), nombre: found.name, grado: found.grade + '° grado' });
              }}
              className="w-full text-xs font-bold text-[#111827] bg-transparent border-none p-0 focus-visible:outline-[#BE123C] cursor-pointer"
            >
              {cursos.map((c) => (
                <option key={c.sectionCourseId} value={c.sectionCourseId}>
                  {c.name} ({c.grade}° {c.sectionName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Periodo / Bimestre */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ClipboardCheck size={18} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Bimestre
            </span>
            <select aria-label="Bimestre" aria-busy={bimestersLoading} disabled={bimestersLoading || !!bimestersError || bimesters.length === 0} value={bimester?.id ?? ''} onChange={e => { setSelectedBimesterId(e.target.value); setDrafts({}); }} className="w-full text-xs font-bold text-[#111827] bg-transparent border-none p-0 focus-visible:outline-[#BE123C] cursor-pointer disabled:opacity-50">
              <option value="">{bimestersLoading ? 'Cargando bimestres...' : bimesters.length ? 'Selecciona un bimestre' : 'Pendiente de configuración'}</option>
              {bimesters.map(b => <option key={b.id} value={b.id}>{b.name} ({b.status})</option>)}
            </select>
          </div>
        </div>
      </div>

      {bimestersError && <ErrorState title="No pudimos cargar los bimestres" message={bimestersError} onRetry={onRetryBimesters} />}
      {evaluationError && <ErrorState title="No pudimos cargar los criterios y calificaciones" message={evaluationError} onRetry={onRetryEvaluation} />}
      {evaluationLoading && <p role="status" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">Cargando criterios y calificaciones...</p>}

      {loading ? <div role="status"><CardSkeleton /><span className="sr-only">Cargando estudiantes...</span></div> : <>
        {!config && !evaluationLoading && !evaluationError && !bimestersError && <p role="status" className="text-xs text-[#64748B]">Los criterios se mostrarán cuando esté disponible la configuración del curso y periodo.</p>}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs"><div className="overflow-x-auto">
          <table className="w-full text-left border-collapse"><thead><tr className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-4 min-w-[200px]">Estudiante</th>
            {criteria.map(c => <th scope="col" key={c.id} className="py-3.5 px-3 text-center min-w-[90px]">{c.name}</th>)}
            <th scope="col" title={participation?.name ?? 'Participación académica pendiente de configuración'} className="py-3.5 px-4 text-center min-w-[90px] bg-[#F8FAFC]">PA<span className="sr-only">, Participación académica, solo lectura</span></th>
          </tr></thead><tbody className="divide-y divide-[#E5E7EB] text-xs">
            {estudiantes.map(student => {
              const supplied = scopedEvaluation?.records.find(row => row.enrollmentId === student.enrollmentId && row.studentId === student.studentId);
              const pa = participationGrade(supplied, participation);
              return <tr key={student.enrollmentId} className="hover:bg-[#F9FAFB] transition-colors">
                <th scope="row" className="py-3 px-4 font-bold text-[#111827]">{student.fullName}</th>
                {criteria.map(c => {
                  const draftKey = JSON.stringify([selectedCursoId, config?.academicPeriodId, bimester?.id, c.id, student.enrollmentId]);
                  return <td key={c.id} className="py-2.5 px-2 text-center"><input aria-label={c.name + ', ' + student.fullName} type="number" min="0" max="20" step="any" value={drafts[draftKey] ?? supplied?.grades[c.id] ?? ''} onChange={e => setDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))} className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden" /></td>;
                })}
                <td className="py-2.5 px-4 text-center bg-[#F8FAFC]"><output aria-label={'PA, ' + student.fullName + ', solo lectura'} className="inline-block px-3 py-1 rounded-md font-extrabold text-xs bg-[#F3F4F6] text-[#64748B]">{pa ?? 'Pendiente'}</output></td>
              </tr>;
            })}
            {estudiantes.length === 0 && <tr><td colSpan={criteria.length + 2} className="p-6 text-center text-[#64748B]">{course ? 'No hay estudiantes con matrícula activa.' : 'No hay cursos asignados.'}</td></tr>}
          </tbody></table>
        </div></div>
      </>}
    </div>
  );
}

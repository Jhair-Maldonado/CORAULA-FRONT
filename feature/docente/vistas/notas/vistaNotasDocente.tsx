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
import type { EvaluationStudentRow } from '@/types/evaluationApi';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';
import { MANUAL_GRADES_CONTRACT_VERIFIED } from '@/types/teacherGradesApi';
import { useTeacherGrades } from '@/hooks/useTeacherGrades';
import { canEnterFirstGrade, gradeInputError, manualSheetColumns } from '@/lib/manualGrades';
import { evaluationColumns, participationGrade } from '@/lib/evaluationPreparation';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export default function VistaNotasDocente() {
  const { cursos, cursoActivo } = useDocenteSession();
  const [selectedId, setSelectedId] = useState(cursoActivo?.id ?? '');
  const course = cursos.find(c => String(c.sectionCourseId) === selectedId) ?? cursos[0];
  // Remount only the academic context, preserving the existing visual structure.
  return <NotasDelCurso key={course?.sectionCourseId ?? 'empty'} course={course} selectCourse={setSelectedId} />;
}

function NotasDelCurso({ course, selectCourse }: { course?: TeacherCourseSummaryResponse; selectCourse: (id: string) => void }) {
  const router = useRouter();
  const { cursos, setCursoActivo, isLoading, coursesError, refreshCursos } = useDocenteSession();
  const selectedCursoId = course ? String(course.sectionCourseId) : '';
  const grades = useTeacherGrades(course?.sectionCourseId, course?.courseId);
  const { bimesters, bimestersLoading, bimestersError, evaluationLoading, evaluationError, bimester } = grades;
  const scopedEvaluation = grades.evaluation;
  const config = scopedEvaluation?.configuration;
  const criteria = manualSheetColumns(scopedEvaluation);
  const { participation } = evaluationColumns(config);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; rows?: EvaluationStudentRow[]; error?: string } | null>(null);
  const key = JSON.stringify([selectedCursoId, revision]);
  const loading = isLoading || (!!selectedCursoId && result?.key !== key && !scopedEvaluation);
  const error = coursesError ?? (result?.key === key && !scopedEvaluation ? result.error : undefined);
  const estudiantes = scopedEvaluation?.records ?? (result?.key === key ? result.rows ?? [] : []);
  const data = course ? { cursoNombre: course.name, grado: course.grade + '° ' + course.sectionName } : null;
  const fetchNotas = () => { if (coursesError) void refreshCursos(); else setRevision(n => n + 1); };
  const onRetryBimesters = grades.refreshBimesters;
  const onRetryEvaluation = grades.refreshSheet;
  useEffect(() => {
    if (!selectedCursoId) return;
    let current = true;
    teacherCoursesService.getStudents(Number(selectedCursoId)).then(students => {
      if (current) setResult({ key, rows: students.map(s => ({ enrollmentId: s.enrollmentId, studentId: s.studentId, fullName: s.fullName, grades: {}, pa: null })) });
    }).catch(error => { if (current) setResult({ key, error: teacherCoursesErrorMessage(error) }); });
    return () => { current = false; };
  }, [selectedCursoId, key]);
  const hasDrafts = Object.values(grades.drafts).some(value => value !== '');
  const invalidDrafts = Object.values(grades.drafts).some(value => value !== '' && gradeInputError(value));

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
            onClick={() => { void grades.save(); }}
            disabled={!MANUAL_GRADES_CONTRACT_VERIFIED || grades.saving || grades.refreshRequired || evaluationLoading || !scopedEvaluation || bimester?.status !== 'ABIERTO' || !hasDrafts || invalidDrafts}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Save size={16} />
            <span>{grades.saving ? 'Registrando...' : 'Guardar Notas'}</span>
          </button>
        </div>
      </div>

      <p id="grades-integration" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">{MANUAL_GRADES_CONTRACT_VERIFIED ? 'Solo primeras notas MANUAL en un bimestre ABIERTO. El registro es individual por celda; las notas existentes son de solo lectura.' : 'El registro de notas aún no está disponible.'}</p>

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
              aria-label="Grado / Sección" disabled={grades.saving}
              value={selectedCursoId}
              onChange={(e) => {
                const newId = e.target.value;
                selectCourse(newId);
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
            <select aria-label="Bimestre" aria-busy={bimestersLoading} disabled={grades.saving || bimestersLoading || !!bimestersError || bimesters.length === 0} value={bimester?.id ?? ''} onChange={e => grades.selectBimester(e.target.value)} className="w-full text-xs font-bold text-[#111827] bg-transparent border-none p-0 focus-visible:outline-[#BE123C] cursor-pointer disabled:opacity-50">
              <option value="">{bimestersLoading ? 'Cargando bimestres...' : bimesters.length ? 'Selecciona un bimestre' : 'Sin bimestres disponibles'}</option>
              {bimesters.map(b => <option key={b.id} value={b.id}>{b.name} ({b.status})</option>)}
            </select>
          </div>
        </div>
      </div>

      {bimestersError && <ErrorState title="No pudimos cargar los bimestres" message={bimestersError} onRetry={onRetryBimesters} />}
      {course && !bimestersLoading && !bimestersError && bimesters.length === 0 && <p role="status" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">No hay bimestres disponibles para este curso-sección.</p>}
      {grades.saveError && <ErrorState title="No se completó el registro" message={grades.saveError} onRetry={grades.refreshSheet} />}
      {grades.saveMessage && <p role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">{grades.saveMessage}</p>}
      {grades.refreshRequired && !grades.saving && <p role="alert" className="text-xs text-rose-700">Debes recargar la planilla antes de volver a registrar notas.</p>}
      {evaluationError && <ErrorState title="No pudimos cargar los criterios y calificaciones" message={evaluationError} onRetry={onRetryEvaluation} />}
      {evaluationLoading && <p role="status" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">Cargando criterios y calificaciones...</p>}

      {loading ? <div role="status"><CardSkeleton /><span className="sr-only">Cargando estudiantes...</span></div> : <>
        {!config && !evaluationLoading && !evaluationError && !bimestersError && <p role="status" className="text-xs text-[#64748B]">Los criterios se mostrarán cuando esté disponible la configuración del curso y periodo.</p>}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs"><div className="overflow-x-auto">
          <table className="w-full text-left border-collapse"><thead><tr className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-4 min-w-[200px]">Estudiante</th>
            {criteria.map(c => <th scope="col" key={c.id} className="py-3.5 px-3 text-center min-w-[90px]">{c.name}{!c.active && <span className="block normal-case font-normal">Inactivo · solo lectura</span>}</th>)}
            <th scope="col" title={participation?.name ?? 'Participación académica pendiente de configuración'} className="py-3.5 px-4 text-center min-w-[90px] bg-[#F8FAFC]">PA<span className="sr-only">, Participación académica, solo lectura</span></th>
          </tr></thead><tbody className="divide-y divide-[#E5E7EB] text-xs">
            {estudiantes.map(student => {
              const supplied = scopedEvaluation?.records.find(row => row.enrollmentId === student.enrollmentId && row.studentId === student.studentId);
              const pa = participationGrade(supplied, participation);
              return <tr key={student.enrollmentId} className="hover:bg-[#F9FAFB] transition-colors">
                <th scope="row" className="py-3 px-4 font-bold text-[#111827]">{student.fullName}</th>
                {criteria.map(c => {
                  const draftKey = student.enrollmentId + ':' + c.id;
                  const editable = !!supplied && canEnterFirstGrade(bimester, c, supplied);
                  const draft = grades.drafts[draftKey] ?? '';
                  const inputError = editable && draft !== '' ? gradeInputError(draft) : null;
                  return <td key={c.id} className="py-2.5 px-2 text-center"><input aria-label={c.name + ', ' + student.fullName + (editable ? '' : ', solo lectura')} aria-invalid={!!inputError} aria-describedby={inputError ? 'grade-error-' + draftKey : undefined} title={editable ? 'Primera nota: 0 a 20, máximo dos decimales' : 'Nota registrada, criterio inactivo o bimestre no abierto'} type="text" inputMode="decimal" readOnly={!editable} disabled={grades.saving || grades.refreshRequired} value={supplied?.grades[c.id] ?? (editable ? draft : '')} onChange={e => { if (editable) grades.changeDraft(student.enrollmentId, c.id, e.target.value); }} className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden" />{inputError && <p id={'grade-error-' + draftKey} className="text-[10px] text-rose-700 mt-1 max-w-32 mx-auto">{inputError}</p>}</td>;
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

// feature/docente/vistas/notas/vistaNotasDocente.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Save,
  Download,
} from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import { bimesterStatusLabels, type EvaluationStudentRow } from '@/types/evaluationApi';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';
import { MANUAL_GRADES_CONTRACT_VERIFIED } from '@/types/teacherGradesApi';
import { studentLevelLabels } from '@/adapters/studentAdapter';
import { useTeacherGrades } from '@/hooks/useTeacherGrades';
import { canCorrectGrade, canEnterFirstGrade, gradeInputError, manualSheetColumns } from '@/lib/manualGrades';
import ModalCorreccionNota, { type CorrectionTarget } from './ModalCorreccionNota';
import PlazoRegistroNotas from './PlazoRegistroNotas';
import { evaluationColumns, participationGrade } from '@/lib/evaluationPreparation';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import ResultadosBimestre from '@/components/evaluation/ResultadosBimestre';
import { teacherGradesService } from '@/services/teacher/teacherGradesService';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export interface VistaNotasDocenteProps {
  /** Curso-sección de la planilla (viene de la ruta `/docente/notas/salon/<id>`). */
  sectionCourseId: number;
  /** Bimestre inicial (`?bimestre=<id>`); se ignora si no existe o está ANULADO. */
  initialBimesterId?: string;
}

const catalogHref = (bimesterId?: string | number) => '/docente/notas' + (bimesterId ? `?bimestre=${bimesterId}` : '');

/**
 * Única planilla de notas del docente (R10). El curso se resuelve contra los cursos asignados de la
 * sesión: si el salón no está entre ellos no se consulta nada ni se cae a otro curso.
 */
export default function VistaNotasDocente({ sectionCourseId, initialBimesterId }: VistaNotasDocenteProps) {
  const { cursos, isLoading, coursesError, refreshCursos } = useDocenteSession();
  const course = cursos.find(c => c.sectionCourseId === sectionCourseId);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status">
        <CardSkeleton />
        <CardSkeleton />
        <span className="sr-only">Cargando planilla...</span>
      </div>
    );
  }
  if (coursesError) {
    return <ErrorState title="No pudimos cargar la planilla de notas" message={coursesError} onRetry={() => { void refreshCursos(); }} />;
  }
  if (!course) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-5 bg-white border border-line rounded-xl text-sm text-ink">
        <p className="flex items-center gap-2 font-bold"><AlertCircle size={18} className="text-accent shrink-0" aria-hidden="true" />Este salón no está entre tus cursos asignados</p>
        <Link href={catalogHref(initialBimesterId)} className="text-xs font-bold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Volver al catálogo de salones</Link>
      </div>
    );
  }
  // Remount only the academic context: switching course discards bimester, drafts and reads.
  return <NotasDelCurso key={course.sectionCourseId} course={course} initialBimesterId={initialBimesterId} />;
}

function NotasDelCurso({ course, initialBimesterId }: { course: TeacherCourseSummaryResponse; initialBimesterId?: string }) {
  const router = useRouter();
  const { coursesError, refreshCursos } = useDocenteSession();
  const selectedCursoId = String(course.sectionCourseId);
  const grades = useTeacherGrades(course.sectionCourseId, course.courseId, { initialBimesterId });
  const { bimesters, bimestersLoading, bimestersError, evaluationLoading, evaluationError, bimester } = grades;
  const scopedEvaluation = grades.evaluation;
  const config = scopedEvaluation?.configuration;
  const criteria = manualSheetColumns(scopedEvaluation);
  const { participation } = evaluationColumns(config);
  const [revision, setRevision] = useState(0);
  const [correction, setCorrection] = useState<CorrectionTarget | null>(null);
  const [result, setResult] = useState<{ key: string; rows?: EvaluationStudentRow[]; error?: string } | null>(null);
  const key = JSON.stringify([selectedCursoId, revision]);
  const loading = result?.key !== key && !scopedEvaluation;
  const error = coursesError ?? (result?.key === key && !scopedEvaluation ? result.error : undefined);
  const estudiantes = scopedEvaluation?.records ?? (result?.key === key ? result.rows ?? [] : []);
  const fetchNotas = () => { if (coursesError) void refreshCursos(); else setRevision(n => n + 1); };
  const onRetryBimesters = grades.refreshBimesters;
  const onRetryEvaluation = grades.refreshSheet;
  useEffect(() => {
    let current = true;
    teacherCoursesService.getStudents(Number(selectedCursoId)).then(students => {
      if (current) setResult({ key, rows: students.map(s => ({ enrollmentId: s.enrollmentId, studentId: s.studentId, fullName: s.fullName, grades: {}, pa: null })) });
    }).catch(error => { if (current) setResult({ key, error: teacherCoursesErrorMessage(error) }); });
    return () => { current = false; };
  }, [selectedCursoId, key]);
  const resultsSectionCourseId = course.sectionCourseId, resultsBimesterId = bimester?.id;
  const loadResults = useCallback((signal: AbortSignal) => {
    if (!resultsBimesterId) return Promise.reject(new Error('Selecciona un curso y bimestre.'));
    return teacherGradesService.getResults(resultsSectionCourseId, resultsBimesterId, signal);
  }, [resultsSectionCourseId, resultsBimesterId]);
  const criterionName = (criterionId: number) => criteria.find(c => c.id === criterionId)?.name;
  const hasDrafts = Object.values(grades.drafts).some(value => value !== '');
  const invalidDrafts = Object.values(grades.drafts).some(value => value !== '' && gradeInputError(value));
  const tabsBlocked = grades.saving || bimestersLoading || !!bimestersError;
  // The bimester lives in the URL so the catalog link, «Volver» and a reload keep it.
  const pickBimester = (id: string) => {
    if (tabsBlocked || bimesters.find(b => String(b.id) === id)?.status === 'ANULADO') return;
    grades.selectBimester(id);
    router.replace(`/docente/notas/salon/${selectedCursoId}?bimestre=${id}`, { scroll: false });
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-line shadow-2xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <Link
            href={catalogHref(bimester?.id)}
            className="p-2 rounded-lg hover:bg-neutral text-muted hover:text-ink transition-colors border border-line shrink-0"
            title="Volver al catálogo de salones" aria-label="Volver al catálogo de salones"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-soft text-accent">
                {course.code}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-soft text-accent border border-accent/30">
                {studentLevelLabels[course.level]}
              </span>
              {course.area && <span className="text-[10px] font-medium text-muted">· Área: {course.area}</span>}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-ink mt-1">
              {`${course.name} — ${course.grade}° Grado "${course.sectionName}"`}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Planilla oficial de calificaciones y evaluación por competencias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/docente/asistencia?curso=${course.sectionCourseId}`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral hover:bg-ink text-ink hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ClipboardCheck size={16} />
            <span>Ver Asistencia</span>
          </Link>

          <button
            type="button"
            disabled title="Exportación pendiente de integración" aria-label="Exportar"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral text-muted/70 rounded-lg text-xs font-bold shadow-2xs opacity-70 cursor-not-allowed"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            aria-describedby="grades-integration"
            onClick={() => { void grades.save(); }}
            disabled={!MANUAL_GRADES_CONTRACT_VERIFIED || grades.saving || grades.refreshRequired || evaluationLoading || !scopedEvaluation || bimester?.status !== 'ABIERTO' || !hasDrafts || invalidDrafts}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:opacity-90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{grades.saving ? 'Registrando...' : 'Guardar Notas'}</span>
          </button>
        </div>
      </div>

      <p id="grades-integration" className="p-3 bg-white border border-line text-muted rounded-xl text-xs">{MANUAL_GRADES_CONTRACT_VERIFIED ? 'Primeras notas MANUAL en un bimestre ABIERTO, registro individual por celda. Las notas existentes se corrigen con «Editar», indicando motivo y justificación, mientras el plazo esté vigente.' : 'El registro de notas aún no está disponible.'}</p>

      <div className="bg-white p-4 rounded-xl border border-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">Periodo Bimestral:</span>
          {bimestersLoading ? (
            <span role="status" className="text-xs text-muted">Cargando bimestres...</span>
          ) : bimesters.length === 0 ? (
            !bimestersError && <span className="text-xs text-muted">No hay bimestres registrados</span>
          ) : (
            <div role="radiogroup" aria-label="Bimestre" aria-busy={bimestersLoading} className="flex items-center gap-1.5 flex-wrap">
              {bimesters.map(b => {
                const isSelected = bimester?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => pickBimester(String(b.id))}
                    disabled={tabsBlocked || b.status === 'ANULADO'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent ${
                      isSelected ? 'bg-accent text-white shadow-xs' : 'bg-canvas/50 text-ink hover:bg-neutral border border-line'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                      isSelected ? 'bg-white/20 text-white' : b.status === 'ABIERTO' ? 'bg-success text-success-ink' : 'bg-neutral text-muted'
                    }`}>
                      {bimesterStatusLabels[b.status]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {bimester && (
          <span className="text-[11px] font-medium text-muted">
            Estado actual: <strong className={bimester.status === 'ABIERTO' ? 'text-success-ink' : 'text-ink'}>{bimesterStatusLabels[bimester.status]}</strong>
          </span>
        )}
      </div>

      {scopedEvaluation && bimester && bimester.status !== 'ANULADO' && <PlazoRegistroNotas gradeWindow={grades.gradeWindow} />}
      {grades.annulledNotice && <p role="alert" className="flex items-center gap-2 p-3 bg-white border border-warning-ink/30 text-warning-ink rounded-xl text-xs"><AlertCircle size={16} className="shrink-0" aria-hidden="true" /><span>{grades.annulledNotice}</span></p>}
      {bimestersError && <ErrorState title="No pudimos cargar los bimestres" message={bimestersError} onRetry={onRetryBimesters} />}
      {!bimestersLoading && !bimestersError && bimesters.length === 0 && <p role="status" className="p-3 bg-white border border-line text-muted rounded-xl text-xs">No hay bimestres disponibles para este curso-sección.</p>}
      {grades.saveError && <ErrorState title="No se completó el registro" message={grades.saveError} onRetry={grades.refreshSheet} />}
      {grades.saveMessage && <p role="status" className="flex items-center gap-2 p-3 bg-success border border-success-ink/30 text-success-ink rounded-xl text-xs font-semibold"><CheckCircle2 size={16} className="shrink-0" aria-hidden="true" /><span>{grades.saveMessage}</span></p>}
      {grades.refreshRequired && !grades.saving && <p role="alert" className="flex items-center gap-2 p-3 bg-accent-soft border border-accent/30 text-accent rounded-xl text-xs font-semibold"><AlertCircle size={16} className="shrink-0" aria-hidden="true" /><span>Debes recargar la planilla antes de volver a registrar notas.</span></p>}
      {evaluationError && <ErrorState title="No pudimos cargar los criterios y calificaciones" message={evaluationError} onRetry={onRetryEvaluation} />}
      {evaluationLoading && <p role="status" className="p-3 bg-white border border-line text-muted rounded-xl text-xs">Cargando criterios y calificaciones...</p>}

      {loading ? <div role="status"><CardSkeleton /><span className="sr-only">Cargando estudiantes...</span></div> : <>
        {!config && !evaluationLoading && !evaluationError && !bimestersError && <p role="status" className="text-xs text-muted">Los criterios se mostrarán cuando esté disponible la configuración del curso y periodo.</p>}
        <div className="bg-white rounded-xl border border-line overflow-hidden shadow-2xs"><div className="overflow-x-auto">
          <table className="w-full text-left border-collapse"><thead><tr className="bg-canvas/50 border-b border-line text-[11px] font-extrabold text-muted uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-4 min-w-[220px]">Estudiante ({estudiantes.length})</th>
            {criteria.map(c => <th scope="col" key={c.id} className="py-3.5 px-3 text-center min-w-[90px]">{c.name}{!c.active && <span className="block normal-case font-normal">Inactivo · solo lectura</span>}</th>)}
            <th scope="col" title={participation?.name ?? 'Participación académica pendiente de configuración'} className="py-3.5 px-4 text-center min-w-[90px] bg-canvas/50"><span className="block">PA<span className="sr-only">, Participación académica, solo lectura</span></span><span className="block normal-case font-normal text-[9px] text-muted/70">Auto</span></th>
          </tr></thead><tbody className="divide-y divide-line text-xs">
            {estudiantes.map(student => {
              const supplied = scopedEvaluation?.records.find(row => row.enrollmentId === student.enrollmentId && row.studentId === student.studentId);
              const pa = participationGrade(supplied, participation);
              return <tr key={student.enrollmentId} className="hover:bg-canvas/50 transition-colors">
                <th scope="row" className="py-3 px-4 font-bold text-ink">{student.fullName}</th>
                {criteria.map(c => {
                  const draftKey = student.enrollmentId + ':' + c.id;
                  const editable = !!supplied && canEnterFirstGrade(bimester, c, supplied);
                  const draft = grades.drafts[draftKey] ?? '';
                  const inputError = editable && draft !== '' ? gradeInputError(draft) : null;
                  return <td key={c.id} className="py-2.5 px-2 text-center"><input aria-label={c.name + ', ' + student.fullName + (editable ? '' : ', solo lectura')} aria-invalid={!!inputError} aria-describedby={inputError ? 'grade-error-' + draftKey : undefined} title={editable ? 'Primera nota: 0 a 20, máximo dos decimales' : 'Nota registrada, criterio inactivo o bimestre no abierto'} type="text" inputMode="decimal" readOnly={!editable} disabled={grades.saving || grades.refreshRequired} value={supplied?.grades[c.id] ?? (editable ? draft : '')} onChange={e => { if (editable) grades.changeDraft(student.enrollmentId, c.id, e.target.value); }} className={`w-14 text-center py-1 font-semibold rounded-md border transition-colors ${editable ? 'bg-white text-ink border-line focus:border-accent focus:outline-hidden' : 'bg-neutral text-muted border-transparent'}`} />{supplied && canCorrectGrade(bimester, c, supplied, grades.gradeWindow) && <button type="button" aria-label={'Editar ' + c.name + ', ' + student.fullName} disabled={grades.saving || grades.refreshRequired} onClick={() => setCorrection({ gradeId: supplied.gradeIds![c.id]!, studentName: student.fullName, criterionName: c.name, currentGrade: supplied.grades[c.id]! })} className="block mx-auto mt-1 text-[10px] font-bold text-accent hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent">Editar</button>}{inputError && <p id={'grade-error-' + draftKey} className="text-[10px] text-accent mt-1 max-w-32 mx-auto">{inputError}</p>}</td>;
                })}
                <td className="py-2.5 px-4 text-center bg-canvas/50"><output aria-label={'PA, ' + student.fullName + ', solo lectura'} className="inline-block px-3 py-1 rounded-md font-extrabold text-xs bg-neutral text-muted">{pa ?? 'Pendiente'}</output></td>
              </tr>;
            })}
            {estudiantes.length === 0 && <tr><td colSpan={criteria.length + 2} className="p-6 text-center text-muted">No hay estudiantes con matrícula activa.</td></tr>}
          </tbody></table>
        </div></div>
      </>}

      {correction && <ModalCorreccionNota key={correction.gradeId} target={correction} busy={grades.saving} onClose={() => setCorrection(null)} onSubmit={grades.correctGrade} />}
      {scopedEvaluation && bimester && bimester.status !== 'ANULADO' && <ResultadosBimestre load={loadResults} reloadKey={grades.resultsRevision} criterionName={criterionName} />}
    </div>
  );
}

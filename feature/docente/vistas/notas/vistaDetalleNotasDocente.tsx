// feature/docente/vistas/notas/vistaDetalleNotasDocente.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarCheck,
  ClipboardCheck,
  Save,
  Download,
  BarChart3,
  Table,
} from 'lucide-react';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import { bimesterStatusLabels, type Bimester, type EvaluationStudentRow } from '@/types/evaluationApi';
import type { TeacherCourseDetailResponse } from '@/types/teacherCoursesApi';
import { MANUAL_GRADES_CONTRACT_VERIFIED } from '@/types/teacherGradesApi';
import { useTeacherGrades } from '@/hooks/useTeacherGrades';
import { canEnterFirstGrade, gradeInputError, manualSheetColumns } from '@/lib/manualGrades';
import { evaluationColumns, participationGrade } from '@/lib/evaluationPreparation';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import ResultadosBimestre from '@/components/evaluation/ResultadosBimestre';
import { teacherGradesService, teacherGradesErrorMessage } from '@/services/teacher/teacherGradesService';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export default function VistaDetalleNotasDocente() {
  const { id } = useParams<{ id: string }>();
  const sectionCourseId = Number(id);
  const validId = /^\d+$/.test(id) && Number.isSafeInteger(sectionCourseId) && sectionCourseId > 0;

  const { cursos, setCursoActivo } = useDocenteSession();
  const sessionCourse = cursos.find(c => c.sectionCourseId === sectionCourseId);

  const [course, setCourse] = useState<TeacherCourseDetailResponse | null>(null);
  const [courseLoading, setCourseLoading] = useState(!sessionCourse);
  const [courseError, setCourseError] = useState<string | null>(null);

  // Carga de bimestres
  const [bimesters, setBimesters] = useState<Bimester[]>([]);
  const [bimestersLoading, setBimestersLoading] = useState(true);
  const [bimestersError, setBimestersError] = useState<string | null>(null);
  const [selectedBimesterId, setSelectedBimesterId] = useState<string>('');

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'resultados' | 'planilla'>('resultados');

  // 1. Cargar datos del curso
  useEffect(() => {
    if (!validId) return;
    let current = true;

    teacherCoursesService
      .getCourse(sectionCourseId)
      .then(data => {
        if (!current) return;
        setCourse(data);
        setCursoActivo({ id: String(data.sectionCourseId), nombre: data.name, grado: `${data.grade}° grado` });
      })
      .catch(err => {
        if (current) setCourseError(teacherCoursesErrorMessage(err));
      })
      .finally(() => {
        if (current) setCourseLoading(false);
      });

    return () => {
      current = false;
    };
  }, [sectionCourseId, validId, setCursoActivo]);

  // 2. Cargar bimestres disponibles
  useEffect(() => {
    if (!validId) return;
    const abort = new AbortController();
    setBimestersLoading(true);

    teacherGradesService
      .getBimesters(sectionCourseId, abort.signal)
      .then(data => {
        if (abort.signal.aborted) return;
        setBimesters(data);
        const currentBimester = data.find(b => b.status === 'ABIERTO') ?? data.find(b => b.status !== 'ANULADO');
        if (currentBimester) {
          setSelectedBimesterId(String(currentBimester.id));
        }
      })
      .catch(err => {
        if (!abort.signal.aborted) setBimestersError(teacherGradesErrorMessage(err));
      })
      .finally(() => {
        if (!abort.signal.aborted) setBimestersLoading(false);
      });

    return () => abort.abort();
  }, [sectionCourseId, validId]);

  // 3. Callback para cargar resultados bimestrales
  const loadResults = useCallback(
    (signal: AbortSignal) => {
      if (!selectedBimesterId) return Promise.reject(new Error('Selecciona un bimestre.'));
      return teacherGradesService.getResults(sectionCourseId, Number(selectedBimesterId), signal);
    },
    [sectionCourseId, selectedBimesterId]
  );

  if (!validId) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/docente/notas"
          className="flex items-center gap-1.5 px-3 py-2 w-fit rounded-lg bg-[#F3F4F6] text-[#111827] text-xs font-bold border border-[#E5E7EB]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Volver a cursos</span>
        </Link>
        <div role="alert" className="p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          El identificador de curso no es válido.
        </div>
      </div>
    );
  }

  if (courseLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-xl border border-[#E5E7EB] bg-white animate-pulse" />
        <CardSkeleton />
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/docente/notas"
          className="flex items-center gap-1.5 px-3 py-2 w-fit rounded-lg bg-[#F3F4F6] text-[#111827] text-xs font-bold border border-[#E5E7EB]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Volver a cursos</span>
        </Link>
        <ErrorState
          title="No pudimos cargar el curso"
          message={courseError ?? 'Curso no encontrado o no asignado a tu cuenta.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const selectedBimester = bimesters.find(b => String(b.id) === selectedBimesterId);

  return (
    <div className="flex flex-col gap-6">
      {/* Barra superior requerida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        {/* Botón Volver y Título del curso */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/docente/notas"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] text-xs font-bold transition-colors cursor-pointer border border-[#E5E7EB] shrink-0 shadow-2xs"
            title="Volver a la selección de cursos"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Volver a cursos</span>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#64748B] bg-[#F3F4F6] border border-[#E5E7EB] rounded-md px-1.5 py-0.5 shrink-0">
                {course.code}
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-[#111827] truncate">
                {course.name} - {course.grade}° {course.sectionName}
              </h1>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 truncate">
              {course.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · Área: {course.area} · <span className="font-bold text-[#111827]">{course.studentCount} alumnos</span>
            </p>
          </div>
        </div>

        {/* Selector desplegable rápido de bimestre */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-[#F3F4F6] px-3.5 py-2 rounded-xl border border-[#E5E7EB]">
            <CalendarCheck size={18} className="text-[#BE123C] shrink-0" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B]">Bimestre</span>
              <select
                aria-label="Seleccionar Bimestre"
                disabled={bimestersLoading || bimesters.length === 0}
                value={selectedBimesterId}
                onChange={e => setSelectedBimesterId(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#111827] focus-visible:outline-none cursor-pointer p-0 disabled:opacity-50"
              >
                {bimestersLoading ? (
                  <option value="">Cargando bimestres...</option>
                ) : bimesters.length === 0 ? (
                  <option value="">Sin bimestres</option>
                ) : (
                  bimesters.map(b => (
                    <option key={b.id} value={b.id} disabled={b.status === 'ANULADO'}>
                      {b.name} · {bimesterStatusLabels[b.status]}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Resultados del Bimestre vs Planilla */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => setActiveTab('resultados')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === 'resultados'
              ? 'border-[#BE123C] text-[#BE123C] bg-white shadow-xs font-extrabold'
              : 'border-transparent text-[#64748B] hover:text-[#111827] hover:bg-neutral/40'
          }`}
        >
          <BarChart3 size={16} aria-hidden="true" />
          <span>Resultados del Bimestre</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('planilla')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === 'planilla'
              ? 'border-[#BE123C] text-[#BE123C] bg-white shadow-xs font-extrabold'
              : 'border-transparent text-[#64748B] hover:text-[#111827] hover:bg-neutral/40'
          }`}
        >
          <Table size={16} aria-hidden="true" />
          <span>Planilla de Calificaciones (Registro)</span>
        </button>
      </div>

      {/* Contenido según la pestaña activa */}
      {activeTab === 'resultados' ? (
        <div className="flex flex-col gap-4">
          {bimestersLoading ? (
            <p role="status" className="p-5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#64748B]">
              Cargando bimestres de resultados...
            </p>
          ) : bimestersError ? (
            <ErrorState
              title="No pudimos cargar los bimestres"
              message={bimestersError}
              onRetry={() => window.location.reload()}
            />
          ) : !selectedBimester ? (
            <p className="p-5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#64748B]">
              No hay un bimestre seleccionado o disponible para consultar resultados.
            </p>
          ) : (
            <ResultadosBimestre key={selectedBimester.id} load={loadResults} reloadKey={selectedBimesterId} />
          )}
        </div>
      ) : (
        <PlanillaCalificacionesDetalle
          sectionCourseId={course.sectionCourseId}
          courseId={course.courseId}
          selectedBimesterId={selectedBimesterId}
        />
      )}
    </div>
  );
}

function PlanillaCalificacionesDetalle({
  sectionCourseId,
  courseId,
  selectedBimesterId,
}: {
  sectionCourseId: number;
  courseId: number;
  selectedBimesterId: string;
}) {
  const grades = useTeacherGrades(sectionCourseId, courseId);
  const { evaluationLoading, evaluationError, bimester } = grades;
  const scopedEvaluation = grades.evaluation;
  const config = scopedEvaluation?.configuration;
  const criteria = manualSheetColumns(scopedEvaluation);
  const { participation } = evaluationColumns(config);

  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; rows?: EvaluationStudentRow[]; error?: string } | null>(null);
  const key = JSON.stringify([sectionCourseId, revision]);
  const loading = result?.key !== key && !scopedEvaluation;
  const error = result?.key === key && !scopedEvaluation ? result.error : undefined;
  const estudiantes = scopedEvaluation?.records ?? (result?.key === key ? result.rows ?? [] : []);

  // Sincronizar selección de bimestre con el selector rápido
  useEffect(() => {
    if (selectedBimesterId && String(bimester?.id) !== selectedBimesterId) {
      grades.selectBimester(selectedBimesterId);
    }
  }, [selectedBimesterId, bimester?.id, grades]);

  useEffect(() => {
    let current = true;
    teacherCoursesService
      .getStudents(sectionCourseId)
      .then(students => {
        if (current)
          setResult({
            key,
            rows: students.map(s => ({
              enrollmentId: s.enrollmentId,
              studentId: s.studentId,
              fullName: s.fullName,
              grades: {},
              pa: null,
            })),
          });
      })
      .catch(err => {
        if (current) setResult({ key, error: teacherCoursesErrorMessage(err) });
      });
    return () => {
      current = false;
    };
  }, [sectionCourseId, key]);

  const hasDrafts = Object.values(grades.drafts).some(value => value !== '');
  const invalidDrafts = Object.values(grades.drafts).some(value => value !== '' && gradeInputError(value));

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de acción de la planilla */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-[#BE123C]" aria-hidden="true" />
          <span className="text-xs font-bold text-[#111827]">
            Planilla de Calificaciones - {bimester ? bimester.name : 'Bimestre actual'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Exportación pendiente de integración"
            aria-label="Exportar"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            aria-describedby="grades-integration"
            onClick={() => {
              void grades.save();
            }}
            disabled={
              !MANUAL_GRADES_CONTRACT_VERIFIED ||
              grades.saving ||
              grades.refreshRequired ||
              evaluationLoading ||
              !scopedEvaluation ||
              bimester?.status !== 'ABIERTO' ||
              !hasDrafts ||
              invalidDrafts
            }
            className="flex items-center gap-1.5 px-4 py-2 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save size={16} />
            <span>{grades.saving ? 'Registrando...' : 'Guardar Notas'}</span>
          </button>
        </div>
      </div>

      <p id="grades-integration" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">
        {MANUAL_GRADES_CONTRACT_VERIFIED
          ? 'Solo primeras notas MANUAL en un bimestre ABIERTO. El registro es individual por celda; las notas existentes son de solo lectura.'
          : 'El registro de notas aún no está disponible.'}
      </p>

      {grades.annulledNotice && (
        <p role="alert" className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
          {grades.annulledNotice}
        </p>
      )}
      {grades.saveError && (
        <ErrorState title="No se completó el registro" message={grades.saveError} onRetry={grades.refreshSheet} />
      )}
      {grades.saveMessage && (
        <p role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          {grades.saveMessage}
        </p>
      )}
      {grades.refreshRequired && !grades.saving && (
        <p role="alert" className="text-xs text-rose-700">
          Debes recargar la planilla antes de volver a registrar notas.
        </p>
      )}
      {evaluationError && (
        <ErrorState
          title="No pudimos cargar los criterios y calificaciones"
          message={evaluationError}
          onRetry={grades.refreshSheet}
        />
      )}
      {evaluationLoading && (
        <p role="status" className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs">
          Cargando criterios y calificaciones...
        </p>
      )}

      {loading ? (
        <div role="status">
          <CardSkeleton />
          <span className="sr-only">Cargando estudiantes...</span>
        </div>
      ) : error ? (
        <ErrorState title="No pudimos cargar los estudiantes" message={error} onRetry={() => setRevision(n => n + 1)} />
      ) : (
        <>
          {!config && !evaluationLoading && !evaluationError && (
            <p role="status" className="text-xs text-[#64748B]">
              Los criterios se mostrarán cuando esté disponible la configuración del curso y periodo.
            </p>
          )}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 min-w-[200px]">
                      Estudiante
                    </th>
                    {criteria.map(c => (
                      <th scope="col" key={c.id} className="py-3.5 px-3 text-center min-w-[90px]">
                        {c.name}
                        {!c.active && (
                          <span className="block normal-case font-normal text-[10px] text-muted">
                            Inactivo · solo lectura
                          </span>
                        )}
                      </th>
                    ))}
                    <th
                      scope="col"
                      title={participation?.name ?? 'Participación académica pendiente de configuración'}
                      className="py-3.5 px-4 text-center min-w-[90px] bg-[#F8FAFC]"
                    >
                      PA<span className="sr-only">, Participación académica, solo lectura</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y border-[#E5E7EB] text-xs">
                  {estudiantes.map(student => {
                    const supplied = scopedEvaluation?.records.find(
                      row => row.enrollmentId === student.enrollmentId && row.studentId === student.studentId
                    );
                    const pa = participationGrade(supplied, participation);
                    return (
                      <tr key={student.enrollmentId} className="hover:bg-[#F9FAFB] transition-colors">
                        <th scope="row" className="py-3 px-4 font-bold text-[#111827]">
                          {student.fullName}
                        </th>
                        {criteria.map(c => {
                          const draftKey = student.enrollmentId + ':' + c.id;
                          const editable = !!supplied && canEnterFirstGrade(bimester, c, supplied);
                          const draft = grades.drafts[draftKey] ?? '';
                          const inputError = editable && draft !== '' ? gradeInputError(draft) : null;
                          return (
                            <td key={c.id} className="py-2.5 px-2 text-center">
                              <input
                                aria-label={c.name + ', ' + student.fullName + (editable ? '' : ', solo lectura')}
                                aria-invalid={!!inputError}
                                aria-describedby={inputError ? 'grade-error-' + draftKey : undefined}
                                title={
                                  editable
                                    ? 'Primera nota: 0 a 20, máximo dos decimales'
                                    : 'Nota registrada, criterio inactivo o bimestre no abierto'
                                }
                                type="text"
                                inputMode="decimal"
                                readOnly={!editable}
                                disabled={grades.saving || grades.refreshRequired}
                                value={supplied?.grades[c.id] ?? (editable ? draft : '')}
                                onChange={e => {
                                  if (editable) grades.changeDraft(student.enrollmentId, c.id, e.target.value);
                                }}
                                className="w-14 text-center py-1 font-semibold text-[#111827] bg-[#F3F4F6] rounded-md border border-transparent focus:border-[#BE123C] focus:bg-white focus:outline-hidden"
                              />
                              {inputError && (
                                <p id={'grade-error-' + draftKey} className="text-[10px] text-rose-700 mt-1 max-w-32 mx-auto">
                                  {inputError}
                                </p>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-4 text-center bg-[#F8FAFC]">
                          <output
                            aria-label={'PA, ' + student.fullName + ', solo lectura'}
                            className="inline-block px-3 py-1 rounded-md font-extrabold text-xs bg-[#F3F4F6] text-[#64748B]"
                          >
                            {pa ?? 'Pendiente'}
                          </output>
                        </td>
                      </tr>
                    );
                  })}
                  {estudiantes.length === 0 && (
                    <tr>
                      <td colSpan={criteria.length + 2} className="p-6 text-center text-[#64748B]">
                        No hay estudiantes con matrícula activa en esta sección.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

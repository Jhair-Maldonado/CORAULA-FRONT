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
  Users,
  CheckCircle2,
  AlertCircle,
  Clock
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

interface VistaPlanillaSalonNotasDocenteProps {
  sectionCourseId: string;
}

export default function VistaPlanillaSalonNotasDocente({ sectionCourseId }: VistaPlanillaSalonNotasDocenteProps) {
  const router = useRouter();
  const { cursos, isLoading, coursesError, refreshCursos } = useDocenteSession();

  // Buscar el curso en la sesión docente o consultar directamente si es enlace directo
  const course = cursos.find(c => String(c.sectionCourseId) === String(sectionCourseId));

  const grades = useTeacherGrades(course?.sectionCourseId, course?.courseId);
  const { bimesters, bimestersLoading, bimestersError, evaluationLoading, evaluationError, bimester } = grades;
  const scopedEvaluation = grades.evaluation;
  const config = scopedEvaluation?.configuration;
  const criteria = manualSheetColumns(scopedEvaluation);
  const { participation } = evaluationColumns(config);

  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; rows?: EvaluationStudentRow[]; error?: string } | null>(null);

  const key = JSON.stringify([sectionCourseId, revision]);
  const loading = isLoading || (!!sectionCourseId && result?.key !== key && !scopedEvaluation);
  const error = coursesError ?? (result?.key === key && !scopedEvaluation ? result.error : undefined);
  const estudiantes = scopedEvaluation?.records ?? (result?.key === key ? result.rows ?? [] : []);

  const fetchNotas = () => {
    if (coursesError) void refreshCursos();
    else setRevision(n => n + 1);
  };

  const onRetryBimesters = grades.refreshBimesters;
  const onRetryEvaluation = grades.refreshSheet;

  useEffect(() => {
    if (!sectionCourseId) return;
    let current = true;
    teacherCoursesService
      .getStudents(Number(sectionCourseId))
      .then(students => {
        if (current) {
          setResult({
            key,
            rows: students.map(s => ({
              enrollmentId: s.enrollmentId,
              studentId: s.studentId,
              fullName: s.fullName,
              grades: {},
              pa: null
            }))
          });
        }
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

  if (loading && !course) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-xl border border-[#E5E7EB] animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !course) {
    return (
      <ErrorState
        title="No pudimos cargar la planilla del salón"
        message={error}
        onRetry={fetchNotas}
      />
    );
  }

  const levelText = course?.level === 'PRIMARY' ? 'Primaria' : 'Secundaria';

  return (
    <div className="flex flex-col gap-6">
      {/* Header Principal del Salón con botón volver */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <Link
            href="/docente/notas"
            className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#64748B] hover:text-[#111827] transition-colors border border-[#E5E7EB] shrink-0"
            title="Volver al catálogo de salones"
            aria-label="Volver al catálogo de salones"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FFE4E6] text-[#BE123C]">
                {course ? course.code : 'CURSO'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                {levelText}
              </span>
              {course?.area && (
                <span className="text-[10px] font-medium text-[#64748B]">
                  · Área: {course.area}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-1">
              {course ? `${course.name} — ${course.grade}° Grado "${course.sectionName}"` : 'Planilla de Notas'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Registro de calificaciones de criterios manuales y consolidado bimestral oficial
            </p>
          </div>
        </div>

        {/* Acciones del Salón */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/docente/asistencia"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#111827] text-[#111827] hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
          >
            <ClipboardCheck size={16} />
            <span>Ver Asistencia</span>
          </Link>

          <button
            type="button"
            disabled
            title="Exportación pendiente de integración oficial"
            aria-label="Exportar notas"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] text-[#94A3B8] rounded-lg text-xs font-bold transition-all shadow-2xs opacity-70 cursor-not-allowed"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            onClick={() => { void grades.save(); }}
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
            className="flex items-center gap-1.5 px-4 py-2 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{grades.saving ? 'Registrando...' : 'Guardar Notas'}</span>
          </button>
        </div>
      </div>

      {/* Selector de Bimestres / Tabs de Bimestres */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
            Periodo Bimestral:
          </span>
          {bimestersLoading ? (
            <span className="text-xs text-[#64748B]">Cargando bimestres...</span>
          ) : bimesters.length === 0 ? (
            <span className="text-xs text-[#64748B]">No hay bimestres registrados</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {bimesters.map(b => {
                const isSelected = bimester?.id === b.id;
                const isOpen = b.status === 'ABIERTO';
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => grades.selectBimester(String(b.id))}
                    disabled={grades.saving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#BE123C] text-white shadow-xs'
                        : 'bg-slate-50 text-[#111827] hover:bg-slate-100 border border-[#E5E7EB]'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {b.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {bimester && (
          <span className="text-[11px] font-medium text-[#64748B]">
            Estado actual: <strong className={bimester.status === 'ABIERTO' ? 'text-emerald-700' : 'text-slate-700'}>{bimester.status}</strong>
            {bimester.status === 'ABIERTO' ? ' (Permite registro de notas)' : ' (Solo lectura)'}
          </span>
        )}
      </div>

      {/* Alertas y Notificaciones de Estado */}
      {bimestersError && (
        <ErrorState
          title="No pudimos cargar los bimestres"
          message={bimestersError}
          onRetry={onRetryBimesters}
        />
      )}
      {grades.saveError && (
        <ErrorState
          title="No se completó el registro de notas"
          message={grades.saveError}
          onRetry={grades.refreshSheet}
        />
      )}
      {grades.saveMessage && (
        <div role="status" className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{grades.saveMessage}</span>
        </div>
      )}
      {grades.refreshRequired && !grades.saving && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>Debes recargar la planilla antes de volver a registrar notas.</span>
        </div>
      )}
      {evaluationError && (
        <ErrorState
          title="No pudimos cargar los criterios y calificaciones"
          message={evaluationError}
          onRetry={onRetryEvaluation}
        />
      )}
      {evaluationLoading && (
        <p role="status" className="p-4 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs animate-pulse">
          Cargando criterios de evaluación y calificaciones del salón...
        </p>
      )}

      {/* Planilla Oficial de Evaluación */}
      {loading ? (
        <div role="status" className="space-y-2">
          <CardSkeleton />
          <span className="sr-only">Cargando planilla de estudiantes...</span>
        </div>
      ) : (
        <>
          {!config && !evaluationLoading && !evaluationError && !bimestersError && (
            <p role="status" className="text-xs text-[#64748B] p-4 bg-white rounded-xl border border-[#E5E7EB]">
              Los criterios se mostrarán cuando esté disponible la configuración del curso y periodo.
            </p>
          )}

          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 min-w-[220px]">
                      Estudiante ({estudiantes.length})
                    </th>
                    {criteria.map(c => (
                      <th scope="col" key={c.id} className="py-3.5 px-3 text-center min-w-[90px]">
                        <span className="block">{c.name}</span>
                        {!c.active && (
                          <span className="block normal-case font-normal text-[9px] text-slate-400">
                            Inactivo
                          </span>
                        )}
                      </th>
                    ))}
                    <th
                      scope="col"
                      title={participation?.name ?? 'Participación académica (PA) calculada automáticamente por el backend'}
                      className="py-3.5 px-4 text-center min-w-[90px] bg-[#F8FAFC]"
                    >
                      <span className="block">PA</span>
                      <span className="block normal-case font-normal text-[9px] text-slate-400">
                        Auto
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-xs">
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
                          const draftKey = `${student.enrollmentId}:${c.id}`;
                          const editable = !!supplied && canEnterFirstGrade(bimester, c, supplied);
                          const draft = grades.drafts[draftKey] ?? '';
                          const inputError = editable && draft !== '' ? gradeInputError(draft) : null;
                          const persistedGrade = supplied?.grades[c.id];

                          return (
                            <td key={c.id} className="py-2.5 px-2 text-center">
                              <input
                                aria-label={`${c.name}, ${student.fullName}${editable ? '' : ', solo lectura'}`}
                                aria-invalid={!!inputError}
                                aria-describedby={inputError ? `grade-error-${draftKey}` : undefined}
                                title={editable ? 'Primera nota: 0 a 20, máximo dos decimales' : 'Nota registrada, criterio inactivo o bimestre no abierto'}
                                type="text"
                                inputMode="decimal"
                                readOnly={!editable}
                                disabled={grades.saving || grades.refreshRequired}
                                value={persistedGrade ?? (editable ? draft : '')}
                                onChange={e => {
                                  if (editable) grades.changeDraft(student.enrollmentId, c.id, e.target.value);
                                }}
                                className={`w-14 text-center py-1 font-semibold text-[#111827] rounded-md border transition-colors ${
                                  editable
                                    ? 'bg-white border-[#E5E7EB] focus:border-[#BE123C] focus:outline-hidden'
                                    : 'bg-[#F3F4F6] border-transparent text-[#64748B]'
                                }`}
                              />
                              {inputError && (
                                <p id={`grade-error-${draftKey}`} className="text-[10px] text-rose-700 mt-1 max-w-32 mx-auto">
                                  {inputError}
                                </p>
                              )}
                            </td>
                          );
                        })}

                        {/* Columna PA (Solo lectura de backend) */}
                        <td className="py-2.5 px-4 text-center bg-[#F8FAFC]">
                          <output
                            aria-label={`PA, ${student.fullName}, solo lectura`}
                            className={`inline-block px-2.5 py-1 rounded-md font-extrabold text-xs ${
                              pa !== null
                                ? pa >= 11
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-[#F3F4F6] text-[#64748B]'
                            }`}
                          >
                            {pa ?? 'Pendiente'}
                          </output>
                        </td>
                      </tr>
                    );
                  })}

                  {estudiantes.length === 0 && (
                    <tr>
                      <td colSpan={criteria.length + 2} className="p-8 text-center text-[#64748B]">
                        No hay estudiantes con matrícula activa en este salón.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-white border border-[#E5E7EB] text-[#64748B] rounded-xl text-xs flex items-center justify-between gap-3">
            <span>
              {MANUAL_GRADES_CONTRACT_VERIFIED
                ? 'Solo primeras notas MANUAL en un bimestre ABIERTO. El registro es individual por celda; las notas existentes son de solo lectura.'
                : 'El registro de notas aún no está disponible.'}
            </span>
            <span className="font-semibold text-slate-500">
              Cálculo y promedios finales son consolidados por el servidor.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

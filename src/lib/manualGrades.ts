import type { Bimester, EvaluationCriterion, EvaluationStudentRow, TeacherEvaluationData } from '../types/evaluationApi';
import type { CreateManualCriterionGradeRequest, ProvisionalCriterionGradesSheetResponse } from '../types/teacherGradesApi';

export function gradeInputError(value: string): string | null {
  if (!value.trim()) return 'Ingresa una nota.';
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return 'Usa un número con máximo dos decimales.';
  const grade = Number(value);
  return !Number.isFinite(grade) || grade < 0 || grade > 20 ? 'La nota debe estar entre 0 y 20.' : null;
}

export function canEnterFirstGrade(bimester: Bimester | undefined, criterion: EvaluationCriterion, row: EvaluationStudentRow): boolean {
  return bimester?.status === 'ABIERTO' && criterion.type === 'MANUAL' && criterion.active
    && row.grades[criterion.id] == null && row.gradeIds?.[criterion.id] == null;
}

export function manualSheetColumns(evaluation?: TeacherEvaluationData): EvaluationCriterion[] {
  return evaluation?.configuration.criteria.filter(c => c.type === 'MANUAL' && (c.active || evaluation.records.some(row => row.grades[c.id] != null || row.gradeIds?.[c.id] != null)))
    .sort((a, b) => a.order - b.order || a.id - b.id) ?? [];
}

export function adaptProvisionalSheet(sheet: ProvisionalCriterionGradesSheetResponse): TeacherEvaluationData {
  const criteria = sheet.criteria.map(c => ({ ...c, courseId: sheet.courseId, academicPeriodId: sheet.academicPeriodId, description: null }));
  return {
    sectionCourseId: sheet.sectionCourseId, bimesterId: sheet.bimester.id,
    configuration: {
      courseId: sheet.courseId, academicPeriodId: sheet.academicPeriodId, criteria,
      activeManualCriteriaCount: criteria.filter(c => c.active && c.type === 'MANUAL').length,
      hasActiveParticipationCriterion: criteria.some(c => c.active && c.type === 'PARTICIPACION_ACADEMICA'),
    },
    records: sheet.students.map(s => ({
      enrollmentId: s.enrollmentId, studentId: s.studentId, fullName: s.fullName,
      grades: Object.fromEntries(s.grades.map(c => [c.criterionId, c.grade])),
      gradeIds: Object.fromEntries(s.grades.map(c => [c.criterionId, c.gradeId])),
      // This proposal contains only MANUAL cells. N2 does not deliver a PA result.
      pa: null,
    })),
  };
}

export function prepareFirstGrades(evaluation: TeacherEvaluationData, bimester: Bimester, drafts: Record<string, string>): CreateManualCriterionGradeRequest[] {
  if (bimester.status !== 'ABIERTO' || bimester.id !== evaluation.bimesterId || bimester.academicPeriodId !== evaluation.configuration.academicPeriodId) throw new Error('El bimestre no permite registrar notas.');
  const commands: CreateManualCriterionGradeRequest[] = [];
  for (const [key, value] of Object.entries(drafts)) {
    if (value === '') continue;
    const [enrollmentId, criterionId] = key.split(':').map(Number);
    const row = evaluation.records.find(r => r.enrollmentId === enrollmentId);
    const criterion = evaluation.configuration.criteria.find(c => c.id === criterionId);
    if (!row || !criterion || !canEnterFirstGrade(bimester, criterion, row)) throw new Error('Solo se pueden registrar primeras notas de criterios MANUAL activos.');
    const error = gradeInputError(value);
    if (error) throw new Error(error);
    commands.push({ enrollmentId, criterionId, grade: Number(value) });
  }
  return commands;
}

// Individual POSTs are not atomic as a group. Always reload after every attempt;
// stop on the first failure and never retry an ambiguous POST automatically.
export async function registerFirstGrades(commands: CreateManualCriterionGradeRequest[], register: (command: CreateManualCriterionGradeRequest) => Promise<unknown>, reload: () => Promise<unknown>): Promise<number> {
  const seen = new Set<string>();
  for (const command of commands) {
    const key = `${command.enrollmentId}:${command.criterionId}`;
    if (seen.has(key)) throw new Error('Hay una celda duplicada en el envío.');
    seen.add(key);
  }
  let count = 0;
  let failure: unknown;
  try {
    for (const command of commands) { await register(command); count++; }
  } catch (error) { failure = error; }
  try { await reload(); }
  catch (error) {
    if (failure) throw failure;
    throw new Error(`Se registraron ${count} notas, pero no se pudo recargar la planilla. Consulta nuevamente antes de enviar otras notas.`, { cause: error });
  }
  if (failure) throw failure;
  return count;
}

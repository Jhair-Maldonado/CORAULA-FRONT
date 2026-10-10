import type { Bimester, EvaluationConfiguration, EvaluationCriterion, TeacherEvaluationData } from '@/types/evaluationApi';

export function evaluationColumns(configuration?: EvaluationConfiguration) {
  const active = configuration?.criteria.filter(c => c.active).sort((a, b) => a.order - b.order) ?? [];
  return {
    manual: active.filter(c => c.type === 'MANUAL'),
    participation: active.find(c => c.type === 'PARTICIPACION_ACADEMICA'),
  };
}

export function matchesEvaluationContext(data: TeacherEvaluationData | undefined, sectionCourseId: number | undefined, courseId: number | undefined, bimester: Bimester | undefined): data is TeacherEvaluationData {
  return !!data && !!bimester && data.sectionCourseId === sectionCourseId && data.configuration.courseId === courseId
    && data.bimesterId === bimester.id && data.configuration.academicPeriodId === bimester.academicPeriodId;
}

export function participationGrade(record: { grades: Record<number, number | null>; pa: number | null } | undefined, criterion: EvaluationCriterion | undefined): number | null {
  if (!record || !criterion) return null;
  // An explicit null means pending; do not replace it with a stale legacy PA.
  return Object.hasOwn(record.grades, criterion.id) ? record.grades[criterion.id] ?? null : record.pa;
}

export function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}

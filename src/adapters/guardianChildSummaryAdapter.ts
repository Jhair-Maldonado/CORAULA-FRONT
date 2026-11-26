/**
 * Resumen de rendimiento por hijo (FRONT #161), calculado a partir de la libreta publicada
 * (`GET /v1/guardian/students/{id}/bimesters/{bimesterId}/report`). Funciones puras: no se inventa ningún dato.
 * Umbral de riesgo: nota menor que 11 (`isFailingGrade`; el backend usa el mismo en
 * `EvaluationResultsService` y `EarlyWarningsService`).
 */
import { isFailingGrade } from '@/services/padres/guardianReportService';
import type { GuardianBimesterReport, GuardianPublishedBimester } from '@/types/guardianReportApi';

export interface ChildGradeSummary {
  /** «Bimestre 3». */
  bimestreLabel: string;
  /** Media de las notas de curso no nulas, con un decimal y coma («14,5»); null si todas son nulas. */
  promedio: string | null;
  /** Cursos con nota de 11 o más. */
  aprobados: number;
  /** Cursos con nota menor que 11. */
  enRiesgo: number;
}

/** El backend entrega los bimestres publicados del más reciente al más antiguo: el último es el primero. */
export function latestPublishedBimester(list: GuardianPublishedBimester[]): GuardianPublishedBimester | null {
  return list[0] ?? null;
}

/**
 * Promedio, aprobados y en riesgo sobre la nota final de cada curso. Los cursos sin nota (null) no cuentan en
 * ninguna cifra. El promedio se redondea solo al mostrarlo; el umbral se compara con la nota sin redondear.
 */
export function childGradeSummary(report: GuardianBimesterReport): ChildGradeSummary {
  const grades = report.courses.map(course => course.grade).filter((grade): grade is number => grade !== null);
  const average = grades.length === 0 ? null : grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
  const enRiesgo = grades.filter(isFailingGrade).length;
  return {
    bimestreLabel: `Bimestre ${report.bimester.number}`,
    promedio: average === null ? null : average.toFixed(1).replace('.', ','),
    aprobados: grades.length - enRiesgo,
    enRiesgo,
  };
}

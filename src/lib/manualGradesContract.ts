import type { Bimester } from '../types/evaluationApi';
import type { ProvisionalCriterionGradesSheetResponse, ProvisionalCriterionGradeResponse } from '../types/teacherGradesApi';

// Boundary validation for the pending proposal. No default response is synthesized.
function invalid(): never { throw new Error('La respuesta no coincide con el contrato N2 provisional. Confirma los DTO con backend.'); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function id(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid();
  return value;
}
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return invalid(); return value; }
function nullableText(value: unknown): string | null { return value === null ? null : text(value); }
function grade(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 20 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) return invalid();
  return value;
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) return invalid(); return value; }
function unique(ids: number[]) { if (new Set(ids).size !== ids.length) invalid(); }

export function parseProvisionalBimester(value: unknown): Bimester {
  const b = object(value);
  if (!['PLANIFICADO', 'ABIERTO', 'EN_REVISION', 'CERRADO'].includes(String(b.status))) return invalid();
  return { id: id(b.id), academicPeriodId: id(b.academicPeriodId), number: id(b.number), name: text(b.name), startDate: text(b.startDate), endDate: text(b.endDate), status: b.status as Bimester['status'] };
}

export function parseProvisionalBimesters(value: unknown): Bimester[] {
  const bimesters = array(value).map(parseProvisionalBimester);
  unique(bimesters.map(b => b.id));
  return bimesters;
}

export function parseProvisionalSheet(value: unknown, expected: { sectionCourseId: number; courseId: number; bimesterId: number; academicPeriodId: number }): ProvisionalCriterionGradesSheetResponse {
  const s = object(value);
  const bimester = parseProvisionalBimester(s.bimester);
  const courseId = id(s.courseId), sectionCourseId = id(s.sectionCourseId), academicPeriodId = id(s.academicPeriodId);
  if (courseId !== expected.courseId || sectionCourseId !== expected.sectionCourseId || academicPeriodId !== expected.academicPeriodId || bimester.id !== expected.bimesterId || bimester.academicPeriodId !== academicPeriodId) return invalid();
  const criteria: ProvisionalCriterionGradesSheetResponse['criteria'] = array(s.criteria).map(value => {
    const c = object(value);
    if ((c.type !== 'MANUAL' && c.type !== 'PARTICIPACION_ACADEMICA') || typeof c.active !== 'boolean') return invalid();
    return { id: id(c.id), name: text(c.name), order: id(c.order), type: c.type, active: c.active };
  });
  unique(criteria.map(c => c.id));
  if (criteria.filter(c => c.active && c.type === 'PARTICIPACION_ACADEMICA').length > 1) return invalid();
  const students = array(s.students).map(value => {
    const student = object(value);
    const grades = array(student.grades).map(value => {
      const cell = object(value);
      const criterionId = id(cell.criterionId);
      if (!criteria.some(c => c.id === criterionId && c.type === 'MANUAL')) return invalid();
      const gradeId = cell.gradeId === null ? null : id(cell.gradeId);
      const cellGrade = grade(cell.grade);
      if ((gradeId === null) !== (cellGrade === null)) return invalid();
      return { criterionId, gradeId, grade: cellGrade, registeredAt: nullableText(cell.registeredAt), updatedAt: nullableText(cell.updatedAt) };
    });
    unique(grades.map(c => c.criterionId));
    return { enrollmentId: id(student.enrollmentId), studentId: id(student.studentId), fullName: text(student.fullName), grades };
  });
  unique(students.map(s => s.enrollmentId));
  return { courseId, sectionCourseId, academicPeriodId, bimester, criteria, students };
}

export function parseProvisionalRegisteredGrade(value: unknown): ProvisionalCriterionGradeResponse {
  const c = object(value);
  const result = grade(c.grade);
  if (result === null) return invalid();
  return { id: id(c.id), enrollmentId: id(c.enrollmentId), sectionCourseId: id(c.sectionCourseId), bimesterId: id(c.bimesterId), criterionId: id(c.criterionId), grade: result, registeredByTeacherId: id(c.registeredByTeacherId), registeredAt: text(c.registeredAt), updatedAt: nullableText(c.updatedAt) };
}

export function manualGradesErrorMessage(status?: number, message?: string): string {
  if (status === 401) return 'La sesión ha expirado. Vuelve a iniciar sesión.';
  if (status === 403) return 'No tienes permiso para consultar o registrar notas de este curso.';
  if (status === 404) return 'La planilla no está disponible para tu cuenta o el contrato N2 aún no está desplegado.';
  if (status === 409) return `Conflicto: ${message?.trim() || 'la nota ya existe o cambió el contexto académico'}. Se volverá a consultar la planilla; no se sobrescribirán notas.`;
  if (status === 400 || status === 422) return message?.trim() || 'Revisa la nota (0 a 20, máximo dos decimales) y el contexto seleccionado.';
  if (!status) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  return 'No se pudo completar la solicitud de calificaciones. Consulta la planilla antes de volver a enviar.';
}

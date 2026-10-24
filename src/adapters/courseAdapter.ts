import type { CourseLevel, CourseResponse, CreateCourseRequest, UpdateCourseRequest } from '@/types/courseApi';
import type { Curso, CourseFormValues } from '@/types/cursos';
export function toCourseLevel(nivel: CourseFormValues['nivel']): CourseLevel {
  return nivel === 'Primaria' ? 'PRIMARY' : 'SECONDARY';
}
export function toCurso(course: CourseResponse): Curso {
  return {
    id: String(course.id), codigo: course.code, nombre: course.name,
    nivel: course.level === 'PRIMARY' ? 'Primaria' : 'Secundaria',
    area: course.area, horasTotalesSemana: course.weeklyHours,
    descripcion: course.description ?? undefined, active: course.active,
  };
}
export function toCreateCourse(values: CourseFormValues): CreateCourseRequest {
  return {
    code: values.codigo.trim(), name: values.nombre.trim(),
    level: toCourseLevel(values.nivel), area: values.area.trim(),
    weeklyHours: values.horasTotalesSemana,
    description: values.descripcion?.trim() || null,
  };
}
export function toUpdateCourse(values: CourseFormValues, original: Curso): UpdateCourseRequest {
  const next = toCreateCourse(values);
  const previous = toCreateCourse(original);
  const patch: UpdateCourseRequest = {};
  if (next.code !== previous.code) patch.code = next.code;
  if (next.name !== previous.name) patch.name = next.name;
  if (next.level !== previous.level) patch.level = next.level;
  if (next.area !== previous.area) patch.area = next.area;
  if (next.weeklyHours !== previous.weeklyHours) patch.weeklyHours = next.weeklyHours;
  if (next.description !== previous.description) patch.description = next.description ?? '';
  return patch;
}

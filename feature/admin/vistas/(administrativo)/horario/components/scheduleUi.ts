import type { CreateScheduleRequest, ScheduleResponse, SchoolDay, UpdateScheduleRequest } from '@/types/scheduleApi';

export const SCHOOL_DAYS: { value: SchoolDay; label: string }[] = [
  { value: 'LUNES', label: 'Lunes' }, { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' }, { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
];
export const dayLabel = (day: SchoolDay) => SCHOOL_DAYS.find(item => item.value === day)?.label ?? day;
export const buttonClass = 'min-h-10 px-4 py-2 rounded-xl border border-line text-xs font-bold transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
export const inputClass = 'w-full min-w-0 min-h-10 px-3 py-2 rounded-lg border border-line bg-neutral/50 text-xs font-medium text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export interface ScheduleValues {
  sectionCourseId: number | null;
  day: SchoolDay;
  startTime: string;
  endTime: string;
  classroom: string;
}
export function validateSchedule(values: ScheduleValues, creating: boolean): string | undefined {
  if (creating && (!values.sectionCourseId || !Number.isSafeInteger(values.sectionCourseId))) return 'Selecciona un curso activo de la sección.';
  if (!SCHOOL_DAYS.some(day => day.value === values.day)) return 'Selecciona un día válido.';
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(values.startTime) || !time.test(values.endTime)) return 'Ingresa inicio y fin con formato HH:mm.';
  if (values.startTime >= values.endTime) return 'La hora de inicio debe ser anterior a la hora de fin.';
  if (values.classroom.length > 50) return 'El aula no puede superar 50 caracteres.';
}
export function createPayload(values: ScheduleValues): CreateScheduleRequest {
  return { sectionCourseId: values.sectionCourseId!, day: values.day, startTime: values.startTime, endTime: values.endTime, classroom: values.classroom.trim() || null };
}
export function updatePayload(block: ScheduleResponse, values: ScheduleValues): UpdateScheduleRequest {
  const request: UpdateScheduleRequest = {};
  if (values.day !== block.day) request.day = values.day;
  if (values.startTime !== block.startTime) request.startTime = values.startTime;
  if (values.endTime !== block.endTime) request.endTime = values.endTime;
  if (values.classroom.trim() !== (block.classroom ?? '')) request.classroom = values.classroom.trim();
  return request;
}

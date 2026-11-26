import { isAxiosError } from 'axios';
import type { TeacherAttendanceSessionResponse } from '@/types/teacherAttendanceApi';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';

/** Resultado de pedir las sesiones de hoy de un curso (GET /v1/teacher/courses/{sc}/attendance?date=). */
export type CourseDayOutcome =
  | { kind: 'ok'; sessions: TeacherAttendanceSessionResponse[] }
  | { kind: 'outOfPeriod' }
  | { kind: 'error' };

export interface CourseDayResult {
  course: TeacherCourseSummaryResponse;
  outcome: CourseDayOutcome;
}

export type DayBlockState = 'past' | 'live' | 'upcoming';

/** Una sesión de clase del día, lista para pintar. */
export interface DayBlock {
  /** Clave estable de la fila: el `scheduleId` de la sesión. */
  key: number;
  scheduleId: number;
  sectionCourseId: number;
  courseName: string;
  /** «5.° A». */
  gradeSection: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  /** Aula; `null` cuando el backend no la informa (no se muestra). */
  classroom: string | null;
  pendingCount: number;
  state: DayBlockState;
}

export interface CurrentClass extends DayBlock {
  minutesLeft: number;
  /** «Termina en 25 min». */
  remainingLabel: string;
}

export interface FailedCourse {
  sectionCourseId: number;
  courseName: string;
}

export interface DaySchedule {
  /** Todas las sesiones del día, ordenadas por inicio, curso y sesión. */
  timeline: DayBlock[];
  /** Clase en curso (la primera si hay solapadas) o `null`. */
  current: CurrentClass | null;
  /** Bloques que aún no empiezan. */
  upcoming: DayBlock[];
  /** Cursos cuya consulta falló por un motivo distinto al periodo académico. */
  failedCourses: FailedCourse[];
  /** Sin sesiones hoy y sin fallos: «Sin clases programadas hoy». */
  isEmpty: boolean;
}

/** Nivel del curso en español (R8). */
export function courseLevelLabel(level: TeacherCourseSummaryResponse['level']): string {
  return level === 'PRIMARY' ? 'Primaria' : 'Secundaria';
}

/** «5.° A · Primaria». */
export function courseGradeLabel(course: TeacherCourseSummaryResponse): string {
  return `${course.grade}.° ${course.sectionName} · ${courseLevelLabel(course.level)}`;
}

/** «HH:mm» (o «HH:mm:ss») a minutos desde la medianoche; `NaN` si el texto no es una hora. */
export function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

/** «Termina en 25 min» o «Termina en 1 h 5 min». */
export function remainingLabel(minutesLeft: number): string {
  if (minutesLeft < 60) return `Termina en ${minutesLeft} min`;
  const minutes = minutesLeft % 60;
  return `Termina en ${Math.floor(minutesLeft / 60)} h${minutes ? ` ${minutes} min` : ''}`;
}

/**
 * Clasifica el resultado de `Promise.allSettled` de un curso.
 * DECISION(FRONT #157): un 400 es «fuera del periodo académico» y equivale a un día sin clases;
 * cualquier otro fallo deja al curso como «No se pudo cargar».
 */
export function toCourseOutcome(settled: PromiseSettledResult<{ sessions: TeacherAttendanceSessionResponse[] }>): CourseDayOutcome {
  if (settled.status === 'fulfilled') return { kind: 'ok', sessions: settled.value.sessions ?? [] };
  return isAxiosError(settled.reason) && settled.reason.response?.status === 400 ? { kind: 'outOfPeriod' } : { kind: 'error' };
}

function stateOf(start: number, end: number, now: number): DayBlockState {
  if (now >= end) return 'past';
  return now >= start ? 'live' : 'upcoming';
}

/**
 * Arma la línea de tiempo de hoy a partir de las sesiones de cada curso. Es pura: recibe los minutos
 * de Lima (`limaMinutes`) para poder probarla con cualquier hora.
 */
export function buildDaySchedule(results: readonly CourseDayResult[], nowMinutes: number): DaySchedule {
  const timeline: DayBlock[] = [];
  const failedCourses: FailedCourse[] = [];
  for (const { course, outcome } of results) {
    if (outcome.kind === 'error') failedCourses.push({ sectionCourseId: course.sectionCourseId, courseName: course.name });
    if (outcome.kind !== 'ok') continue;
    for (const session of outcome.sessions) {
      const startMinutes = timeToMinutes(session.startTime);
      const endMinutes = timeToMinutes(session.endTime);
      if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) continue;
      timeline.push({
        key: session.scheduleId,
        scheduleId: session.scheduleId,
        sectionCourseId: course.sectionCourseId,
        courseName: course.name,
        gradeSection: `${course.grade}.° ${course.sectionName}`,
        startTime: session.startTime,
        endTime: session.endTime,
        startMinutes,
        endMinutes,
        classroom: session.classroom?.trim() ? session.classroom : null,
        pendingCount: session.pendingCount,
        state: stateOf(startMinutes, endMinutes, nowMinutes)
      });
    }
  }
  timeline.sort((a, b) => a.startMinutes - b.startMinutes || a.sectionCourseId - b.sectionCourseId || a.scheduleId - b.scheduleId);
  const live = timeline.find(block => block.state === 'live');
  const minutesLeft = live ? live.endMinutes - nowMinutes : 0;
  return {
    timeline,
    current: live ? { ...live, minutesLeft, remainingLabel: remainingLabel(minutesLeft) } : null,
    upcoming: timeline.filter(block => block.state === 'upcoming'),
    failedCourses,
    isEmpty: timeline.length === 0 && failedCourses.length === 0
  };
}

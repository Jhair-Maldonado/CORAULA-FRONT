'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDaySchedule, toCourseOutcome, type CourseDayResult, type DaySchedule } from '@/adapters/teacherDayScheduleAdapter';
import { limaMinutes, limaToday } from '@/lib/limaClock';
import { teacherAttendanceService } from '@/services/teacher/teacherAttendanceService';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';

export interface UseTeacherDayScheduleOptions {
  /** Reloj inyectable para las pruebas. */
  clock?: () => Date;
  /** Cada cuántos ms se recalcula «Termina en N min» (0 lo desactiva). */
  tickMs?: number;
}

export interface TeacherDayScheduleState {
  loading: boolean;
  /** Fecha de Lima consultada (`YYYY-MM-DD`). */
  today: string;
  schedule: DaySchedule;
  reload: () => void;
}

const defaultClock = () => new Date();

/**
 * Sesiones de hoy de los cursos del docente: una llamada por curso a
 * `GET /v1/teacher/courses/{sc}/attendance?date=<hoy en Lima>` con `Promise.allSettled`.
 * Un 400 (fuera del periodo académico) cuenta como día sin clases; otro fallo deja solo a ese curso en
 * `failedCourses` y el resto se muestra igual.
 * A medianoche (hora de Lima) el tick detecta el cambio de día y recarga las sesiones.
 */
export function useTeacherDaySchedule(courses: TeacherCourseSummaryResponse[], options: UseTeacherDayScheduleOptions = {}): TeacherDayScheduleState {
  const { clock = defaultClock, tickMs = 60_000 } = options;
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<{ courses: TeacherCourseSummaryResponse[]; revision: number; today: string; results: CourseDayResult[] } | null>(null);
  const [now, setNow] = useState<Date>(() => clock());

  useEffect(() => {
    if (courses.length === 0) return;
    let current = true;
    const today = limaToday(clock());
    Promise.allSettled(courses.map(course => teacherAttendanceService.getAttendance(course.sectionCourseId, today))).then(settled => {
      if (!current) return;
      setNow(clock());
      setLoaded({ courses, revision, today, results: settled.map((entry, index) => ({ course: courses[index], outcome: toCourseOutcome(entry) })) });
    });
    return () => { current = false; };
  }, [courses, revision, clock]);

  const reload = useCallback(() => setRevision(n => n + 1), []);
  const loadedToday = useRef<string | null>(null);
  useEffect(() => { loadedToday.current = loaded?.today ?? null; }, [loaded]);

  // El tick recalcula «Termina en N min» y, si Lima ya cambió de día (medianoche), vuelve a pedir las sesiones del día nuevo.
  useEffect(() => {
    if (tickMs <= 0) return;
    const timer = setInterval(() => {
      const instant = clock();
      setNow(instant);
      if (loadedToday.current !== null && limaToday(instant) !== loadedToday.current) {
        loadedToday.current = null; // evita recargas repetidas mientras llega la respuesta
        reload();
      }
    }, tickMs);
    return () => clearInterval(timer);
  }, [tickMs, clock, reload]);

  const ready = loaded !== null && loaded.courses === courses && loaded.revision === revision;
  const results = ready ? loaded.results : [];
  return {
    loading: courses.length > 0 && !ready,
    today: ready ? loaded.today : limaToday(now),
    schedule: buildDaySchedule(results, limaMinutes(now)),
    reload
  };
}

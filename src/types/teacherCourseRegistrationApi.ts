import type { Bimester } from './evaluationApi';

// Backend #106 (docs/bimester-publication.md): GET/POST /teacher/courses/{sc}/bimesters/{b}/registration.
// Teacher-owned metadata only: no other courses and no student results.
export interface TeacherCourseRegistration {
  sectionCourseId: number;
  bimesterId: number;
  status: Bimester['status'];
  /** false when the course-section has no active students: nothing to register. */
  applicable: boolean;
  /** true only while the registration is current (a later grade change invalidates it). */
  registered: boolean;
  registeredAt: string | null;
  publishedAt: string | null;
  revision: number;
}

/** One entry of the 409 RESULTS_PENDING details or of the results pre-check. */
export interface RegistrationPending {
  sectionCourseId: number | null;
  enrollmentId: number | null;
  reasons: string[];
}

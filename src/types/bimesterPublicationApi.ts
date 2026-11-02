// Shapes match the backend #51-A contract in docs/bimester-publication.md
// (GET .../bimesters/{bimesterId}/publication, POST .../review and .../publish) and
// BACK #100 docs/bimester-reopening.md (POST .../reopen, which answers the existing Bimester).
// A CERRADO bimester without publishedAt is not published.
import type { Bimester } from './evaluationApi';

export interface PublicationCourseStatus {
  sectionCourseId: number;
  /** false when the section has no active enrollments: it does not block. */
  applicable: boolean;
  /** Current teacher registration; always false when not applicable. */
  registered: boolean;
  registeredAt: string | null;
}

export interface PublicationPending {
  /** null for institutional pendings (SECTION_WITHOUT_COURSES:{id}, NO_ACTIVE_POPULATION). */
  sectionCourseId: number | null;
  enrollmentId: number | null;
  /** #45 reasons plus COURSE_NOT_REGISTERED, ACADEMIC_CONTEXT_INACTIVE, SECTION_WITHOUT_COURSES:{id}, NO_ACTIVE_POPULATION. */
  reasons: string[];
}

export interface BimesterPublicationView {
  bimesterId: number;
  status: Bimester['status'];
  publishedAt: string | null;
  /** 0 before publishing; >= 1 once published, incremented by each later correction. */
  revision: number;
  /** SHA-256 fingerprint to send back on publish; null once published. */
  preparationRevision: string | null;
  /** Empty once published. */
  courses: PublicationCourseStatus[];
  /** Empty once published. */
  details: PublicationPending[];
}

export interface PublishBimesterRequest {
  confirmed: true;
  preparationRevision: string;
}

export interface ReopenBimesterRequest {
  reason: string;
}

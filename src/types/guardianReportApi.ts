// Contrato: docs/guardian-report.md (#56). Todas las respuestas llevan Cache-Control: no-store.

/** GET /v1/guardian/students/{studentId}/bimesters/published */
export interface GuardianPublishedBimester {
  bimesterId: number;
  number: number;
  name: string;
  academicPeriodId: number;
  academicPeriodName: string;
  /** Fecha de la publicación original, con desplazamiento de America/Lima. */
  publishedAt: string;
  /** Aumenta con cada corrección autorizada; la libreta muestra la última revisión. */
  revision: number;
}

/** GET /v1/guardian/students/{studentId}/bimesters/{bimesterId}/report */
export interface GuardianBimesterReport {
  student: { id: number; code: string | null; fullName: string };
  section: { id: number; name: string; grade: number; level: string };
  period: { id: number; name: string };
  bimester: { id: number; number: number; name: string };
  courses: { name: string; areaName: string; criteria: { name: string; grade: number | null }[]; grade: number | null }[];
  areas: { name: string; grade: number | null }[];
  publishedAt: string;
  revision: number;
}

/** GET .../report.pdf: se descarga como blob con el JWT; el nombre sale de Content-Disposition (saneado). */
export interface GuardianReportPdf {
  blob: Blob;
  fileName: string;
}

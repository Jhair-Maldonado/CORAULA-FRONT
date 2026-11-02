// Backend #53 (docs/class-materials.md): /teacher/courses/{sectionCourseId}/materials.
export type ClassMaterialStatus = 'PUBLICADO' | 'RETIRADO';

export interface ClassMaterial {
  id: number;
  sectionCourseId: number;
  authorTeacherId: number;
  authorTeacherName: string;
  title: string;
  description: string | null;
  status: ClassMaterialStatus;
  createdAt: string;
  publishedAt: string;
  withdrawnAt: string | null;
  withdrawnByUserId: number | null;
  withdrawalReason: string | null;
  file: { originalName: string; mimeType: string; sizeBytes: number };
}

export interface PublishClassMaterialRequest {
  title: string;
  description?: string | null;
  file: File;
}

/** Signed Storage URL valid for expiresInSeconds; never stored or logged. */
export interface MaterialDownloadUrl {
  url: string;
  expiresInSeconds: number;
}

export type CourseLevel = 'PRIMARY' | 'SECONDARY';
export interface CourseResponse {
  id: number;
  code: string;
  name: string;
  level: CourseLevel;
  area: string;
  weeklyHours: number;
  description: string | null;
  active: boolean;
}
export interface CreateCourseRequest {
  code: string;
  name: string;
  level: CourseLevel;
  area: string;
  weeklyHours: number;
  description?: string | null;
}
export type UpdateCourseRequest = {
  [K in keyof CreateCourseRequest]?: CreateCourseRequest[K] | null;
} & { active?: boolean | null };
export interface CourseListParams {
  search?: string;
  level?: CourseLevel;
  area?: string;
  active?: boolean;
  page?: number;
  size?: number;
}
export interface PagedCourseResponse {
  content: CourseResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

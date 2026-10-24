import httpClient from '@/services/httpClient';
import type { AddSectionCourseRequest, SectionCourseResponse } from '@/types/sectionCourseApi';

const endpoint = (sectionId: string | number) => `/v1/management/sections/${encodeURIComponent(sectionId)}/courses`;
export const sectionCoursesService = {
  async list(sectionId: string | number): Promise<SectionCourseResponse[]> {
    return (await httpClient.get<SectionCourseResponse[]>(endpoint(sectionId))).data;
  },
  async add(sectionId: string | number, courseId: number): Promise<SectionCourseResponse> {
    const payload: AddSectionCourseRequest = { courseId };
    return (await httpClient.post<SectionCourseResponse>(endpoint(sectionId), payload)).data;
  },
  async remove(sectionId: string | number, sectionCourseId: number): Promise<void> {
    await httpClient.delete(`${endpoint(sectionId)}/${sectionCourseId}`);
  },
};

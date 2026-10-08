import httpClient from '@/services/httpClient';
import type { TeacherAssignmentResponse } from '@/types/teacherApi';

const endpoint = (teacherId: number) => `/v1/management/teachers/${teacherId}/assignments`;
export const teacherAssignmentsService = {
  async assign(teacherId: number, sectionCourseId: number): Promise<TeacherAssignmentResponse> {
    return (await httpClient.post<TeacherAssignmentResponse>(endpoint(teacherId), { sectionCourseId })).data;
  },
  async unassign(teacherId: number, assignmentId: number): Promise<void> {
    await httpClient.delete(`${endpoint(teacherId)}/${assignmentId}`);
  },
};

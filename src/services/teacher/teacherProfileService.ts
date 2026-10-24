import httpClient from '@/services/httpClient';
import type { TeacherMeResponse } from '@/types/teacherProfileApi';

export const teacherProfileService = {
  async getMe(): Promise<TeacherMeResponse> {
    return (await httpClient.get<TeacherMeResponse>('/v1/teacher/me')).data;
  },
};

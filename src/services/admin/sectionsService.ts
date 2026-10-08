import httpClient from '@/services/httpClient';
import type { SectionListParams, SectionResponse } from '@/types/sectionApi';

const endpoint = '/v1/management/sections';
export const sectionsService = {
  async list(params: SectionListParams = {}): Promise<SectionResponse[]> {
    return (await httpClient.get<SectionResponse[]>(endpoint, { params })).data;
  },
  async getById(id: string | number): Promise<SectionResponse> {
    return (await httpClient.get<SectionResponse>(`${endpoint}/${encodeURIComponent(id)}`)).data;
  },
};

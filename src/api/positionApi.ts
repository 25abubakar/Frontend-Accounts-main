// src/api/positionApi.ts
import api from './axios';
import type { VacancyDto, CreatePositionDto, UpdateVacancyDto } from '../types';

export interface PositionReport {
  [key: string]: any;
}

export const positionApi = {

  // GET /api/positions
  getAll: async (): Promise<VacancyDto[]> => {
    const response = await api.get<VacancyDto[]>('/api/positions');
    return response.data;
  },

  // POST /api/positions
  create: async (data: CreatePositionDto): Promise<VacancyDto> => {
    const response = await api.post<VacancyDto>('/api/positions', data);
    return response.data;
  },

  // GET /api/positions/{id}
  getById: async (id: string): Promise<VacancyDto> => {
    const response = await api.get<VacancyDto>(`/api/positions/${id}`);
    return response.data;
  },

  // PUT /api/positions/{id}
  update: async (id: string, data: UpdateVacancyDto): Promise<VacancyDto> => {
    const response = await api.put<VacancyDto>(`/api/positions/${id}`, data);
    return response.data;
  },

  // DELETE /api/positions/{id}  (blocked if filled)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/positions/${id}`);
  },

  // GET /api/positions/vacant
  getVacant: async (): Promise<VacancyDto[]> => {
    const response = await api.get<VacancyDto[]>('/api/positions/vacant');
    return response.data;
  },

  // GET /api/positions/filled
  getFilled: async (): Promise<VacancyDto[]> => {
    const response = await api.get<VacancyDto[]>('/api/positions/filled');
    return response.data;
  },

  // GET /api/positions/by-node/{orgId}
  getByNode: async (orgId: number): Promise<VacancyDto[]> => {
    const response = await api.get<VacancyDto[]>(`/api/positions/by-node/${orgId}`);
    return response.data;
  },

  // GET /api/positions/report
  getReport: async (): Promise<PositionReport[]> => {
    const response = await api.get<PositionReport[]>('/api/positions/report');
    return response.data;
  },

  // GET /api/positions/preview-code?organizationId=&jobTitle=
  previewCode: async (organizationId: number, jobTitle: string): Promise<{ vacancyCode: string }> => {
    const response = await api.get<{ vacancyCode: string }>('/api/positions/preview-code', {
      params: { organizationId, jobTitle },
    });
    return response.data;
  },
};

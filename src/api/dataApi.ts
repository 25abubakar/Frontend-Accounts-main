/**
 * Data API - Fetches permission-filtered data
 * This replaces direct calls to individual endpoints
 */
import api from './axios';

export interface AccessibleDataResponse {
  permissions: string[];
  data: {
    departments: any[];
    staff: any[];
    persons: any[];
    vacancies: any[];
    accessGroups: any[];
  };
}

export const dataApi = {
  /**
   * Fetches all accessible data for the current user
   * This is the primary endpoint - use this instead of individual endpoints
   */
  getAccessibleData: async (): Promise<AccessibleDataResponse> => {
    const { data } = await api.get<AccessibleDataResponse>('/api/data/accessible');
    return data;
  },

  /**
   * Individual filtered endpoints (fallback if needed)
   */
  getAccessibleDepartments: async () => {
    const { data } = await api.get('/api/data/departments');
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  getAccessibleStaff: async () => {
    const { data } = await api.get('/api/data/staff');
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  getAccessiblePersons: async () => {
    const { data } = await api.get('/api/data/persons');
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  getAccessibleVacancies: async () => {
    const { data } = await api.get('/api/data/vacancies');
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  getAccessibleAccessGroups: async () => {
    const { data } = await api.get('/api/data/access-groups');
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },
};

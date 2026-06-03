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
  // ─── Standard Accessible Data ──────────────────────────────────────────
  
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

  getMyPermissions: async () => {
    const { data } = await api.get('/api/data/my-permissions');
    return data;
  },

  // ─── New Organization Explorer Endpoints ───────────────────────────────

  /**
   * 🌟 UPDATED: Fetches employees in a given org subtree using the new SQL Stored Procedures.
   * If a role is provided, the backend automatically filters the list dynamically.
   */
  getEmployeesByOrgId: async (orgNodeId: number | string, role?: string) => {
    const url = role 
      ? `/api/data/org/${orgNodeId}/vacancy-persons?role=${encodeURIComponent(role)}`
      : `/api/data/org/${orgNodeId}/vacancy-persons`;
      
    const { data } = await api.get(url);
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  /**
   * Fetches all vacancies + persons in the subtree (including unfilled vacancies).
   * Optional jobTitle filter applies exact matching.
   */
  getVacancyPersons: async (orgNodeId: number | string, jobTitle?: string) => {
    const url = jobTitle 
      ? `/api/data/org/${orgNodeId}/vacancy-persons?jobTitle=${encodeURIComponent(jobTitle)}`
      : `/api/data/org/${orgNodeId}/vacancy-persons`;
    
    const { data } = await api.get(url);
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  /**
   * Fetches only FILLED positions in the subtree.
   * Optional role filter applies exact matching (passes DBNull if omitted on backend).
   */
  getEmployeesByRole: async (orgNodeId: number | string, role?: string) => {
    const url = role
      ? `/api/organization/${orgNodeId}/employees-by-role?role=${encodeURIComponent(role)}`
      : `/api/organization/${orgNodeId}/employees-by-role`;
      
    const { data } = await api.get(url);
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  }
};
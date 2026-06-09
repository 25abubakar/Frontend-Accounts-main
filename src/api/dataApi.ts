import api from './axios';
import { API } from './endpoints';
import { buildQuery, toArray } from './apiHelpers';
import type { OrganizationVacancyPerson } from '../types/api';

export interface AccessibleDataResponse {
  permissions: string[];
  data: {
    departments: unknown[];
    staff: unknown[];
    persons: unknown[];
    vacancies: unknown[];
    accessGroups: unknown[];
  };
}

export type { OrganizationVacancyPerson };

export const dataApi = {
  getAccessibleData: async (): Promise<AccessibleDataResponse> => {
    const { data } = await api.get<AccessibleDataResponse>(API.data.accessible);
    return data;
  },

  getMyPermissions: async (): Promise<string[]> => {
    const { data } = await api.get(API.data.myPermissions);
    if (Array.isArray(data)) return data as string[];
    const o = data as Record<string, unknown>;
    return toArray<string>(o.permissions ?? o.data ?? data);
  },

  canAccess: async (featureKey: string): Promise<boolean> => {
    const { data } = await api.get(API.data.canAccess(featureKey));
    if (typeof data === 'boolean') return data;
    return !!(data as { hasAccess?: boolean })?.hasAccess;
  },

  getAccessibleDepartments: async () => {
    const { data } = await api.get(API.data.departments);
    return toArray(data);
  },

  getAccessibleStaff: async () => {
    const { data } = await api.get(API.data.staff);
    return toArray(data);
  },

  getAccessiblePersons: async () => {
    const { data } = await api.get(API.data.persons);
    return toArray(data);
  },

  getOrgEmployees: async (orgNodeId: number | string) => {
    const { data } = await api.get(API.data.orgEmployees(orgNodeId));
    return toArray(data);
  },

  getOrgVacancyPersons: async (
    orgNodeId: number | string,
    filters?: { jobTitle?: string; role?: string }
  ): Promise<OrganizationVacancyPerson[]> => {
    const qs = buildQuery({ jobTitle: filters?.jobTitle, role: filters?.role });
    const { data } = await api.get(`${API.data.orgVacancyPersons(orgNodeId)}${qs}`);
    return toArray<OrganizationVacancyPerson>(data);
  },

  getVacancyPersons: async (orgNodeId: number | string, jobTitle?: string) =>
    dataApi.getOrgVacancyPersons(orgNodeId, { jobTitle }),

  getEmployeesByOrgId: async (orgNodeId: number | string, role?: string) =>
    dataApi.getOrgVacancyPersons(orgNodeId, { role }),

  getEmployeesByRole: async (orgNodeId: number | string, jobTitle: string) => {
    const qs = buildQuery({ jobTitle });
    const { data } = await api.get(`${API.organization.employeesByRole(orgNodeId)}${qs}`);
    return toArray(data);
  },
};

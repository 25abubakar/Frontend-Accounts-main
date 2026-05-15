// src/api/accessApi.ts
import api from './axios';

// ── Types ─────────────────────────────────────────────────────────────────

export interface FeatureDto {
  featureKey: string;
  featureName: string;
  module: string;
}

export interface AccessGroupDto {
  groupId: number;
  groupName: string;
  description: string | null;
  features: string[];
  staffCount: number;
  isActive?: boolean;
}

export interface CreateGroupDto {
  groupName: string;
  description?: string;
  featureKeys?: string[];
}

export interface UpdateGroupFeaturesDto {
  featureKeys: string[];
}

export interface MatrixPermission {
  featureKey: string;
  featureName: string;
  module: string;
  hasAccess: boolean;
}

export interface MatrixRow {
  staffId: string;
  fullName: string;
  loginId: string;
  jobTitle: string;
  permissions: MatrixPermission[];
}

export interface SaveMatrixDto {
  rows: {
    staffId: string;
    featureKeys: string[];
  }[];
}

export interface StaffGroupDto {
  groupId: number;
  groupName: string;
  description: string | null;
  features: string[];
}

// ── API ───────────────────────────────────────────────────────────────────

export const accessApi = {

  // ── Features ──────────────────────────────────────────────────────────

  // GET /api/access/features
  getAllFeatures: async (): Promise<FeatureDto[]> => {
    const response = await api.get<FeatureDto[]>('/api/access/features');
    return response.data;
  },

  // GET /api/access/features/module/{module}
  getFeaturesByModule: async (module: string): Promise<FeatureDto[]> => {
    const response = await api.get<FeatureDto[]>(`/api/access/features/module/${encodeURIComponent(module)}`);
    return response.data;
  },

  // ── Groups ────────────────────────────────────────────────────────────

  // GET /api/access/groups
  getGroups: async (): Promise<AccessGroupDto[]> => {
    const response = await api.get<AccessGroupDto[]>('/api/access/groups');
    return response.data;
  },

  // POST /api/access/groups
  createGroup: async (data: CreateGroupDto): Promise<AccessGroupDto> => {
    const response = await api.post<AccessGroupDto>('/api/access/groups', data);
    return response.data;
  },

  // GET /api/access/groups/{id}
  getGroupById: async (id: number): Promise<AccessGroupDto> => {
    const response = await api.get<AccessGroupDto>(`/api/access/groups/${id}`);
    return response.data;
  },

  // PUT /api/access/groups/{id}
  updateGroup: async (id: number, data: CreateGroupDto): Promise<AccessGroupDto> => {
    const response = await api.put<AccessGroupDto>(`/api/access/groups/${id}`, data);
    return response.data;
  },

  // DELETE /api/access/groups/{id}
  deleteGroup: async (id: number): Promise<void> => {
    await api.delete(`/api/access/groups/${id}`);
  },

  // PUT /api/access/groups/{id}/features
  updateGroupFeatures: async (id: number, data: UpdateGroupFeaturesDto): Promise<void> => {
    await api.put(`/api/access/groups/${id}/features`, data);
  },

  // ── Staff ↔ Groups ────────────────────────────────────────────────────

  // GET /api/access/staff/{staffId}/groups
  getStaffGroups: async (staffId: string): Promise<StaffGroupDto[]> => {
    const response = await api.get<StaffGroupDto[]>(`/api/access/staff/${staffId}/groups`);
    return response.data;
  },

  // POST /api/access/staff/{staffId}/groups/{groupId}
  addStaffToGroup: async (staffId: string, groupId: number): Promise<void> => {
    await api.post(`/api/access/staff/${staffId}/groups/${groupId}`);
  },

  // DELETE /api/access/staff/{staffId}/groups/{groupId}
  removeStaffFromGroup: async (staffId: string, groupId: number): Promise<void> => {
    await api.delete(`/api/access/staff/${staffId}/groups/${groupId}`);
  },

  // GET /api/access/staff/{staffId}/permissions
  getStaffPermissions: async (staffId: string): Promise<FeatureDto[]> => {
    const response = await api.get<FeatureDto[]>(`/api/access/staff/${staffId}/permissions`);
    return response.data;
  },

  // ── Department Matrix ─────────────────────────────────────────────────

  // GET /api/access/department/{deptId}/matrix
  getDeptMatrix: async (deptId: string): Promise<MatrixRow[]> => {
    const response = await api.get<MatrixRow[]>(`/api/access/department/${deptId}/matrix`);
    return response.data;
  },

  // POST /api/access/department/{deptId}/matrix
  saveDeptMatrix: async (deptId: string, data: SaveMatrixDto): Promise<void> => {
    await api.post(`/api/access/department/${deptId}/matrix`, data);
  },

  // PUT /api/access/staff/{staffId}/feature/{featureKey}
  toggleFeature: async (staffId: string, featureKey: string, hasAccess: boolean): Promise<void> => {
    await api.put(`/api/access/staff/${staffId}/feature/${featureKey}`, { hasAccess });
  },

  // POST /api/access/staff/{staffId}/grant-all?deptId={deptId}
  grantAll: async (staffId: string, deptId: string): Promise<void> => {
    await api.post(`/api/access/staff/${staffId}/grant-all`, null, {
      params: { deptId },
    });
  },

  // DELETE /api/access/staff/{staffId}/revoke-all
  revokeAll: async (staffId: string): Promise<void> => {
    await api.delete(`/api/access/staff/${staffId}/revoke-all`);
  },
};

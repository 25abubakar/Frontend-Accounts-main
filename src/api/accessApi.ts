// src/api/accessApi.ts
import api from './axios';

// ── Types ─────────────────────────────────────────────────────────────────

// Tri-state permission value
export type PermissionState = "ALLOW" | "DENY" | "INHERIT";

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

// ── New matrix types (updated API shape) ──────────────────────────────────

export interface MatrixStaffRow {
  staffId: string | null;
  personId: string;
  fullName: string;
  loginId: string;
  jobTitle: string | null;
  vacancyCode: string | null;
  isHired: boolean;
  permissions: { featureKey: string; hasAccess: boolean; state?: PermissionState }[];
}

export interface MatrixResponse {
  deptId: number;
  totalStaff: number;
  features: FeatureDto[];
  staff: MatrixStaffRow[];
}

// Bulk save body — tri-state
export interface SaveMatrixDto {
  items: { staffId: string; featureKey: string; hasAccess: boolean; state?: PermissionState }[];
}

// Legacy row type (kept for compat)
export interface MatrixRow {
  staffId: string;
  fullName: string;
  loginId: string;
  jobTitle: string;
  permissions: { featureKey: string; featureName: string; module: string; hasAccess: boolean }[];
}

export interface StaffGroupDto {
  groupId: number;
  groupName: string;
  description: string | null;
  features: string[];
}

// Person in a department (new endpoint)
export interface DeptPersonDto {
  personId: string;
  staffId: string | null;
  fullName: string;
  loginId: string;
  email: string | null;
  photoUrl: string | null;
  isHired: boolean;
  jobTitle: string | null;
  vacancyCode: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function toArray<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === 'object') {
    const obj = d as Record<string, unknown>;
    if (Array.isArray(obj.$values)) return obj.$values as T[];
    if (Array.isArray(obj.data))    return obj.data as T[];
    if (Array.isArray(obj.items))   return obj.items as T[];
    if (Array.isArray(obj.staff))   return obj.staff as T[];
  }
  return [];
}

// ── API ───────────────────────────────────────────────────────────────────

export const accessApi = {

  // ── Features ──────────────────────────────────────────────────────────

  // GET /api/access/features
  getAllFeatures: async (): Promise<FeatureDto[]> => {
    const { data } = await api.get('/api/access/features');
    return toArray<FeatureDto>(data);
  },

  // GET /api/access/features/module/{module}
  getFeaturesByModule: async (module: string): Promise<FeatureDto[]> => {
    const { data } = await api.get(`/api/access/features/module/${encodeURIComponent(module)}`);
    return toArray<FeatureDto>(data);
  },

  // ── Groups ────────────────────────────────────────────────────────────

  // GET /api/access/groups
  getGroups: async (): Promise<AccessGroupDto[]> => {
    const { data } = await api.get('/api/access/groups');
    const arr = toArray<AccessGroupDto>(data);
    // Normalize each group's features array
    return arr.map(g => ({
      ...g,
      features: toArray<string>(g.features as unknown),
    }));
  },

  // POST /api/access/groups
  createGroup: async (payload: CreateGroupDto): Promise<AccessGroupDto> => {
    const { data } = await api.post<AccessGroupDto>('/api/access/groups', payload);
    return data;
  },

  // GET /api/access/groups/{id}
  getGroupById: async (id: number): Promise<AccessGroupDto> => {
    const { data } = await api.get<AccessGroupDto>(`/api/access/groups/${id}`);
    return data;
  },

  // PUT /api/access/groups/{id}
  updateGroup: async (id: number, payload: CreateGroupDto): Promise<AccessGroupDto> => {
    const { data } = await api.put<AccessGroupDto>(`/api/access/groups/${id}`, payload);
    return data;
  },

  // DELETE /api/access/groups/{id}
  deleteGroup: async (id: number): Promise<void> => {
    await api.delete(`/api/access/groups/${id}`);
  },

  // PUT /api/access/groups/{id}/features
  updateGroupFeatures: async (id: number, payload: UpdateGroupFeaturesDto): Promise<{ message: string }> => {
    const { data } = await api.put(`/api/access/groups/${id}/features`, payload);
    return data;
  },

  // POST /api/access/groups/{id}/sync — Manual sync group features to department matrix
  syncGroupToMatrix: async (id: number): Promise<{ success: boolean; message: string; staffSynced: number; permissionsSynced: number }> => {
    const { data } = await api.post(`/api/access/groups/${id}/sync`);
    return data;
  },

  // ── Staff ↔ Groups ────────────────────────────────────────────────────

  // GET /api/access/staff/{staffId}/groups
  getStaffGroups: async (staffId: string): Promise<StaffGroupDto[]> => {
    const { data } = await api.get(`/api/access/staff/${staffId}/groups`);
    return toArray<StaffGroupDto>(data);
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
  // Returns array of featureKeys (strings) OR array of FeatureDto
  getStaffPermissions: async (staffId: string): Promise<string[]> => {
    const { data } = await api.get(`/api/access/staff/${staffId}/permissions`);
    // Backend may return { staffId, permissions: [...] } or plain array
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      const perms = obj.permissions ?? obj.$values ?? obj.data;
      return toArray<string>(perms);
    }
    return toArray<string>(data);
  },

  // ── Department Matrix (NEW API shape) ─────────────────────────────────

  // GET /api/access/department/{deptId}/matrix
  getDeptMatrix: async (deptId: string): Promise<MatrixResponse> => {
    const { data } = await api.get(`/api/access/department/${deptId}/matrix`);
    // Normalize: backend may return the object directly or wrapped
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      return {
        deptId:     (obj.deptId as number)     ?? 0,
        totalStaff: (obj.totalStaff as number) ?? 0,
        features:   toArray<FeatureDto>(obj.features),
        staff:      toArray<MatrixStaffRow>(obj.staff),
      };
    }
    // Fallback: old array shape — wrap it
    return { deptId: 0, totalStaff: 0, features: [], staff: toArray<MatrixStaffRow>(data) };
  },

  // GET /api/access/department/{deptId}/persons
  getDeptPersons: async (deptId: string): Promise<DeptPersonDto[]> => {
    const { data } = await api.get(`/api/access/department/${deptId}/persons`);
    return toArray<DeptPersonDto>(data);
  },

  // POST /api/access/department/{deptId}/matrix  (bulk save)
  saveDeptMatrix: async (deptId: string, payload: SaveMatrixDto): Promise<void> => {
    await api.post(`/api/access/department/${deptId}/matrix`, payload);
  },

  // PUT /api/access/staff/{staffId}/feature/{featureKey}
  toggleFeature: async (staffId: string, featureKey: string, hasAccess: boolean): Promise<void> => {
    await api.put(`/api/access/staff/${staffId}/feature/${featureKey}`, { hasAccess });
  },

  // POST /api/access/staff/{staffId}/grant-all?deptId={deptId}
  grantAll: async (staffId: string, deptId: string): Promise<void> => {
    await api.post(`/api/access/staff/${staffId}/grant-all`, null, { params: { deptId } });
  },

  // DELETE /api/access/staff/{staffId}/revoke-all
  revokeAll: async (staffId: string): Promise<void> => {
    await api.delete(`/api/access/staff/${staffId}/revoke-all`);
  },
};

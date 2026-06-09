import api from './axios';
import { API } from './endpoints';
import { toArray } from './apiHelpers';

export type { SidebarItem } from '../types/api';

export interface MenuPermissionNode {
  id: number;
  title: string;
  icon?: string | null;
  route?: string | null;
  sortOrder: number;
  featureKeys?: string[];
  children?: MenuPermissionNode[];
}

export type OverrideStatus = 'ALLOW' | 'DENY';

export interface PermissionOverride {
  featureKey: string;
  status: OverrideStatus;
  reason: string | null;
  source: 'UserAllow' | 'UserDeny' | 'RoleDefault' | 'Matrix' | 'Denied';
}

export interface EffectivePermission {
  featureKey: string;
  featureName: string;
  module: string;
  hasAccess: boolean;
  source: PermissionOverride['source'];
}

export const rbacApi = {
  getSidebar: async () => {
    const { data } = await api.get(API.rbac.sidebar);
    return toArray<import('../types/api').SidebarItem>(data);
  },

  hasAccess: async (staffId: string, featureKey: string): Promise<boolean> => {
    const { data } = await api.get(API.rbac.staffHasAccess(staffId, featureKey));
    if (typeof data === 'boolean') return data;
    return !!(data as { hasAccess?: boolean })?.hasAccess;
  },

  getEffectivePermissions: async (staffId: string): Promise<EffectivePermission[]> => {
    const { data } = await api.get(API.rbac.staffEffectivePermissions(staffId));
    return toArray<EffectivePermission>(data);
  },

  getOverrides: async (staffId: string): Promise<PermissionOverride[]> => {
    const { data } = await api.get(API.rbac.staffOverrides(staffId));
    return toArray<PermissionOverride>(data);
  },

  setOverride: async (
    staffId: string,
    featureKey: string,
    status: 'ALLOW' | 'DENY',
    reason?: string
  ): Promise<void> => {
    await api.put(API.rbac.staffOverride(staffId, featureKey), {
      status,
      reason: reason ?? 'Updated from portal',
    });
  },

  removeOverride: async (staffId: string, featureKey: string): Promise<void> => {
    await api.delete(API.rbac.staffOverride(staffId, featureKey));
  },

  getMenuPermissions: async (): Promise<MenuPermissionNode[]> => {
    const { data } = await api.get(API.rbac.menuPermissions);
    return toArray<MenuPermissionNode>(data);
  },

  getMenuFeatureKeys: async (menuId: number): Promise<string[]> => {
    const { data } = await api.get(API.rbac.menuFeatureKeys(menuId));
    return toArray<string>(data);
  },

  grantMenu: async (staffId: string, menuId: number, reason: string): Promise<void> => {
    await api.post(API.rbac.grantMenu(staffId, menuId), { reason });
  },

  revokeMenu: async (staffId: string, menuId: number): Promise<void> => {
    await api.post(API.rbac.revokeMenu(staffId, menuId), {});
  },

  getMatrix: async (deptId: string | number) => {
    const { data } = await api.get(API.rbac.matrix(deptId));
    return data;
  },

  seedFeatures: async () => {
    const { data } = await api.post(API.rbac.seedFeatures);
    return data;
  },
};

// src/api/rbacApi.ts
// RBAC — Role-Based Access Control endpoints
import api from './axios';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SidebarItem {
  id: number;
  title: string;
  icon: string | null;
  route: string | null;
  sortOrder: number;
  children: SidebarItem[];
}

export type OverrideStatus = "ALLOW" | "DENY";

export interface PermissionOverride {
  featureKey: string;
  status: OverrideStatus;
  reason: string | null;
  source: "UserAllow" | "UserDeny" | "RoleDefault" | "Matrix" | "Denied";
}

export interface EffectivePermission {
  featureKey: string;
  featureName: string;
  module: string;
  hasAccess: boolean;
  source: "UserAllow" | "UserDeny" | "RoleDefault" | "Matrix" | "Denied";
}

// ── API ───────────────────────────────────────────────────────────────────

export const rbacApi = {

  // GET /api/rbac/sidebar
  // Backend filters menus by user's MENU_ permissions from their access group
  getSidebar: async (): Promise<SidebarItem[]> => {
    const { data } = await api.get('/api/rbac/sidebar');
    if (Array.isArray(data)) return data;
    const d = data as Record<string, unknown>;
    return (d?.$values ?? d?.data ?? []) as SidebarItem[];
  },

  // GET /api/rbac/staff/{staffId}/effective-permissions
  // Returns all features with hasAccess + source for the staff member
  getEffectivePermissions: async (staffId: string): Promise<EffectivePermission[]> => {
    const { data } = await api.get(`/api/rbac/staff/${staffId}/effective-permissions`);
    if (Array.isArray(data)) return data;
    const d = data as Record<string, unknown>;
    return (d?.$values ?? d?.data ?? []) as EffectivePermission[];
  },

  // PUT /api/rbac/staff/{staffId}/overrides/{featureKey}
  // Set explicit ALLOW or DENY override
  setOverride: async (staffId: string, featureKey: string, status: OverrideStatus, reason?: string): Promise<void> => {
    await api.put(`/api/rbac/staff/${staffId}/overrides/${featureKey}`, { status, reason: reason ?? null });
  },

  // DELETE /api/rbac/staff/{staffId}/overrides/{featureKey}
  // Remove override — reverts to role default
  removeOverride: async (staffId: string, featureKey: string): Promise<void> => {
    await api.delete(`/api/rbac/staff/${staffId}/overrides/${featureKey}`);
  },

  // GET /api/rbac/staff/{staffId}/overrides
  // Get all overrides for a staff member
  getOverrides: async (staffId: string): Promise<PermissionOverride[]> => {
    const { data } = await api.get(`/api/rbac/staff/${staffId}/overrides`);
    if (Array.isArray(data)) return data;
    const d = data as Record<string, unknown>;
    return (d?.$values ?? d?.data ?? []) as PermissionOverride[];
  },
};

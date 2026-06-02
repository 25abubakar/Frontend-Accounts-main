import api from './axios';
import { httpClient } from './httpClient';
import type { MenuDto } from '../models/menuModels';

export interface ApiMenuItem {
  id: number;
  title: string;
  icon?: string | null;
  route?: string | null;
  parentId?: number | null;
  sortOrder: number;
  roles?: string[];
  children?: ApiMenuItem[];
}

export interface CreateMenuDto {
  title: string;
  icon?: string | null;
  route?: string | null;
  parentId?: number | null;
  sortOrder: number;
  requiredRoles?: string[];
}

export interface SeedResult {
  seeded: number;
  skipped: number;
  errors: number;
  message: string;
}

export const menuApi = {
  getSidebarTree: async (): Promise<ApiMenuItem[]> => {
    const response = await api.get('/api/Menus/sidebar-tree');
    const data = response.data;
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  getActive: () => httpClient.get<MenuDto[]>("/api/app-menu-definitions/active"),

  // POST /api/menus/seed  — one-time backend seed (no auth required)
  // Seeds the full STATIC_NAV structure with permission keys into the Menus table
  seedMenus: async (): Promise<SeedResult> => {
    const response = await api.post<SeedResult>('/api/menus/seed');
    return response.data;
  },

  createMenu: async (data: CreateMenuDto): Promise<ApiMenuItem> => {
    const response = await api.post<ApiMenuItem>('/api/Menus', data);
    return response.data;
  },

  updateMenu: async (id: number, data: CreateMenuDto): Promise<void> => {
    await api.put(`/api/Menus/${id}`, data);
  },

  deleteMenu: async (id: number): Promise<void> => {
    await api.delete(`/api/Menus/${id}`);
  },
};
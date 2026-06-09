import api from './axios';
import { API } from './endpoints';
import { httpClient } from './httpClient';
import { toArray } from './apiHelpers';
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
  getAll: async (): Promise<ApiMenuItem[]> => {
    const { data } = await api.get(API.menus.root);
    return toArray<ApiMenuItem>(data);
  },

  getSidebarTree: async (): Promise<ApiMenuItem[]> => {
    const { data } = await api.get(API.menus.sidebarTree);
    return toArray<ApiMenuItem>(data);
  },

  getWithPermissions: async () => {
    const { data } = await api.get(API.menus.withPermissions);
    return data;
  },

  getActive: () => httpClient.get<MenuDto[]>(API.appMenuDefinitions.active),

  seedMenus: async (): Promise<SeedResult> => {
    const { data } = await api.post<SeedResult>(API.menus.seed);
    return data as SeedResult;
  },

  createMenu: async (payload: CreateMenuDto): Promise<ApiMenuItem> => {
    const { data } = await api.post<ApiMenuItem>(API.menus.root, payload);
    return data as ApiMenuItem;
  },

  updateMenu: async (id: number, payload: CreateMenuDto): Promise<void> => {
    await api.put(API.menus.menu(id), payload);
  },

  deleteMenu: async (id: number): Promise<void> => {
    await api.delete(API.menus.menu(id));
  },

  updateMenuPermissions: async (id: number, body: unknown): Promise<void> => {
    await api.put(API.menus.menuPermissions(id), body);
  },

  bulkPermissions: async (body: unknown): Promise<void> => {
    await api.post(API.menus.bulkPermissions, body);
  },
};

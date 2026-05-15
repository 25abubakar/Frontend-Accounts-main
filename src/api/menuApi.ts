import api from './axios';

export interface ApiMenuItem {
  id: number;
  title: string;
  icon?: string | null;
  route?: string | null;
  parentId?: number | null; 
  sortOrder: number;
  roles?: string[]; // 🌟 Matches the 'Roles' field in your C# MenuTreeNodeDto
  children?: ApiMenuItem[];
}

export interface CreateMenuDto {
  title: string;
  icon?: string | null;
  route?: string | null;
  parentId?: number | null;
  sortOrder: number;
  requiredRoles?: string[]; // 🌟 Matches your C# DTO for POST/PUT
}

export const menuApi = {
  getSidebarTree: async (): Promise<ApiMenuItem[]> => {
    const response = await api.get('/api/Menus/sidebar-tree');
    const data = response.data;
    return Array.isArray(data) ? data : data?.$values || data?.data || [];
  },

  createMenu: async (data: CreateMenuDto): Promise<ApiMenuItem> => {
    const response = await api.post<ApiMenuItem>('/api/Menus', data);
    return response.data;
  },

  updateMenu: async (id: number, data: CreateMenuDto): Promise<void> => {
    // 🌟 Matches the PUT endpoint in image_ae43f7.png
    await api.put(`/api/Menus/${id}`, data);
  },

  deleteMenu: async (id: number): Promise<void> => {
    await api.delete(`/api/Menus/${id}`);
  },
};
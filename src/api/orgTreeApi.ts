// src/api/orgTreeApi.ts
import api from './axios';
import type { OrgNode, OrgFlatTreeNode, CreateOrgNodeDto, UpdateOrgNodeDto } from '../types';

export const orgTreeApi = {

  // GET /api/organization/country-lookup?name=
  countryLookup: async (name: string): Promise<{ flagUrl: string; code: string }> => {
    const response = await api.get('/api/organization/country-lookup', {
      params: { name },
    });
    return response.data;
  },

  // GET /api/organization/country-search?q=
  countrySearch: async (query: string): Promise<{ name: string; flagUrl: string; code: string }[]> => {
    const response = await api.get('/api/organization/country-search', {
      params: { q: query },
    });
    return response.data;
  },

  // GET /api/organization/tree
  getTree: async (): Promise<OrgNode[]> => {
    const response = await api.get<OrgNode[]>('/api/organization/tree');
    return response.data;
  },

  // GET /api/organization/tree/{startId}
  getSubTree: async (startId: number): Promise<OrgNode[]> => {
    const response = await api.get<OrgNode[]>(`/api/organization/tree/${startId}`);
    return response.data;
  },

  // GET /api/organization/flat-tree
  getFlatTree: async (): Promise<OrgFlatTreeNode[]> => {
    const response = await api.get<OrgFlatTreeNode[]>('/api/organization/flat-tree');
    return response.data;
  },

  // GET /api/organization/{id}/children
  getChildren: async (id: number): Promise<OrgNode[]> => {
    const response = await api.get<OrgNode[]>(`/api/organization/${id}/children`);
    return response.data;
  },

  // GET /api/organization/search?q=
  search: async (query: string): Promise<OrgNode[]> => {
    const response = await api.get<OrgNode[]>('/api/organization/search', {
      params: { q: query },
    });
    return response.data;
  },

  // GET /api/organization
  getAll: async (): Promise<OrgNode[]> => {
    const response = await api.get<OrgNode[]>('/api/organization');
    return response.data;
  },

  // POST /api/organization
  createNode: async (data: CreateOrgNodeDto): Promise<OrgNode> => {
    const response = await api.post<OrgNode>('/api/organization', data);
    return response.data;
  },

  // GET /api/organization/{id}
  getById: async (id: number): Promise<OrgNode> => {
    const response = await api.get<OrgNode>(`/api/organization/${id}`);
    return response.data;
  },

  // PUT /api/organization/{id}
  updateNode: async (id: number, data: UpdateOrgNodeDto): Promise<OrgNode> => {
    const response = await api.put<OrgNode>(`/api/organization/${id}`, data);
    return response.data;
  },

  // DELETE /api/organization/{id}
  deleteNode: async (id: number): Promise<void> => {
    await api.delete(`/api/organization/${id}`);
  },

  // GET /api/organization/by-label/{label}
  getByLabel: async (label: string): Promise<OrgNode[]> => {
    const response = await api.get<OrgNode[]>(`/api/organization/by-label/${encodeURIComponent(label)}`);
    return response.data;
  },
};

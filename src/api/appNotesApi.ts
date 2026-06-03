import api from './axios';
import type { AppNoteDto, CreateAppNoteRequest } from "../models/appNoteModels";

export const appNotesApi = {
  getVisible: async (menuCode?: string, entityType?: string, entityId?: string): Promise<AppNoteDto[]> => {
    const params = new URLSearchParams();
    if (menuCode) params.append("menuCode", menuCode);
    if (entityType) params.append("entityType", entityType);
    if (entityId) params.append("entityId", entityId);
    
    const { data } = await api.get(`/api/app-notes/visible?${params.toString()}`);
    // FIX: Extract from the backend's wrapper (data.data)
    const list = data?.data || data?.$values || data;
    return Array.isArray(list) ? list : [];
  },

  create: async (request: CreateAppNoteRequest): Promise<AppNoteDto> => {
    const { data } = await api.post("/api/app-notes", request);
    return data?.data || data; // Unwraps the created note object
  },

  update: async (noteId: number, request: CreateAppNoteRequest): Promise<AppNoteDto> => {
    const { data } = await api.put(`/api/app-notes/${noteId}`, request);
    return data?.data || data; // Unwraps the updated note object
  },

  delete: async (noteId: number): Promise<void> => {
    const { data } = await api.delete(`/api/app-notes/${noteId}`);
    // Unwrap envelope: if backend returns { success: false } with HTTP 200, treat it as an error
    if (data && typeof data === 'object' && 'success' in data && !data.success) {
      throw new Error(data.message || 'Failed to delete note.');
    }
  },

  markRead: async (noteId: number): Promise<void> => {
    await api.post(`/api/app-notes/${noteId}/mark-read`);
  },

  acknowledge: async (noteId: number): Promise<void> => {
    await api.post(`/api/app-notes/${noteId}/acknowledge`);
  },

  dismiss: async (noteId: number): Promise<void> => {
    await api.post(`/api/app-notes/${noteId}/dismiss`);
  },

  getUnreadCount: async (menuCode?: string): Promise<number> => {
    const url = menuCode 
      ? `/api/app-notes/unread-count?menuCode=${encodeURIComponent(menuCode)}` 
      : "/api/app-notes/unread-count";
    const { data } = await api.get(url);
    return typeof data?.data === 'number' ? data.data : data;
  },
};
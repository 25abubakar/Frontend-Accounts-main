import { httpClient } from "./httpClient";
import type { AppNoteDto, CreateAppNoteRequest } from "../models/appNoteModels";

export const appNotesApi = {
  getVisible: (menuCode?: string, entityType?: string, entityId?: string) => {
    const params = new URLSearchParams();
    if (menuCode) params.append("menuCode", menuCode);
    if (entityType) params.append("entityType", entityType);
    if (entityId) params.append("entityId", entityId);
    return httpClient.get<AppNoteDto[]>(`/api/app-notes/visible?${params.toString()}`);
  },
  create: (request: CreateAppNoteRequest) => httpClient.post<AppNoteDto>("/api/app-notes", request),
  update: (noteId: number, request: CreateAppNoteRequest) => httpClient.put<AppNoteDto>(`/api/app-notes/${noteId}`, request),
  delete: (noteId: number) => httpClient.delete<unknown>(`/api/app-notes/${noteId}`),
  markRead: (noteId: number) => httpClient.post<unknown>(`/api/app-notes/${noteId}/mark-read`),
  acknowledge: (noteId: number) => httpClient.post<unknown>(`/api/app-notes/${noteId}/acknowledge`),
  dismiss: (noteId: number) => httpClient.post<unknown>(`/api/app-notes/${noteId}/dismiss`),
  getUnreadCount: (menuCode?: string) => {
    const url = menuCode ? `/api/app-notes/unread-count?menuCode=${encodeURIComponent(menuCode)}` : "/api/app-notes/unread-count";
    return httpClient.get<number>(url);
  },
};

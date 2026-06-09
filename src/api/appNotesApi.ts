import { httpClient } from './httpClient';
import { API } from './endpoints';
import { buildQuery } from './apiHelpers';
import type { AppNoteDto } from '../types/api';
import type { CreateAppNoteRequest } from '../models/appNoteModels';

export type { AppNoteDto };

export const appNotesApi = {
  getVisible: (menuCode?: string, entityType?: string, entityId?: string) => {
    const qs = buildQuery({ menuCode, entityType, entityId });
    return httpClient.get<AppNoteDto[]>(`${API.appNotes.visible}${qs}`);
  },

  getLoginInstructions: () => httpClient.get<AppNoteDto[]>(API.appNotes.loginInstructions),

  getAdminInstructions: () => httpClient.get<AppNoteDto[]>(API.appNotes.adminInstructions),

  getById: (noteId: number) => httpClient.get<AppNoteDto>(API.appNotes.note(noteId)),

  getUnreadCount: (menuCode?: string) => {
    const qs = menuCode ? buildQuery({ menuCode }) : '';
    return httpClient.get<number>(`${API.appNotes.unreadCount}${qs}`);
  },

  create: (request: CreateAppNoteRequest) => httpClient.post<AppNoteDto>(API.appNotes.root, request),

  update: (noteId: number, request: CreateAppNoteRequest) =>
    httpClient.put<AppNoteDto>(API.appNotes.note(noteId), request),

  delete: (noteId: number) => httpClient.delete<unknown>(API.appNotes.note(noteId)),

  markRead: (noteId: number) => httpClient.post<unknown>(API.appNotes.markRead(noteId)),

  acknowledge: (noteId: number) => httpClient.post<unknown>(API.appNotes.acknowledge(noteId)),

  dismiss: (noteId: number) => httpClient.post<unknown>(API.appNotes.dismiss(noteId)),
};

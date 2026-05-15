// src/api/auth.ts
import api from './axios';
import type { RegisterDto, LoginDto, AuthResponse, AssignRoleDto, AuthUser } from '../types';

export const AuthAPI = {

  // POST /api/Auth/register
  // Response: { success, message, email, roles }
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/Auth/register', data);
    return response.data;
  },

  // POST /api/Auth/login
  // Backend uses cookie-based auth — no token in response body
  // Response: { success, message, email, roles }
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/Auth/login', data);
    return response.data;
  },

  // POST /api/Auth/logout
  logout: async (): Promise<void> => {
    await api.post('/api/Auth/logout');
  },

  // POST /api/Auth/assign-role
  assignRole: async (data: AssignRoleDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/Auth/assign-role', data);
    return response.data;
  },

  // GET /api/Auth/users
  getUsers: async (): Promise<AuthUser[]> => {
    const response = await api.get<AuthUser[]>('/api/Auth/users');
    return response.data;
  },
};

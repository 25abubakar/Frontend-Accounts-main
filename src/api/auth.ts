import api from './axios';
import { API } from './endpoints';
import { unwrapResponse, toArray } from './apiHelpers';
import type { RegisterDto, AssignRoleDto, AuthUser } from '../types';
import type { AuthResponseDto, UserSessionDto } from '../types/api';

export interface LoginPayload {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export const AuthAPI = {
  register: async (data: RegisterDto): Promise<AuthResponseDto> => {
    const res = await api.post(API.auth.register, data);
    return res.data as AuthResponseDto;
  },

  login: async (payload: LoginPayload): Promise<AuthResponseDto> => {
    const res = await api.post(API.auth.login, {
      username: payload.username,
      password: payload.password,
      rememberMe: payload.rememberMe ?? false,
    });
    return res.data as AuthResponseDto;
  },

  logout: async (): Promise<void> => {
    await api.post(API.auth.logout);
  },

  getSession: async (): Promise<UserSessionDto> => {
    const res = await api.get(API.auth.session);
    return unwrapResponse<UserSessionDto>(res);
  },

  assignRole: async (data: AssignRoleDto): Promise<AuthResponseDto> => {
    const res = await api.post(API.auth.assignRole, data);
    return res.data as AuthResponseDto;
  },

  getUsers: async (): Promise<AuthUser[]> => {
    const res = await api.get(API.auth.users);
    return toArray<AuthUser>(res.data);
  },
};

export const authApi = AuthAPI;

// src/api/personsApi.ts
import api from './axios';

export interface PersonDto {
  personId: string;
  loginId: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  phone: string;
  email: string;
  currentAddress: AddressDto;
  permanentAddress: AddressDto;
  photoUrl?: string | null;
  isHired: boolean;
  registeredAt: string;
}

export interface AddressDto {
  addressLine: string;
  country: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
}

export interface RegisterPersonDto {
  branchId: number;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  phone: string;
  email: string;
  currentAddress: AddressDto;
  permanentAddress: AddressDto;
  password?: string; // Made optional since the backend ignores it now
  vacancyId?: string;
}

export interface UpdatePersonDto {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  phone: string;
  email: string;
  currentAddress: AddressDto;
  permanentAddress: AddressDto;
}

export interface OrgTreeNodeDto {
  id: number;
  name: string;
  label: string;
  children?: OrgTreeNodeDto[];
}

// 🌟 UPDATED: Matches the new backend PreviewLoginId payload
export interface PreviewLoginIdDto {
  loginId: string;
  password?: string;
  generatedEmail?: string;
  emailDomain?: string;
  companyName?: string;
  companyCode?: string;
  branchName?: string;
}

// 🌟 NEW: Payload for the preview-email endpoint
export interface PreviewEmailDto {
  generatedEmail: string;
  emailDomain: string;
  companyName: string;
}

// 🌟 NEW: The backend now returns a wrapped object containing the generated credentials
export interface RegisterResponseDto {
  person: PersonDto;
  generatedLoginId: string;
  generatedPassword: string;
  generatedEmail: string;
  note?: string;
}

export const personsApi = {

  // GET /api/Persons/org-tree
  getOrgTree: async (): Promise<OrgTreeNodeDto[]> => {
    const response = await api.get<OrgTreeNodeDto[]>('/api/Persons/org-tree');
    return response.data;
  },

  // GET /api/Persons/preview-login-id?branchId=5
  previewLoginId: async (branchId: number): Promise<PreviewLoginIdDto> => {
    const response = await api.get<PreviewLoginIdDto>('/api/Persons/preview-login-id', {
      params: { branchId },
    });
    return response.data;
  },

  // 🌟 NEW: GET /api/Persons/preview-email?branchId=5&fullName=John+Doe
  previewEmail: async (branchId: number, fullName: string): Promise<PreviewEmailDto> => {
    const response = await api.get<PreviewEmailDto>('/api/Persons/preview-email', {
      params: { branchId, fullName },
    });
    return response.data;
  },

  // 🌟 UPDATED: Now returns RegisterResponseDto instead of PersonDto
  register: async (data: RegisterPersonDto): Promise<RegisterResponseDto> => {
    const response = await api.post<RegisterResponseDto>('/api/Persons/register', data);
    return response.data;
  },

  // GET /api/Persons
  getAll: async (): Promise<PersonDto[]> => {
    const response = await api.get<PersonDto[]>('/api/Persons');
    return response.data;
  },

  // GET /api/Persons/unassigned
  getUnassigned: async (): Promise<PersonDto[]> => {
    const response = await api.get<PersonDto[]>('/api/Persons/unassigned');
    return response.data;
  },

  // GET /api/Persons/{id}
  getById: async (id: string): Promise<PersonDto> => {
    const response = await api.get<PersonDto>(`/api/Persons/${id}`);
    return response.data;
  },

  // PUT /api/Persons/{id}
  update: async (id: string, data: UpdatePersonDto): Promise<PersonDto> => {
    const response = await api.put<PersonDto>(`/api/Persons/${id}`, data);
    return response.data;
  },

  // DELETE /api/Persons/{id}
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/Persons/${id}`);
  },

  // POST /api/Persons/{id}/upload-photo
  uploadPhoto: async (id: string, file: File): Promise<{ photoUrl: string; fullUrl: string }> => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post<{ photoUrl: string; fullUrl: string }>(
      `/api/Persons/${id}/upload-photo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // POST /api/Persons/{id}/reset-to-default-password
  resetToDefaultPassword: async (id: string): Promise<void> => {
    await api.post(`/api/Persons/${id}/reset-to-default-password`);
  },

  // POST /api/Persons/{id}/change-password
  changePassword: async (id: string, data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await api.post(`/api/Persons/${id}/change-password`, data);
  },

  // GET /api/Persons/profiles
  getProfiles: async (): Promise<PersonDto[]> => {
    const response = await api.get<PersonDto[]>('/api/Persons/profiles');
    return response.data;
  },

  // GET /api/Persons/{id}/profile
  getProfile: async (id: string): Promise<PersonDto> => {
    const response = await api.get<PersonDto>(`/api/Persons/${id}/profile`);
    return response.data;
  },
};
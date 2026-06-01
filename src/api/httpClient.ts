import api from './axios';

export const httpClient = {
  get: async <T>(url: string): Promise<T> => {
    const response = await api.get<T>(url);
    // Unwrap { success, data, message, errors } envelope if present
    const raw = response.data as any;
    if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) {
      if (!raw.success) throw new Error(raw.message || 'API request failed.');
      return (Array.isArray(raw.data) ? raw.data : raw.data ?? []) as T;
    }
    return response.data;
  },
  post: async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await api.post<T>(url, body);
    const raw = response.data as any;
    if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) {
      if (!raw.success) throw new Error(raw.message || 'API request failed.');
      return (raw.data ?? null) as T;
    }
    return response.data;
  },
  put: async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await api.put<T>(url, body);
    const raw = response.data as any;
    if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) {
      if (!raw.success) throw new Error(raw.message || 'API request failed.');
      return (raw.data ?? null) as T;
    }
    return response.data;
  },
  delete: async <T>(url: string): Promise<T> => {
    const response = await api.delete<T>(url);
    const raw = response.data as any;
    if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) {
      if (!raw.success) throw new Error(raw.message || 'API request failed.');
      return (raw.data ?? null) as T;
    }
    return response.data;
  },
};

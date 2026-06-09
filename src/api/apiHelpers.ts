import type { AxiosResponse } from 'axios';

export interface CommApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

export function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['$values', 'data', 'items', 'staff', 'permissions']) {
      if (Array.isArray(o[key])) return o[key] as T[];
    }
  }
  return [];
}

export function unwrap<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'success' in data) {
    const w = data as CommApiEnvelope<T>;
    if (!w.success) throw new Error(w.message || 'API request failed');
    return w.data;
  }
  return data as T;
}

export function unwrapResponse<T>(response: AxiosResponse<unknown>): T {
  return unwrap<T>(response.data);
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

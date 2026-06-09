import type { AxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Request failed.'): string {
  if (!error || typeof error !== 'object') return fallback;
  const ax = error as AxiosError<{ message?: string; Message?: string; errors?: string[] }>;
  const data = ax.response?.data;
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message) return data.message;
    if (typeof data.Message === 'string' && data.Message) return data.Message;
    if (Array.isArray(data.errors) && data.errors.length) return data.errors.join(', ');
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

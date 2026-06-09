import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5099';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  try {
    const raw = localStorage.getItem('lal-portal-auth');
    if (raw) {
      const state = JSON.parse(raw) as { state?: { token?: string | null } };
      const token = state?.state?.token;
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch { /* ignore */ }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const url: string = error.config?.url ?? '';
    const isAuthCall =
      /\/api\/auth\/(login|logout|register)/i.test(url) ||
      /\/api\/Auth\/(login|logout|register)/i.test(url);

    const status = error.response?.status;

    if (status === 401 && !isAuthCall) {
      try {
        localStorage.removeItem('lal-portal-auth');
      } catch { /* ignore */ }
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/register')) {
        window.location.href = '/login';
      }
    }

    if (status === 403) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.Message ||
        "You don't have permission to perform this action.";
      window.dispatchEvent(new CustomEvent('permission-denied', { detail: msg }));
    }

    return Promise.reject(error);
  }
);

export default api;

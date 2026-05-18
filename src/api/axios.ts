// src/api/axios.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5099';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Response interceptor ──────────────────────────────────────────────────
api.interceptors.response.use(
  response => response,
  error => {
    const url: string = error.config?.url ?? '';
    const isAuthCall =
      url.includes('/api/Auth/login') ||
      url.includes('/api/Auth/logout') ||
      url.includes('/api/Auth/register');

    const status = error.response?.status;

    // 401 — session expired → clear state and redirect to login
    if (status === 401 && !isAuthCall) {
      try { localStorage.removeItem('lal-portal-auth'); } catch { /* ignore */ }
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // 403 — permission denied → show toast (non-blocking)
    if (status === 403) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.Message ||
        "You don't have permission to perform this action.";
      // Dispatch a custom event — the app listens and shows a toast
      window.dispatchEvent(new CustomEvent('permission-denied', { detail: msg }));
    }

    return Promise.reject(error);
  }
);

export default api;

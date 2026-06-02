// src/api/axios.ts
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5099';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,          // sends the ASP.NET Identity cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────
// Backend uses cookie-based auth (ASP.NET Identity).
// withCredentials: true already handles cookies automatically.
// Additionally attach a Bearer token if one was saved (JWT fallback).
api.interceptors.request.use(config => {
  try {
    const raw = localStorage.getItem('lal-portal-auth');
    if (raw) {
      const state = JSON.parse(raw) as { state?: { token?: string | null } };
      const token = state?.state?.token;
      if (token) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch { /* localStorage unavailable or JSON invalid — continue without header */ }
  return config;
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

    // 403 — permission denied → dispatch event for toast (non-blocking)
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

// src/api/axios.ts
import axios from 'axios';

// Cookie-based auth — withCredentials sends the session cookie automatically.
// No Bearer token needed.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7015';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export default api;

// src/api/client.ts
import axios from 'axios';

// Vite looks for the variable, but falls back to localhost just in case
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7015';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});
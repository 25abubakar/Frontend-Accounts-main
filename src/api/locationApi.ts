// src/api/locationApi.ts
// No auth required — all data live from external APIs via backend proxy.
import api from './axios';
import type { CountryDto, ProvinceDto } from '../types';

export const locationApi = {

  // GET /api/locations/countries
  // Returns all countries sorted A-Z
  getCountries: async (): Promise<CountryDto[]> => {
    const response = await api.get<CountryDto[]>('/api/locations/countries');
    return response.data;
  },

  // GET /api/locations/countries/search?q=pak
  // Country autocomplete as user types
  searchCountries: async (q: string): Promise<CountryDto[]> => {
    const response = await api.get<CountryDto[]>('/api/locations/countries/search', {
      params: { q },
    });
    return response.data;
  },

  // GET /api/locations/provinces?country=Pakistan
  // Load provinces after country is selected
  getProvinces: async (country: string): Promise<ProvinceDto[]> => {
    const response = await api.get<ProvinceDto[]>('/api/locations/provinces', {
      params: { country },
    });
    return response.data;
  },

  // GET /api/locations/cities?country=Pakistan&state=Punjab
  // Load cities after province is selected
  getCities: async (country: string, state: string): Promise<string[]> => {
    const response = await api.get<string[]>('/api/locations/cities', {
      params: { country, state },
    });
    return response.data;
  },

  // GET /api/locations/full?country=Pakistan
  // Get all provinces for a country in one call
  getFull: async (country: string): Promise<{ country: string; states: ProvinceDto[] }> => {
    const response = await api.get<{ country: string; states: ProvinceDto[] }>(
      '/api/locations/full',
      { params: { country } }
    );
    return response.data;
  },
};

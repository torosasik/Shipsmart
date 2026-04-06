import axios from 'axios';
import type { ApiResponse, PaginatedResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const ratesApi = {
  shopRates: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/rates/shop', data).then((r) => r.data),
};

export const ordersApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<unknown>>('/orders', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<ApiResponse<unknown>>(`/orders/${id}`).then((r) => r.data),
  sync: () =>
    api.post<ApiResponse<unknown>>('/orders/sync').then((r) => r.data),
};

export const shipmentsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<unknown>>('/shipments', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<ApiResponse<unknown>>(`/shipments/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/shipments', data).then((r) => r.data),
};

export const returnsApi = {
  list: () =>
    api.get<PaginatedResponse<unknown>>('/returns').then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/returns', data).then((r) => r.data),
};

export const labelsApi = {
  generate: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/labels/generate', data).then((r) => r.data),
  void: (trackingNumber: string) =>
    api.post<ApiResponse<unknown>>('/labels/void', { trackingNumber }).then((r) => r.data),
};

export const consolidationApi = {
  opportunities: () =>
    api.get<ApiResponse<unknown>>('/consolidation/opportunities').then((r) => r.data),
  apply: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/consolidation/apply', data).then((r) => r.data),
};

export default api;

import axios from 'axios';
import type { ApiResponse, PaginatedResponse } from '../types';
import type { Order, Shipment, ReturnEvent } from '@shipsmart/shared';

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

// Dashboard API - get stats and metrics
export const dashboardApi = {
  getStats: () =>
    api.get<ApiResponse<{
      pendingOrders: number;
      activeShipments: number;
      deliveredShipments: number;
      pendingReturns: number;
      consolidationSavings: number;
      consolidationOpportunities: number;
    }>>('/dashboard/stats').then((r) => r.data),
  getRecentActivity: (limit = 10) =>
    api.get<ApiResponse<{
      orders: Order[];
      shipments: Shipment[];
      returns: ReturnEvent[];
    }>>('/dashboard/activity', { params: { limit } }).then((r) => r.data),
};

export const ratesApi = {
  shopRates: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/rates/shop', data).then((r) => r.data),
};

export const ordersApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedResponse<unknown>>('/orders', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<ApiResponse<unknown>>(`/orders/${id}`).then((r) => r.data),
  sync: () =>
    api.post<ApiResponse<unknown>>('/orders/sync').then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<unknown>>(`/orders/${id}/status`, { status }).then((r) => r.data),
};

export const shipmentsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<unknown>>('/shipments', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<ApiResponse<unknown>>(`/shipments/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/shipments', data).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<unknown>>(`/shipments/${id}/status`, { status }).then((r) => r.data),
};

export const returnsApi = {
  list: (params?: { page?: number; limit?: number; orderId?: string }) =>
    api.get<PaginatedResponse<unknown>>('/returns', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<ApiResponse<unknown>>(`/returns/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<unknown>>('/returns', data).then((r) => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch<ApiResponse<unknown>>(`/returns/${id}/status`, { status, notes }).then((r) => r.data),
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

export interface ServiceInfo {
  status: 'healthy' | 'unhealthy' | 'unconfigured';
  message: string;
}

export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    api: ServiceInfo;
    firebase: ServiceInfo;
    carriers: Record<string, ServiceInfo>;
  };
  version: string;
}

export const healthApi = {
  get: () => api.get<HealthData>('/health').then((r) => r.data),
};

export const carrierSettingsApi = {
  list: () =>
    api.get<ApiResponse<unknown>>('/settings/carriers').then((r) => r.data),
  get: (carrierId: string) =>
    api.get<ApiResponse<unknown>>(`/settings/carriers/${carrierId}`).then((r) => r.data),
  update: (carrierId: string, data: { enabled: boolean; sandbox: boolean; credentials: Record<string, string> }) =>
    api.put<ApiResponse<unknown>>(`/settings/carriers/${carrierId}`, data).then((r) => r.data),
  test: (carrierId: string) =>
    api.post<ApiResponse<unknown>>(`/settings/carriers/${carrierId}/test`).then((r) => r.data),
};

export default api;

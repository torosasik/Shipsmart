import { create } from 'zustand';
import type { Order } from '../types';

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  isLoading: false,
  error: null,
  setOrders: (orders) => set({ orders }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

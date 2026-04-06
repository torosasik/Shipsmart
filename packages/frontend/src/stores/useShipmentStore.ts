import { create } from 'zustand';
import type { Shipment } from '../types';

interface ShipmentState {
  shipments: Shipment[];
  selectedShipment: Shipment | null;
  isLoading: boolean;
  error: string | null;
  setShipments: (shipments: Shipment[]) => void;
  setSelectedShipment: (shipment: Shipment | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useShipmentStore = create<ShipmentState>((set) => ({
  shipments: [],
  selectedShipment: null,
  isLoading: false,
  error: null,
  setShipments: (shipments) => set({ shipments }),
  setSelectedShipment: (shipment) => set({ selectedShipment: shipment }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

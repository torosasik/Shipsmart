export type {
  Order,
  Shipment,
  ReturnEvent,
  RateQuote,
  CarrierQuote,
  CarrierConfig,
  AuditLog,
  Address,
  LineItem,
  BoxDetail,
  LabelRef,
  CarrierId,
  OrderStatus,
  ShipmentType,
  ShipmentStatus,
  ReturnStatus,
} from '@shipsmart/shared';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Mock carrier adapters for testing.
 * Provides fixture data for rate quotes, labels, and tracking.
 */

import { CarrierId, CarrierQuote, LabelResponse, TrackingStatus, TrackingEvent } from '@shipsmart/shared';

/**
 * Fixture data for carrier rate quotes
 */
export const QUOTE_FIXTURES: Record<CarrierId, CarrierQuote[]> = {
  [CarrierId.UPS]: [
    {
      carrier: CarrierId.UPS,
      serviceLevel: 'UPS Ground',
      rate: 12.50,
      currency: 'USD',
      estimatedDays: 5,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: 4,
      isCheapest: true,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
    },
    {
      carrier: CarrierId.UPS,
      serviceLevel: 'UPS 2-Day Air',
      rate: 28.99,
      currency: 'USD',
      estimatedDays: 2,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: 4,
      isCheapest: false,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
    },
    {
      carrier: CarrierId.UPS,
      serviceLevel: 'UPS Next Day Air',
      rate: 45.00,
      currency: 'USD',
      estimatedDays: 1,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: 4,
      isCheapest: false,
      isFastest: true,
      isBestValue: false,
      requiresLTL: false,
    },
  ],
  [CarrierId.FedEx]: [
    {
      carrier: CarrierId.FedEx,
      serviceLevel: 'FedEx Ground',
      rate: 11.75,
      currency: 'USD',
      estimatedDays: 5,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: 4,
      isCheapest: true,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
    },
    {
      carrier: CarrierId.FedEx,
      serviceLevel: 'FedEx 2Day',
      rate: 29.99,
      currency: 'USD',
      estimatedDays: 2,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: 4,
      isCheapest: false,
      isFastest: true,
      isBestValue: false,
      requiresLTL: false,
    },
  ],
  [CarrierId.USPS]: [
    {
      carrier: CarrierId.USPS,
      serviceLevel: 'USPS Priority Mail',
      rate: 8.95,
      currency: 'USD',
      estimatedDays: 3,
      dimensionalWeight: 9,
      billableWeight: 9,
      zone: null,
      isCheapest: true,
      isFastest: false,
      isBestValue: true,
      requiresLTL: false,
    },
    {
      carrier: CarrierId.USPS,
      serviceLevel: 'USPS Priority Mail Express',
      rate: 26.95,
      currency: 'USD',
      estimatedDays: 1,
      dimensionalWeight: 9,
      billableWeight: 9,
      zone: null,
      isCheapest: false,
      isFastest: true,
      isBestValue: false,
      requiresLTL: false,
    },
  ],
  [CarrierId.Shippo]: [
    {
      carrier: CarrierId.Shippo,
      serviceLevel: 'Shippo Ground',
      rate: 10.50,
      currency: 'USD',
      estimatedDays: 5,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: 4,
      isCheapest: true,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
    },
  ],
  [CarrierId.LTL]: [
    {
      carrier: CarrierId.LTL,
      serviceLevel: 'LTL Freight',
      rate: 150.00,
      currency: 'USD',
      estimatedDays: 7,
      dimensionalWeight: 100,
      billableWeight: 150,
      zone: null,
      isCheapest: true,
      isFastest: false,
      isBestValue: false,
      requiresLTL: true,
    },
  ],
  [CarrierId.ShipStation]: [
    {
      carrier: CarrierId.ShipStation,
      serviceLevel: 'usps_priority_mail',
      rate: 9.99,
      currency: 'USD',
      estimatedDays: 3,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: null,
      isCheapest: true,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
    },
  ],
  [CarrierId.Veeqo]: [
    {
      carrier: CarrierId.Veeqo,
      serviceLevel: 'usps_priority',
      rate: 9.49,
      currency: 'USD',
      estimatedDays: 3,
      dimensionalWeight: 10,
      billableWeight: 12,
      zone: null,
      isCheapest: true,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
    },
  ],
};

/**
 * Generate mock quote from request
 */
export function generateMockQuote(
  carrier: CarrierId,
  rate: number,
  days: number,
): CarrierQuote {
  const baseQuote = QUOTE_FIXTURES[carrier]?.[0] || {
    carrier,
    serviceLevel: 'Standard',
    rate,
    currency: 'USD',
    estimatedDays: days,
    dimensionalWeight: 10,
    billableWeight: 10,
    zone: null,
    isCheapest: false,
    isFastest: false,
    isBestValue: false,
    requiresLTL: false,
  };

  return {
    ...baseQuote,
    rate,
    estimatedDays: days,
  };
}

/**
 * Mock label responses
 */
export const LABEL_FIXTURES: Record<string, LabelResponse> = {
  standard: {
    trackingNumber: '1Z999AA10123456784',
    labelUrl: 'https://example.com/labels/1Z999AA10123456784.pdf',
    labelFormat: 'PDF',
    charge: 12.50,
  },
  express: {
    trackingNumber: '1Z999AA10123456785',
    labelUrl: 'https://example.com/labels/1Z999AA10123456785.pdf',
    labelFormat: 'PDF',
    charge: 28.99,
  },
};

/**
 * Mock tracking events
 */
const mockEvents: TrackingEvent[] = [
  {
    timestamp: new Date() as any,
    description: 'Package in transit to destination',
    location: 'Louisville, KY',
    statusCode: 'I',
  },
  {
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) as any,
    description: 'Package picked up',
    location: 'Chicago, IL',
    statusCode: 'P',
  },
];

/**
 * Mock tracking responses
 */
export const TRACKING_FIXTURES: Record<string, TrackingStatus> = {
  in_transit: {
    trackingNumber: '1Z999AA10123456784',
    status: 'in_transit',
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    lastUpdate: new Date() as any,
    events: mockEvents,
  },
  delivered: {
    trackingNumber: '1Z999AA10123456784',
    status: 'delivered',
    estimatedDelivery: new Date(),
    lastUpdate: new Date() as any,
    events: [
      {
        timestamp: new Date() as any,
        description: 'Delivered - left at front door',
        location: 'Los Angeles, CA',
        statusCode: 'D',
      },
      {
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) as any,
        description: 'Out for delivery',
        location: 'Los Angeles, CA',
        statusCode: 'O',
      },
      {
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) as any,
        description: 'Package in transit',
        location: 'Phoenix, AZ',
        statusCode: 'I',
      },
    ],
  },
  exception: {
    trackingNumber: '1Z999AA10123456784',
    status: 'exception',
    estimatedDelivery: new Date(),
    lastUpdate: new Date() as any,
    events: [
      {
        timestamp: new Date() as any,
        description: 'Delivery exception - address not found',
        location: 'Chicago, IL',
        statusCode: 'X',
      },
    ],
  },
};

/**
 * Create a mock carrier gateway for testing.
 */
export class MockCarrierGateway {
  constructor(
    public readonly id: CarrierId,
    public readonly name: string,
    public readonly enabled: boolean = true,
  ) {}

  async getRate(): Promise<CarrierQuote> {
    return QUOTE_FIXTURES[this.id]?.[0] || generateMockQuote(this.id, 10.0, 5);
  }

  async createLabel(): Promise<LabelResponse> {
    return LABEL_FIXTURES.standard;
  }

  async voidLabel(): Promise<boolean> {
    return true;
  }

  async trackPackage(): Promise<TrackingStatus> {
    return TRACKING_FIXTURES.in_transit;
  }

  canHandle(): boolean {
    return this.enabled;
  }

  calcDimensionalWeight(length: number, width: number, height: number): number {
    return Math.ceil((length * width * height) / 139);
  }
}
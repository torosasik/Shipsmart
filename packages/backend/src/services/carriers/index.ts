/**
 * Carrier Registry for the ShipSmart shipping platform.
 * Centralizes all carrier gateway instances for easy access.
 */

import { CarrierId, RateRequest } from '@shipsmart/shared';
import { CarrierGateway } from './gateway';
import { UPSGateway } from './ups';
import { FedExGateway } from './fedex';
import { USPSGateway } from './usps';
import { ShippoGateway } from './shippo';
import { LTLGateway } from './ltl';
import { ShipStationGateway } from './shipstation';
import { VeeqoGateway } from './veeqo';

/**
 * Registry of all carrier gateways.
 * Use this to access carrier-specific functionality.
 */
export const carrierRegistry: Record<string, CarrierGateway> = {
  [CarrierId.UPS]: new UPSGateway(),
  [CarrierId.FedEx]: new FedExGateway(),
  [CarrierId.USPS]: new USPSGateway(),
  [CarrierId.Shippo]: new ShippoGateway(),
  [CarrierId.LTL]: new LTLGateway(),
  shipstation: new ShipStationGateway(),
  veeqo: new VeeqoGateway(),
};

/**
 * Get all enabled carrier gateways.
 */
export function getEnabledCarriers(): CarrierGateway[] {
  return Object.values(carrierRegistry).filter((c) => c.enabled);
}

/**
 * Get a specific carrier gateway by ID.
 */
export function getCarrier(carrierId: CarrierId): CarrierGateway | undefined {
  return carrierRegistry[carrierId];
}

/**
 * Get carrier names for display.
 */
export function getCarrierNames(): Record<CarrierId, string> {
  const names: Record<CarrierId, string> = {} as Record<CarrierId, string>;
  for (const [id, gateway] of Object.entries(carrierRegistry)) {
    names[id as CarrierId] = gateway.name;
  }
  return names;
}

/**
 * Check which carriers can handle a given shipment.
 */
export function getCapableCarriers(request: RateRequest): CarrierGateway[] {
  return getEnabledCarriers().filter((c) => c.canHandle(request));
}

// Re-export types and classes
export { CarrierGateway, BaseCarrierGateway } from './gateway';
export { UPSGateway } from './ups';
export { FedExGateway } from './fedex';
export { USPSGateway } from './usps';
export { ShippoGateway } from './shippo';
export { LTLGateway } from './ltl';
export { ShipStationGateway } from './shipstation';
export { VeeqoGateway } from './veeqo';

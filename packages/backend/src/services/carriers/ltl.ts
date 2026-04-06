/**
 * LTL Freight Carrier Gateway Adapter for the ShipSmart shipping platform.
 * Implements the CarrierGateway interface for LTL freight shipping.
 */

import {
  CarrierId,
  RateRequest,
  CarrierQuote,
  LabelRequest,
  LabelResponse,
  TrackingStatus,
} from '@shipsmart/shared';
import {
  calculateDimensionalWeight,
  LTL_THRESHOLD_LBS,
} from '@shipsmart/shared';
import { BaseCarrierGateway } from './gateway';

/**
 * LTL Freight Carrier Gateway Adapter.
 *
 * Handles Less-Than-Truckload freight shipments for heavy/bulky packages.
 */
export class LTLGateway extends BaseCarrierGateway {
  readonly id = CarrierId.LTL;
  readonly name = 'LTL Freight';
  readonly enabled = true;

  constructor(_config?: Record<string, unknown>) {
    super();
  }

  async getRate(request: RateRequest): Promise<CarrierQuote> {
    this.validateRateRequest(request);

    const pkg = request.packages[0];
    if (!pkg) {
      throw new Error('No packages in rate request');
    }

    const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
    const billableWeight = Math.max(pkg.weight, dimWeight);

    // LTL is recommended for heavy shipments
    if (billableWeight < LTL_THRESHOLD_LBS) {
      // Still allow but note it may not be cost-effective
    }

    try {
      const rateRequest = {
        origin: {
          zip: request.fromAddress.zip,
          state: request.fromAddress.state,
          country: request.fromAddress.country,
        },
        destination: {
          zip: request.toAddress.zip,
          state: request.toAddress.state,
          country: request.toAddress.country,
        },
        freight: {
          weight: billableWeight,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          freightClass: this.getFreightClass(billableWeight),
        },
        services: ['STANDARD', 'EXPEDITED'],
      };

      this.logRequest('getRate', rateRequest);

      // Mock response for development - replace with actual API call
      const zone = this.calculateZone(request.fromAddress.zip, request.toAddress.zip);
      const baseRate = 150 + zone * 15;
      const weightSurcharge = billableWeight * 0.12;
      const fuelSurcharge = (baseRate + weightSurcharge) * 0.15;
      const rate = baseRate + weightSurcharge + fuelSurcharge;

      return {
        carrier: CarrierId.LTL,
        serviceLevel: 'LTL_STANDARD',
        rate: Math.round(rate * 100) / 100,
        currency: 'USD',
        estimatedDays: 5 + zone,
        dimensionalWeight: dimWeight,
        billableWeight,
        zone,
        isCheapest: false,
        isFastest: false,
        isBestValue: false,
        requiresLTL: true,
        metadata: {
          freightClass: this.getFreightClass(billableWeight),
          baseRate: Math.round(baseRate * 100) / 100,
          fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
        },
      };
    } catch (error) {
      this.logError('getRate', error);
      throw error;
    }
  }

  async createLabel(request: LabelRequest): Promise<LabelResponse> {
    try {
      const pkg = request.packages[0];
      if (!pkg) throw new Error('No packages in label request');

      const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
      const billableWeight = Math.max(pkg.weight, dimWeight);

      const labelRequest = {
        origin: {
          name: request.fromAddress.name,
          street1: request.fromAddress.street1,
          city: request.fromAddress.city,
          state: request.fromAddress.state,
          zip: request.fromAddress.zip,
          country: request.fromAddress.country,
          phone: request.fromAddress.phone,
        },
        destination: {
          name: request.toAddress.name,
          street1: request.toAddress.street1,
          city: request.toAddress.city,
          state: request.toAddress.state,
          zip: request.toAddress.zip,
          country: request.toAddress.country,
          phone: request.toAddress.phone,
        },
        freight: {
          weight: billableWeight,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          freightClass: this.getFreightClass(billableWeight),
          pieces: 1,
        },
        service: 'STANDARD',
        reference: request.reference,
      };

      this.logRequest('createLabel', labelRequest);

      // Mock response for development
      const trackingNumber = this.generateTrackingNumber();

      return {
        trackingNumber,
        labelUrl: `gs://shipsmart-labels/ltl/${trackingNumber}.pdf`,
        labelFormat: 'PDF',
        charge: 0,
        metadata: {
          freightClass: this.getFreightClass(billableWeight),
          proNumber: trackingNumber,
        },
      };
    } catch (error) {
      this.logError('createLabel', error);
      throw error;
    }
  }

  async voidLabel(_trackingNumber: string): Promise<boolean> {
    try {
      // LTL shipments typically require calling the carrier to cancel
      // This would need to be implemented based on the specific LTL provider
      return false;
    } catch {
      return false;
    }
  }

  async trackPackage(trackingNumber: string): Promise<TrackingStatus> {
    try {
      // Mock tracking response
      return {
        trackingNumber,
        status: 'in_transit',
        estimatedDelivery: null,
        lastUpdate: new Date(),
        events: [
          {
            timestamp: new Date(),
            description: 'Shipment picked up',
            location: 'Origin terminal',
            statusCode: 'PU',
          },
        ],
      };
    } catch (error) {
      this.logError('trackPackage', error);
      throw error;
    }
  }

  canHandle(request: RateRequest): boolean {
    try {
      this.validateRateRequest(request);
      // LTL can handle any weight, but is most cost-effective for heavy shipments
      return true;
    } catch {
      return false;
    }
  }

  calcDimensionalWeight(length: number, width: number, height: number): number {
    return calculateDimensionalWeight(length, width, height, CarrierId.LTL);
  }

  /**
   * Determine freight class based on density and value.
   */
  private getFreightClass(weight: number): string {
    if (weight < 50) return 'CLASS_70';
    if (weight < 100) return 'CLASS_77.5';
    if (weight < 200) return 'CLASS_85';
    if (weight < 500) return 'CLASS_100';
    if (weight < 1000) return 'CLASS_125';
    if (weight < 2000) return 'CLASS_150';
    return 'CLASS_175';
  }

  /**
   * Calculate shipping zone based on ZIP codes.
   */
  private calculateZone(fromZip: string, toZip: string): number {
    const fromPrefix = parseInt(fromZip.substring(0, 3), 10);
    const toPrefix = parseInt(toZip.substring(0, 3), 10);
    const diff = Math.abs(fromPrefix - toPrefix);

    if (diff < 100) return 2;
    if (diff < 300) return 4;
    if (diff < 600) return 6;
    return 8;
  }

  /**
   * Generate a PRO number for LTL tracking.
   */
  private generateTrackingNumber(): string {
    const prefix = 'LTL';
    const random = Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, '0');
    return `${prefix}${random}`;
  }
}

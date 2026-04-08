/**
 * Settings routes for carrier configuration and integrations.
 */

import { Router } from 'express';
import {
  listCarrierSettings,
  getCarrierSettingsHandler,
  updateCarrierSettings,
  testCarrierConnectionHandler,
} from '../controllers/carrier-settings';
import {
  getShopifySettingsHandler,
  updateShopifySettings,
  testShopifyConnectionHandler,
  triggerShopifySyncHandler,
} from '../controllers/shopify-settings';

const router = Router();

// Carrier settings
router.get('/carriers', listCarrierSettings);
router.get('/carriers/:carrierId', getCarrierSettingsHandler);
router.put('/carriers/:carrierId', updateCarrierSettings);
router.post('/carriers/:carrierId/test', testCarrierConnectionHandler);

// Shopify settings
router.get('/shopify', getShopifySettingsHandler);
router.put('/shopify', updateShopifySettings);
router.post('/shopify/test', testShopifyConnectionHandler);
router.post('/shopify/sync', triggerShopifySyncHandler);

export default router;

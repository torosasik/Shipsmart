/**
 * Settings routes for carrier configuration.
 */

import { Router } from 'express';
import {
  listCarrierSettings,
  getCarrierSettingsHandler,
  updateCarrierSettings,
  testCarrierConnectionHandler,
} from '../controllers/carrier-settings';

const router = Router();

// Carrier settings
router.get('/carriers', listCarrierSettings);
router.get('/carriers/:carrierId', getCarrierSettingsHandler);
router.put('/carriers/:carrierId', updateCarrierSettings);
router.post('/carriers/:carrierId/test', testCarrierConnectionHandler);

export default router;

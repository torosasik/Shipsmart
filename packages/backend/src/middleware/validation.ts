/**
 * Request validation rules for all POST endpoints.
 * Uses express-validator to provide consistent validation.
 */

import { body, param, query } from 'express-validator';

// ============================================================================
// Rate Shopping Validation
// ============================================================================

export const rateShopValidation = [
  body('fromAddress').isObject().withMessage('fromAddress is required and must be an object'),
  body('fromAddress.zip').isString().notEmpty().withMessage('fromAddress.zip is required'),
  body('fromAddress.state').isString().notEmpty().withMessage('fromAddress.state is required'),
  body('fromAddress.country').isString().notEmpty().withMessage('fromAddress.country is required'),
  body('toAddress').isObject().withMessage('toAddress is required and must be an object'),
  body('toAddress.zip').isString().notEmpty().withMessage('toAddress.zip is required'),
  body('toAddress.state').isString().notEmpty().withMessage('toAddress.state is required'),
  body('toAddress.country').isString().notEmpty().withMessage('toAddress.country is required'),
  body('packages').isArray({ min: 1 }).withMessage('packages must be a non-empty array'),
  body('packages.*.weight').isFloat({ min: 0.1 }).withMessage('Each package must have a valid weight'),
  body('packages.*.length').isFloat({ min: 0.1 }).withMessage('Each package must have a valid length'),
  body('packages.*.width').isFloat({ min: 0.1 }).withMessage('Each package must have a valid width'),
  body('packages.*.height').isFloat({ min: 0.1 }).withMessage('Each package must have a valid height'),
];

// ============================================================================
// Label Generation Validation
// ============================================================================

export const labelGenerationValidation = [
  body('carrier').isString().notEmpty().withMessage('carrier is required'),
  body('serviceLevel').isString().notEmpty().withMessage('serviceLevel is required'),
  body('fromAddress').isObject().withMessage('fromAddress is required'),
  body('fromAddress.name').isString().notEmpty().withMessage('fromAddress.name is required'),
  body('fromAddress.street1').isString().notEmpty().withMessage('fromAddress.street1 is required'),
  body('fromAddress.city').isString().notEmpty().withMessage('fromAddress.city is required'),
  body('fromAddress.state').isString().notEmpty().withMessage('fromAddress.state is required'),
  body('fromAddress.zip').isString().notEmpty().withMessage('fromAddress.zip is required'),
  body('fromAddress.country').isString().notEmpty().withMessage('fromAddress.country is required'),
  body('toAddress').isObject().withMessage('toAddress is required'),
  body('toAddress.name').isString().notEmpty().withMessage('toAddress.name is required'),
  body('toAddress.street1').isString().notEmpty().withMessage('toAddress.street1 is required'),
  body('toAddress.city').isString().notEmpty().withMessage('toAddress.city is required'),
  body('toAddress.state').isString().notEmpty().withMessage('toAddress.state is required'),
  body('toAddress.zip').isString().notEmpty().withMessage('toAddress.zip is required'),
  body('toAddress.country').isString().notEmpty().withMessage('toAddress.country is required'),
  body('packages').isArray({ min: 1 }).withMessage('packages must be a non-empty array'),
  body('userId').isString().notEmpty().withMessage('userId is required for audit logging'),
];

// ============================================================================
// Void Label Validation
// ============================================================================

export const voidLabelValidation = [
  body('trackingNumber').isString().notEmpty().withMessage('trackingNumber is required'),
  body('carrier').isString().notEmpty().withMessage('carrier is required'),
  body('userId').isString().notEmpty().withMessage('userId is required for audit logging'),
];

// ============================================================================
// Return Creation Validation
// ============================================================================

export const createReturnValidation = [
  body('originalOrderId').isString().notEmpty().withMessage('originalOrderId is required'),
  body('originalShipmentId').isString().notEmpty().withMessage('originalShipmentId is required'),
  body('boxCount').isInt({ min: 1 }).withMessage('boxCount must be a positive integer'),
  body('boxes').isArray({ min: 1 }).withMessage('boxes must be a non-empty array'),
  body('carrier').isString().notEmpty().withMessage('carrier is required'),
  body('fromAddress').isObject().withMessage('fromAddress is required'),
  body('toAddress').isObject().withMessage('toAddress is required'),
];

// ============================================================================
// Consolidation Validation
// ============================================================================

export const consolidateOrdersValidation = [
  body('orderIds').isArray({ min: 2 }).withMessage('At least 2 orderIds are required'),
  body('boxes').isArray({ min: 1 }).withMessage('boxes must be a non-empty array'),
];

// ============================================================================
// Shipment Creation Validation
// ============================================================================

export const createShipmentValidation = [
  body('orderId').isString().notEmpty().withMessage('orderId is required'),
  body('fromAddress').isObject().withMessage('fromAddress is required'),
  body('toAddress').isObject().withMessage('toAddress is required'),
  body('boxes').isArray({ min: 1 }).withMessage('boxes must be a non-empty array'),
];

// ============================================================================
// Pagination Validation
// ============================================================================

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

// ============================================================================
// ID Parameter Validation
// ============================================================================

export const idParamValidation = [
  param('id').isString().notEmpty().withMessage('ID parameter is required'),
];

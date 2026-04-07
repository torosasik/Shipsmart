/**
 * Rate limiting middleware configuration.
 * Uses express-rate-limit to protect against brute-force and DoS attacks.
 */

import rateLimit from 'express-rate-limit';

/** General API rate limit: 100 requests per 15 minutes per IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/** Strict rate limit for label generation: 20 requests per 15 minutes */
export const labelLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many label generation requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strict rate limit for rate shopping: 50 requests per 15 minutes */
export const rateShopLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many rate shopping requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Auth endpoint rate limit: 10 requests per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strict rate limit for return processing: 20 requests per 15 minutes */
export const returnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many return requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strict rate limit for shipment operations: 50 requests per 15 minutes */
export const shipmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many shipment requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strict rate limit for consolidation: 30 requests per 15 minutes */
export const consolidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many consolidation requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Express application entry point.
 * Sets up middleware, routes, and starts the server.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';

// Initialize Express app
const app = express();

// ============================================================================
// Middleware
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.allowedOrigins,
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[Request] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Routes
// ============================================================================

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'ShipSmart API',
    version: '0.1.0',
    status: 'running',
  });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// Start Server
// ============================================================================

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`[Server] ShipSmart API running on port ${PORT}`);
  console.log(`[Server] Environment: ${env.nodeEnv}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

export default app;

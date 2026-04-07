# Agent Prompts - ShipSmart Project Execution

## Phase 1: Security Fixes + Code Quality
### Prompt for Agent 1:
```
Execute the security fixes and code quality improvements for the ShipSmart shipping platform. 

Priority tasks:
1. Add getShipmentByTrackingNumber method to FirestoreService (packages/backend/src/services/firestore.ts)
2. Create webhook signature verification middleware (packages/backend/src/middleware/webhookAuth.ts) with Shopify HMAC verification and carrier webhook verification
3. Wire webhook auth middleware into routes (packages/backend/src/routes/webhooks.ts)
4. Fix shipment lookup by tracking number in webhooks (packages/backend/src/controllers/webhooks.ts)
5. Wire validation middleware into routes: rates.ts, labels.ts, returns.ts, shipments.ts, consolidation.ts
6. Wire rate limiter middleware into routes
7. Fix RedisCache static import (packages/backend/src/services/cache.ts - use import instead of require)
8. Fix LTL weight check no-op (packages/backend/src/services/rate-shop.ts:213 - add continue statement)
9. Fix unused fromAddress/toAddress in Returns (packages/backend/src/services/returns.ts:156-157 - pass to carrier gateway)
10. Remove @types/ioredis from package.json
11. Remove swagger-jsdoc from package.json

Do not proceed to other phases until these security and code quality issues are resolved.
```

## Phase 2: Firestore Persistence + Carrier API
### Prompt for Agent 2:
```
Implement Firestore persistence and complete carrier API integration for ShipSmart.

Priority tasks:
1. Complete Order Service: Connect to Firestore for CRUD operations (packages/backend/src/controllers/orders.ts)
2. Complete Shipment Service: Persist shipments to Firestore (packages/backend/src/controllers/shipments.ts)
3. Complete Rate Shop Service: Replace mock carrier gateways with real carrier API calls using carrierRegistry (packages/backend/src/services/rate-shop.ts)
4. Complete Label Service: Save shipments to Firestore on label generation (packages/backend/src/services/label.ts)
5. Complete Return Service: Persist return events to Firestore (packages/backend/src/services/returns.ts)
6. Complete Consolidation Service: Fetch orders from Firestore (packages/backend/src/services/consolidation.ts)
7. Complete Tracking Service: Query/update shipments in Firestore (packages/backend/src/services/tracking.ts)
8. Complete Audit Service: Write audit logs to Firestore (packages/backend/src/services/audit.ts)
9. Complete Cache Service: Complete Redis integration or simplify (packages/backend/src/services/cache.ts)

Then complete at least one carrier API integration (recommended: UPS or FedEx) with real API calls for rate quotes and label generation. Update the carrier adapter files in packages/backend/src/services/carriers/
```

## Phase 3: Frontend Foundation + API Connections
### Prompt for Agent 3:
```
Build the frontend foundation and connect to backend APIs for ShipSmart.

Priority tasks:
1. Install and configure Tailwind CSS in packages/frontend/
2. Build reusable components: dashboard cards, data tables, modals, rate comparison panel (in packages/frontend/src/components/)
3. Add form handling with React Hook Form for address input, package details
4. Implement React error boundaries for graceful failure handling
5. Complete Dashboard Page: Real data visualization and metrics (packages/frontend/src/pages/DashboardPage.tsx)
6. Build Orders Page: Data grid with React Table, filtering, sorting (packages/frontend/src/pages/OrdersPage.tsx)
7. Build Shipments Page: Shipment management with rate comparison panel (packages/frontend/src/pages/ShipmentsPage.tsx)
8. Build Returns Page: Multi-box return modal and processing UI (packages/frontend/src/pages/ReturnsPage.tsx)
9. Build Consolidation Page: Display consolidation opportunities and alerts (packages/frontend/src/pages/ConsolidationPage.tsx)
10. Connect frontend to backend APIs - ensure all API client methods work with real endpoints (packages/frontend/src/services/api.ts)
```

## Phase 4: End-to-End Flows + Shopify Integration
### Prompt for Agent 4:
```
Implement end-to-end flows and Shopify integration for ShipSmart.

Priority tasks:
1. Complete label generation flow: From rate selection to label download
2. Implement return processing: Multi-box return label generation workflow
3. Add consolidation workflow: Display alerts, execute consolidation
4. Integrate tracking updates: Periodic tracking sync with carriers
5. Complete Shopify Order Sync: Bidirectional order synchronization (packages/backend/src/services/shopify.ts)
6. Implement Shopify Fulfillment Updates: Push tracking numbers to Shopify fulfillments
7. Complete Shopify Webhook Handlers: Process order/create, order/update webhooks
8. Add Shopify Customer Notifications: Trigger shipping confirmation emails via Shopify
9. Integrate Firebase Storage for label PDF storage
10. Add batch operations: Bulk label generation, bulk tracking updates
```

## Phase 5: Testing, CI/CD, Production Polish
### Prompt for Agent 5:
```
Add testing, CI/CD, and production polish for ShipSmart.

Priority tasks:
1. Implement Firebase Auth or API key authentication (packages/backend/src/middleware/auth.ts)
2. Write unit tests for services:
   - Rate comparison engine with known inputs/outputs
   - Dimensional weight calculations
   - Address normalization logic
   - Multi-box optimization algorithm
   - Carrier adapter mocks with fixture data
3. Write integration tests for API endpoints
4. Add E2E tests:
   - Complete return label batch workflow
   - Rate shopping with carrier toggles
   - Order consolidation detection and action
   - Label reprint from history
5. Set up CI/CD pipeline: Automated testing and deployment
6. Add shipping cost reports and carrier performance metrics (packages/frontend/src/pages/)
7. Add application performance monitoring and alerting
8. Complete API documentation, user guides (in plans/)
9. Optimize performance: Caching, query optimization, bundle size
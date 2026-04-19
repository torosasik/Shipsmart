# Shipsmart - Project Structural and Implementation Report

Based on a thorough investigation of the `Shipsmart` monorepo, here is a detailed structural and implementation report of the project codebase.

### 1. Overview of Documentation Insights

**Project Background:** Shipsmart is a custom shipping platform developed for American Tile Depot to optimize and handle multi-carrier rate shopping, label generation, order consolidation, multi-box returns, and tracking synchronization with Shopify. 

**Architecture & Structure:**
The project is organized as a monorepo utilizing npm workspaces:
- **`packages/backend`**: Node.js REST API using Express.js and Firebase/Firestore for data persistence. Incorporates carrier gateways (UPS, FedEx, USPS, Shippo, LTL, ShipStation, Veeqo).
- **`packages/frontend`**: React Single Page Application (SPA) built with Vite and utilizing Zustand for state management and Tailwind CSS for styling (warehouse-optimized UI).
- **`packages/shared`**: Shared TypeScript models, validation schemas, and constants between frontend and backend.

**Current Project State:**
According to `plans/status-report.md`, the project is approximately **55% complete**.
- Backend Architecture: 90%
- API Endpoints: 85%
- Carrier Adapters: 60%
- Frontend UI: 20% (Mostly placeholder stubs)
- Critical Blocking Tasks: Wiring up real Firestore persistence in controllers/services and replacing the mock rate-shopping carrier with real carrier API calls.

### 2. Specific Type Definitions

The core domain schema resides in the shared package, ensuring consistency across the stack. Here are the most relevant types:

- **`Order`**: `packages/shared/src/schemas.ts:150`
  Represents a Shopify order imported into the system, detailing items, weights, and synchronization timestamps.
- **`Shipment`**: `packages/shared/src/schemas.ts:213`
  Defines an outbound or return shipment, tracking status, associated label references, boxes, and carrier.
- **`ReturnEvent`**: `packages/shared/src/schemas.ts:286`
  Represents a multi-box return containing associated box details, carrier IDs, and return shipment tracking.
- **`RateQuote` & `CarrierQuote`**: `packages/shared/src/schemas.ts:350` and `packages/shared/src/schemas.ts:383`
  Defines rate comparisons across carriers, detailing service level, dimensional weight, and optimal value flags.
- **`CarrierGateway`**: `packages/backend/src/services/carriers/gateway.ts:19`
  The core abstract interface implementing the Strategy pattern for dynamically swapping and utilizing varying shipping carrier APIs.

### 3. Relevant Implementations

**Rate Shopping Engine:**
- **Location:** `packages/backend/src/services/rate-shop.ts`
- **Role:** Handles parallel fetching of rates across enabled carriers, applies multi-box optimization algorithms, flags LTL requirements, and ranks quotes by speed/price/value. 
- **Action Required:** Needs to transition from `MockCarrierGateway` to utilizing the actual `carrierRegistry` for real API calls (`packages/backend/src/services/rate-shop.ts:387`).

**Order & Shipment Controllers:**
- **Locations:** `packages/backend/src/controllers/orders.ts` and `packages/backend/src/controllers/shipments.ts`
- **Role:** Expose REST endpoints to the frontend. Currently, these controllers require full integration with the `FirestoreService` to support live CRUD operations.

**Webhook Verification:**
- **Location:** `packages/backend/src/controllers/webhooks.ts`
- **Role:** Processes external events (Shopify order updates, Carrier tracking updates). Security middleware for signature verification still needs full wiring as detailed in `plans/todo.md:128`.

**Frontend Architecture (Stubs):**
- **Location:** `packages/frontend/src/pages/`
- **Role:** Skeleton components exist for `DashboardPage`, `OrdersPage`, `ShipmentsPage`, and `ReturnsPage`. The UI implementation is listed as high priority, requiring Tailwind configuration and React Table for data grids.

### 4. Critical Dependencies

- **`firebase-admin` / `firebase`**: The system relies heavily on Firestore for document storage (Orders, Shipments, Audit Trails) and Firebase Storage for Label PDFs. 
- **`express` & `@types/express`**: Serves as the robust backend framework facilitating modular routing and validation middleware.
- **`react` & `zustand`**: Powers the warehouse-optimized UI. Zustand provides lightweight, boilerplate-free state management across components.
- **`@shopify/shopify-api`** (Inferred): Used by `packages/backend/src/services/shopify.ts` for bidirectional order synchronization, fetching new orders, and pushing fulfillments.
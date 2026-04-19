# Shipsmart

Shipsmart is a custom shipping platform built for American Tile Depot. It handles rate shopping, carrier integrations, label generation, shipments, orders, and returns.

## Project Structure

This project is a monorepo structured using npm workspaces. It consists of the following packages:

- **`packages/frontend`**: The frontend web application (React, Vite, Tailwind CSS).
- **`packages/backend`**: The backend API server (Node.js, Express, Firestore). Handles integrations with shipping carriers (FedEx, UPS, USPS, LTL, Shippo, ShipStation, Veeqo) and Shopify.
- **`packages/shared`**: Shared TypeScript types, schemas, and utilities used by both frontend and backend.

## Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)
- Firebase CLI (for deployment and local emulation, if applicable)
- Google Cloud CLI (for backend deployment)

## Getting Started

1. **Clone the repository and install dependencies:**

   ```bash
   npm install
   ```

2. **Environment Variables:**
   - Copy `.env.example` to `.env` in the root and in the respective package directories (e.g., `packages/backend/.env`) and fill in the required values (Firebase config, carrier API keys, etc.).

3. **Run the development server:**

   This command will start both the frontend and backend development servers concurrently:

   ```bash
   npm run dev
   ```

   Alternatively, you can start them individually:
   - Backend only: `npm run dev:backend`
   - Frontend only: `npm run dev:frontend`

## Available Scripts

From the root directory, you can run the following npm scripts:

- `npm run dev`: Starts both frontend and backend in development mode.
- `npm run build`: Builds all packages in the workspace.
- `npm run lint`: Runs the linter across all packages.
- `npm run format`: Formats code using Prettier.
- `npm run deploy:cloudrun`: Deploys the backend API to Google Cloud Run.
- `npm run deploy:hosting`: Deploys the frontend to Firebase Hosting.
- `npm run deploy:all`: Builds the frontend and deploys both backend (Cloud Run) and frontend (Firebase Hosting).

## Architecture

- **Frontend**: React SPA built with Vite, styled with Tailwind CSS. Stores state using Zustand (`useStore` hooks).
- **Backend**: Node.js REST API. Uses Firebase/Firestore for database operations and data persistence. Integrates with various carrier APIs for rate calculation and label generation. Includes a comprehensive webhook system for platform integrations (e.g., Shopify).
- **Infrastructure**: Backend deployed via Docker to Google Cloud Run. Frontend deployed to Firebase Hosting.

## Testing

The project uses Vitest for unit and integration testing. Run tests within individual packages or set up a root test script if configured.

## License

Private and Confidential. Property of American Tile Depot.

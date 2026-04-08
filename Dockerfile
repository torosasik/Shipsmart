# =============================================================================
# ShipSmart Backend - Docker Image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for monorepo setup
COPY package.json .
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/backend/package.json ./packages/backend/package.json

# Install all dependencies
RUN npm install

# -----------------------------------------------------------------------------
# Stage 2: Build Shared Package
# -----------------------------------------------------------------------------
FROM node:20-alpine AS shared-builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy shared package source
COPY packages/shared/src ./src
COPY packages/shared/package.json ./package.json

# Create standalone tsconfig for shared
RUN echo '{"compilerOptions":{"target":"ES2020","module":"commonjs","strict":true,"esModuleInterop":true,"outDir":"dist","rootDir":"src","declaration":true},"include":["src/**/*"],"exclude":["node_modules","dist"]}' > tsconfig.json

# Build shared package
RUN npx tsc

# -----------------------------------------------------------------------------
# Stage 3: Build Backend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled shared package
COPY --from=shared-builder /app/dist ./packages/shared/dist

# Copy backend source and config (keep structure relative to tsconfig location)
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/package.json ./package.json

# Copy root tsconfig
COPY tsconfig.json ./tsconfig.json
COPY packages/backend/tsconfig.json ./packages/backend/tsconfig.json

# Build backend
RUN npx tsc --project packages/backend/tsconfig.json

# -----------------------------------------------------------------------------
# Stage 4: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S shipsmart -u 1001

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled backend
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Copy shared package and create node_modules symlink for runtime resolution
COPY --from=shared-builder /app/dist ./packages/shared/dist
RUN rm -rf node_modules/@shipsmart && mkdir -p node_modules/@shipsmart && ln -s /app/packages/shared/dist node_modules/@shipsmart/shared

# Set ownership
RUN chown -R shipsmart:nodejs /app

USER shipsmart

# Expose port (Cloud Run expects PORT env var, default to 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/index.js"]
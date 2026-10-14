# Multi-stage build for full-stack Node.js Express + React/Vite application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Configure npm network timeouts and retry resilience for restricted/cloud VM networks
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && (npm ci || npm install)

# Copy source code (respecting .dockerignore)
COPY . .

# Run production build (compiles Vite React frontend & bundles server.ts)
RUN npm run build

# Prune devDependencies to keep only runtime dependencies for production
RUN npm prune --omit=dev

# Production-ready thin image
FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Copy production node_modules directly from the builder stage
# (Eliminates redundant network downloads and avoids npm failures in stage 2)
COPY --from=builder /app/node_modules ./node_modules

# Copy built frontend & server bundles, plus inventory data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/inventory ./inventory

# Expose port 3000 (standard port for Express)
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start the bundled Express server
CMD ["npm", "run", "start"]

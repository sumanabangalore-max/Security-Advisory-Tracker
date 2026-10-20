# Multi-stage build for full-stack Node.js Express + React/Vite application
# Uses node:20-slim (Debian glibc) instead of Alpine to eliminate DNS IPv6 lookup stalls on corporate VPNs / WSL2
FROM node:20-slim AS builder

WORKDIR /app

# Support optional corporate proxy build args
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG NPM_CONFIG_REGISTRY

# Disable strict SSL and package auditing upfront to prevent corporate DPI firewalls from hanging npm
ENV NODE_TLS_REJECT_UNAUTHORIZED=0 \
    NPM_CONFIG_STRICT_SSL=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Fast, non-blocking npm configuration with short retry timeouts (1-5s instead of 2 minutes)
RUN npm config set strict-ssl false \
    && npm config set audit false \
    && npm config set fund false \
    && npm config set fetch-retries 2 \
    && npm config set fetch-retry-mintimeout 1000 \
    && npm config set fetch-retry-maxtimeout 5000 \
    && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund)

# Copy source code (respecting .dockerignore)
COPY . .

# Run production build (compiles Vite React frontend & bundles server.ts)
RUN npm run build

# Prune devDependencies to keep only runtime dependencies for production
RUN npm prune --omit=dev

# Production-ready thin image
FROM node:20-slim

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

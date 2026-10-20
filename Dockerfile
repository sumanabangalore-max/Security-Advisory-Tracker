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

# Automatically prune any stray angular reference if building from an older local directory
RUN sed -i '/"angular"/d' package.json package-lock.json 2>/dev/null || true

# Resilient npm configuration for corporate environments, proxies, and custom registries
RUN npm config set strict-ssl false \
    && npm config set audit false \
    && npm config set fund false \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 5000 \
    && npm config set fetch-retry-maxtimeout 30000 \
    && if [ -n "${NPM_CONFIG_REGISTRY:-}" ]; then npm config set registry "${NPM_CONFIG_REGISTRY}"; fi \
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

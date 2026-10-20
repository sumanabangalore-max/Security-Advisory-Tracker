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

# Copy files (dist is included from workspace for instant offline builds)
COPY . .

# Automatically prune any stray angular reference if building from an older local directory
RUN sed -i '/"angular"/d' package.json package-lock.json 2>/dev/null || true

# Intelligent offline-first build detection:
# 1. If pre-built dist/index.html and dist/server.cjs exist, use them directly (Zero-Network Build)
# 2. Otherwise, install dependencies and compile from source
RUN if [ -f "dist/index.html" ] && [ -f "dist/server.cjs" ]; then \
        echo "================================================================="; \
        echo "✓ Pre-built production bundle detected in dist/ directory!"; \
        echo "✓ Skipping container npm network downloads (Zero-Network Build)."; \
        echo "================================================================="; \
    else \
        echo "No pre-built bundle found in dist/. Attempting to install and build inside container..."; \
        npm config set strict-ssl false || true; \
        npm config set audit false || true; \
        npm config set fund false || true; \
        npm config set fetch-retries 2 || true; \
        npm config set fetch-retry-mintimeout 1000 || true; \
        npm config set fetch-retry-maxtimeout 5000 || true; \
        INSTALLED=0; \
        if [ -n "${NPM_CONFIG_REGISTRY:-}" ]; then \
            echo "Using custom registry: ${NPM_CONFIG_REGISTRY}"; \
            sed -i "s|https://registry.npmjs.org/|${NPM_CONFIG_REGISTRY%/}/|g" package-lock.json 2>/dev/null || true; \
            npm config set registry "${NPM_CONFIG_REGISTRY}"; \
            (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) && INSTALLED=1; \
        elif (npm ci --no-audit --no-fund || npm install --no-audit --no-fund); then \
            INSTALLED=1; \
        elif (npm install --no-audit --no-fund --registry=https://registry.yarnpkg.com); then \
            INSTALLED=1; \
        elif (rm -f package-lock.json && npm install --no-audit --no-fund --registry=https://registry.npmmirror.com); then \
            INSTALLED=1; \
        fi; \
        if [ "$INSTALLED" -ne 1 ]; then \
            echo "================================================================="; \
            echo "ERROR: npm package download failed inside Docker container!"; \
            echo "Your corporate proxy/firewall is blocking outbound npm traffic."; \
            echo "EASY FIX: Run 'npm install && npm run build' on your host machine,"; \
            echo "then re-run 'docker compose build frontend' (Zero-Network mode)."; \
            echo "================================================================="; \
            exit 1; \
        fi; \
        npm run build; \
    fi

# Production-ready thin image
FROM node:20-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Copy built frontend & server bundles, plus inventory data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/inventory ./inventory

# Expose port 3000 (standard port for Express)
EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

# Start the bundled Express server directly
CMD ["node", "dist/server.cjs"]

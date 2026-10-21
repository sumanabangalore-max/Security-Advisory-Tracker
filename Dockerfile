# Multi-stage build for full-stack Node.js Express + React/Vite application
# Uses node:20-slim (Debian glibc) instead of Alpine to eliminate DNS IPv6 lookup stalls on corporate VPNs / WSL2
ARG NODE_BASE=node:20-slim
FROM ${NODE_BASE} AS builder

WORKDIR /app

# Support optional corporate proxy build args and propagate to container environment
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY} \
    no_proxy=${NO_PROXY} \
    NODE_TLS_REJECT_UNAUTHORIZED=0 \
    NPM_CONFIG_STRICT_SSL=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Copy files (dist is included from workspace for instant offline builds)
COPY . .

# Automatically prune stray angular references and ensure lockfile strictly points to registry.npmjs.org
RUN sed -i '/"angular"/d' package.json package-lock.json 2>/dev/null || true \
    && sed -i 's|https://registry.yarnpkg.com/|https://registry.npmjs.org/|g' package-lock.json 2>/dev/null || true \
    && sed -i 's|https://registry.npmmirror.com/|https://registry.npmjs.org/|g' package-lock.json 2>/dev/null || true

# Intelligent build detection:
# 1. If pre-built dist/index.html and dist/server.cjs exist, use them directly (Zero-Network Build)
# 2. Otherwise, install dependencies strictly from registry.npmjs.org and compile from source
RUN if [ -f "dist/index.html" ] && [ -f "dist/server.cjs" ]; then \
        echo "================================================================="; \
        echo "✓ Pre-built production bundle detected in dist/ directory!"; \
        echo "✓ Skipping container npm network downloads (Zero-Network Build)."; \
        echo "================================================================="; \
    else \
        echo "No pre-built bundle found in dist/. Installing from registry.npmjs.org..."; \
        npm config set registry https://registry.npmjs.org/; \
        npm config set strict-ssl false || true; \
        npm config set audit false || true; \
        npm config set fund false || true; \
        npm config set maxsockets 3 || true; \
        npm config set fetch-retries 5 || true; \
        npm config set fetch-retry-mintimeout 3000 || true; \
        npm config set fetch-retry-maxtimeout 15000 || true; \
        if [ -n "${HTTP_PROXY:-}" ]; then npm config set proxy "${HTTP_PROXY}" || true; fi; \
        if [ -n "${HTTPS_PROXY:-}" ]; then npm config set https-proxy "${HTTPS_PROXY}" || true; fi; \
        (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) || { \
            echo "================================================================="; \
            echo "ERROR: npm install from registry.npmjs.org failed!"; \
            echo "If your corporate network blocks downloads inside Docker containers, run:"; \
            echo "  npm install && npm run build"; \
            echo "on your host machine, then run 'docker compose build frontend'."; \
            echo "================================================================="; \
            exit 1; \
        }; \
        npm run build; \
    fi

# Production-ready thin image
FROM ${NODE_BASE}

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

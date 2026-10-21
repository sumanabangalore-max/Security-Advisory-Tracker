# Multi-stage build for full-stack Node.js Express + React/Vite application
# Uses node:20-slim (Debian glibc) instead of Alpine to eliminate DNS IPv6 lookup stalls on corporate VPNs / WSL2
ARG NODE_BASE=node:20-slim
FROM ${NODE_BASE} AS builder

WORKDIR /app

# Support optional corporate proxy build args
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

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
        npm config set fetch-retries 3 || true; \
        npm config set fetch-retry-mintimeout 2000 || true; \
        npm config set fetch-retry-maxtimeout 10000 || true; \
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

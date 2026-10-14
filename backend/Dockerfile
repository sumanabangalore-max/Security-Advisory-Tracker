FROM python:3.10-slim

WORKDIR /app

# Configure APT for high resilience in cloud VM environments:
# 1. Force IPv4 to prevent hanging on unresolved IPv6 routes
# 2. Set connection timeouts and retries
# 3. Add mirror fallback if deb.debian.org times out
RUN set -eux; \
    echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4; \
    echo 'Acquire::Retries "5";' >> /etc/apt/apt.conf.d/99force-ipv4; \
    echo 'Acquire::http::Timeout "45";' >> /etc/apt/apt.conf.d/99force-ipv4; \
    echo 'Acquire::https::Timeout "45";' >> /etc/apt/apt.conf.d/99force-ipv4; \
    apt-get update -y || { \
        echo "Primary mirror unreachable, attempting fallback mirror..."; \
        sed -i 's|deb.debian.org|ftp.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true; \
        sed -i 's|deb.debian.org|ftp.debian.org|g' /etc/apt/sources.list 2>/dev/null || true; \
        apt-get update -y; \
    }; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        gcc \
        g++ \
        libpq-dev \
        curl \
    ; \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create directory for inventory mounting
RUN mkdir -p /app/inventory

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

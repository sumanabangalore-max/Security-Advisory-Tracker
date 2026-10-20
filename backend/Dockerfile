FROM python:3.10-slim

WORKDIR /app

# Support optional build args for corporate proxies / private mirrors
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG PIP_INDEX_URL
ARG PIP_TRUSTED_HOST

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

COPY requirements.txt .

# 1. Best-effort pip upgrade (does not fail build if pip is already current or on transient net glitch)
# 2. Resilient install with 100s timeout, 5 retries, and --prefer-binary to ensure binary wheels are used
RUN python -m pip install --no-cache-dir --default-timeout=100 --retries=5 --upgrade pip || true && \
    python -m pip install --no-cache-dir --default-timeout=100 --retries=5 --prefer-binary -r requirements.txt

# Copy source code
COPY . .

# Create directory for inventory mounting
RUN mkdir -p /app/inventory

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

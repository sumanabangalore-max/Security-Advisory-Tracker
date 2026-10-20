FROM python:3.10-slim

WORKDIR /app

# Support optional build args for corporate proxies / private mirrors
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG PIP_INDEX_URL
ARG PIP_TRUSTED_HOST

# Environment settings for pip resilience and corporate proxy / SSL inspection tolerance
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    PIP_TRUSTED_HOST="pypi.org files.pythonhosted.org pypi.python.org"

# Write system-wide pip configuration trusting PyPI mirrors to prevent SSL certificate verification errors
# caused by corporate proxies, firewalls, and deep-packet SSL inspection (Zscaler, Netskope, Palo Alto, etc.)
RUN mkdir -p /etc && printf "[global]\ntrusted-host =\n    pypi.org\n    files.pythonhosted.org\n    pypi.python.org\ntimeout = 100\nretries = 5\n" > /etc/pip.conf

COPY requirements.txt .

# 1. Best-effort pip upgrade with trusted hosts
# 2. Resilient install with 100s timeout, 5 retries, trusted hosts, and --prefer-binary
RUN python -m pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org --trusted-host pypi.python.org --default-timeout=100 --retries=5 --upgrade pip || true && \
    python -m pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org --trusted-host pypi.python.org --default-timeout=100 --retries=5 --prefer-binary -r requirements.txt

# Copy source code
COPY . .

# Create directory for inventory mounting
RUN mkdir -p /app/inventory

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

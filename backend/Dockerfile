FROM python:3.10-slim

WORKDIR /app

# Python 3.10-slim already includes CA certificates and SSL libraries.
# All packages in requirements.txt (including psycopg2-binary, pandas, cryptography, uvicorn)
# provide pre-compiled wheels, so gcc/g++/libpq-dev are not required.


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

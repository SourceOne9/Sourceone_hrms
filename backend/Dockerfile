# HRMS Django Backend
# Multi-stage build for production-ready container

# --- Stage 1: Builder ---
FROM python:3.12-slim AS builder

WORKDIR /build

COPY hiringnow/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Stage 2: Runtime ---
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code (cache-bust on every deploy)
ARG CACHEBUST=1
COPY hiringnow/ .

# Collect static files (optional, start.sh also runs this)
RUN python manage.py collectstatic --noinput --settings=config.settings.base 2>/dev/null || true

EXPOSE 8001

# Copy start script (handles migrations + seed + gunicorn)
COPY hiringnow/start.sh .
RUN chmod +x start.sh

CMD ["bash", "start.sh"]

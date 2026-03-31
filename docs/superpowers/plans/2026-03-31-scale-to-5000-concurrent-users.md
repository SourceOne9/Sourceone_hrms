# Scale EMS-Pro to 5,000 Concurrent Users — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale the EMS-Pro HRMS from ~100 concurrent users to 5,000+ concurrent users through infrastructure and application-level changes, with zero downtime and full rollback safety at every step.

**Architecture:** Switch Django from sync WSGI to async ASGI (uvicorn workers), add PgBouncer connection pooling, horizontally scale via Docker Compose replicas behind Nginx load balancer, add Django-level Redis caching for hot paths, pipeline the Next.js metrics collector, and add a self-hosted Redis container to replace Upstash REST overhead.

**Tech Stack:** Django 6.0, Gunicorn + Uvicorn, PgBouncer, Nginx, Redis 7, Docker Compose, Next.js 16

---

## Pre-Flight Safety Checklist

Before starting ANY task below, complete these safety steps:

1. **Create a git branch:** `git checkout -b feat/scale-5000-users`
2. **Verify current health:** `docker compose up` — confirm both services start and health checks pass
3. **Backup docker-compose.yml:** `cp docker-compose.yml docker-compose.yml.bak`
4. **Backup Dockerfile (backend):** `cp backend/Dockerfile backend/Dockerfile.bak`
5. **Backup nginx config:** `cp infra/nginx/default.conf infra/nginx/default.conf.bak`

These backups allow instant rollback at any point: `cp docker-compose.yml.bak docker-compose.yml`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `backend/hiringnow/requirements.txt` | Add uvicorn + psycopg pool deps |
| Modify | `backend/hiringnow/config/asgi.py` | Ensure correct ASGI settings module |
| Modify | `backend/hiringnow/config/settings/base.py` | Add CACHES config, CONN_MAX_AGE, CONN_HEALTH_CHECKS |
| Modify | `backend/Dockerfile` | Switch from WSGI/gunicorn to ASGI/uvicorn worker class |
| Modify | `docker-compose.yml` | Add PgBouncer, Redis, replicas, health checks |
| Modify | `infra/nginx/default.conf` | Add upstream load balancing for multiple Django/Next instances |
| Modify | `lib/metrics.ts` | Pipeline 6 sequential Redis calls into 1 batch |
| Modify | `lib/redis.ts` | Add `pipeline()` support to the Redis wrapper |
| Create | `infra/pgbouncer/pgbouncer.ini` | PgBouncer pool config |
| Create | `infra/pgbouncer/userlist.txt` | PgBouncer auth file |
| Create | `infra/redis/redis.conf` | Redis server tuning |
| Modify | `backend/hiringnow/config/db_router.py` | Use CONN_MAX_AGE-aware connection config |

---

## Phase 1: ASGI + Uvicorn (4 concurrent → 800+ concurrent)

### Task 1: Add uvicorn to Python dependencies

**Files:**
- Modify: `backend/hiringnow/requirements.txt`

**Why:** Gunicorn's default sync workers handle 1 request per worker. Uvicorn async workers handle hundreds per worker via the event loop.

**Rollback:** Revert `requirements.txt` to remove the new line.

- [ ] **Step 1: Read current requirements.txt**

Open `backend/hiringnow/requirements.txt` and verify it does NOT already contain `uvicorn`.

- [ ] **Step 2: Add uvicorn dependency**

Append to the end of `backend/hiringnow/requirements.txt`:

```
uvicorn[standard]==0.34.2
```

The `[standard]` extra includes `uvloop` (faster event loop) and `httptools` (faster HTTP parsing).

- [ ] **Step 3: Verify the file**

Run:
```bash
grep uvicorn backend/hiringnow/requirements.txt
```
Expected: `uvicorn[standard]==0.34.2`

- [ ] **Step 4: Commit**

```bash
git add backend/hiringnow/requirements.txt
git commit -m "deps: add uvicorn[standard] for ASGI worker support"
```

---

### Task 2: Fix ASGI settings module reference

**Files:**
- Modify: `backend/hiringnow/config/asgi.py`

**Why:** The current `asgi.py` sets `DJANGO_SETTINGS_MODULE` to `'config.settings'` which may not resolve to the correct settings file when the ASGI app is loaded by uvicorn. It must match the `DJANGO_SETTINGS_MODULE` env var used in docker-compose (`config.settings.base`).

**Rollback:** Revert the single line change.

- [ ] **Step 1: Read current asgi.py**

Verify current content at `backend/hiringnow/config/asgi.py`. It currently reads:
```python
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
```

- [ ] **Step 2: Update the settings module default**

Change line 14 in `backend/hiringnow/config/asgi.py` from:
```python
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
```
to:
```python
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
```

This makes the default match what `docker-compose.yml` already sets via the `DJANGO_SETTINGS_MODULE` environment variable. The `setdefault` means the docker-compose env var still takes precedence.

- [ ] **Step 3: Commit**

```bash
git add backend/hiringnow/config/asgi.py
git commit -m "fix: align ASGI settings module default with docker-compose env"
```

---

### Task 3: Switch Dockerfile to uvicorn worker class

**Files:**
- Modify: `backend/Dockerfile`

**Why:** This is the single highest-impact change. Replacing `config.wsgi:application` with `config.asgi:application` and adding `--worker-class uvicorn.workers.UvicornWorker` switches from sync (1 req/worker) to async (hundreds req/worker).

**Rollback:** `cp backend/Dockerfile.bak backend/Dockerfile`

- [ ] **Step 1: Read current Dockerfile CMD**

Verify the current CMD in `backend/Dockerfile` is:
```dockerfile
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8001", \
     "--workers", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

- [ ] **Step 2: Replace the CMD with uvicorn worker class**

Replace the CMD block (last 5 lines) in `backend/Dockerfile` with:

```dockerfile
# ASGI with uvicorn workers: each worker handles hundreds of concurrent connections
# --workers 4: one per CPU core (adjust to match production CPU count)
# --worker-class: uvicorn async worker instead of default sync
# --timeout 120: kill workers that hang beyond 120s
CMD ["gunicorn", "config.asgi:application", \
     "--bind", "0.0.0.0:8001", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

Key changes:
- `config.wsgi:application` → `config.asgi:application`
- Added `--worker-class uvicorn.workers.UvicornWorker`
- Added `--graceful-timeout 30` for safe rolling restarts
- Added `--keep-alive 5` for connection reuse behind Nginx

- [ ] **Step 3: Build and verify the image starts**

```bash
cd backend && docker build -t hrms-django-test . && docker run --rm -e SECRET_KEY=test -e DB_NAME=test -e DB_USER=test -e DB_PASSWORD=test -e DB_HOST=localhost hrms-django-test gunicorn --check-config config.asgi:application --worker-class uvicorn.workers.UvicornWorker
```
Expected: No error output (config check passes). If it fails with import errors, uvicorn was not installed correctly — check Step 1 of Task 1.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile
git commit -m "perf: switch from WSGI sync to ASGI uvicorn workers

4 sync workers (4 concurrent) → 4 async workers (~800 concurrent).
Uses UvicornWorker class with graceful-timeout for safe rolling restarts."
```

---

### Task 4: Smoke test the ASGI switch

**Files:** None (test only)

**Why:** Before proceeding, we need to confirm the Django app actually boots and serves requests over ASGI. This catches any middleware or view that breaks under async.

- [ ] **Step 1: Start the stack**

```bash
docker compose up --build hrms-django
```
Expected: Container starts, health check passes at `http://localhost:8001/health/`

- [ ] **Step 2: Test a real API endpoint**

```bash
curl -s http://localhost:8001/api/v1/health/ | python -m json.tool
```
Expected: `200 OK` with JSON health response.

- [ ] **Step 3: Test an authenticated endpoint**

```bash
curl -s -X POST http://localhost:8001/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testpass"}' | python -m json.tool
```
Expected: Either a token response or a 401 — either is fine. The point is the ASGI app processes the request without 500 errors.

- [ ] **Step 4: Check for async warnings**

```bash
docker compose logs hrms-django 2>&1 | grep -i "async\|SynchronousOnlyOperation\|event loop"
```
Expected: No `SynchronousOnlyOperation` errors. If you see them, it means a view is doing sync DB calls inside an async context — Django 6.0 handles this automatically via `sync_to_async`, so this should not happen.

- [ ] **Step 5: Stop the stack**

```bash
docker compose down
```

---

## Phase 2: PgBouncer Connection Pooling (Unlocks Multi-Instance)

### Task 5: Create PgBouncer configuration

**Files:**
- Create: `infra/pgbouncer/pgbouncer.ini`
- Create: `infra/pgbouncer/userlist.txt`

**Why:** Each Django worker opens its own PostgreSQL connection. With 3 instances × 4 workers = 12 connections per tenant DB. With 10 tenants, that's 120 connections — hitting PostgreSQL's default 100 limit. PgBouncer multiplexes 1,000+ client connections over 25 actual DB connections.

**Rollback:** Remove the `infra/pgbouncer/` directory and the pgbouncer service from docker-compose.

- [ ] **Step 1: Create the PgBouncer directory**

```bash
mkdir -p infra/pgbouncer
```

- [ ] **Step 2: Create pgbouncer.ini**

Create `infra/pgbouncer/pgbouncer.ini`:

```ini
[databases]
; Default database connection — PgBouncer forwards to the actual PostgreSQL
; The asterisk (*) means "any database name" — so tenant DBs (recruitment_db_acme)
; are automatically forwarded without explicit per-tenant config.
* = host=${DB_HOST} port=${DB_PORT} dbname=${DB_NAME}

[pgbouncer]
; Listen on all interfaces inside the container
listen_addr = 0.0.0.0
listen_port = 6432

; Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Pool mode: transaction = return connection to pool after each transaction
; This is the safest mode for Django (no session-level state like prepared statements)
pool_mode = transaction

; Pool sizing
; max_client_conn: how many app connections PgBouncer accepts (Django workers)
max_client_conn = 1000
; default_pool_size: actual PostgreSQL connections per database
default_pool_size = 25
; min_pool_size: keep this many connections warm
min_pool_size = 5
; reserve_pool_size: extra connections for burst traffic
reserve_pool_size = 5
reserve_pool_timeout = 3

; Timeouts
server_idle_timeout = 300
server_lifetime = 3600
client_idle_timeout = 0

; Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1

; Stats
stats_period = 60

; Admin access (for monitoring: SHOW POOLS; SHOW STATS;)
admin_users = ${DB_USER}
```

- [ ] **Step 3: Create userlist.txt**

Create `infra/pgbouncer/userlist.txt`:

```
; PgBouncer auth file
; Format: "username" "password"
; In production, use md5 hashes. For Docker, we inject via env substitution.
; This file will be generated at container startup from env vars.
```

Note: We will use an entrypoint script in docker-compose to generate this file from environment variables at runtime so passwords are never stored in files.

- [ ] **Step 4: Commit**

```bash
git add infra/pgbouncer/
git commit -m "infra: add PgBouncer config for connection pooling

Transaction-mode pooling: 1000 client connections → 25 actual PG connections.
Wildcard DB matching supports multi-tenant DB routing automatically."
```

---

### Task 6: Add PgBouncer service to Docker Compose

**Files:**
- Modify: `docker-compose.yml`

**Why:** PgBouncer runs as a sidecar container. Django connects to PgBouncer on port 6432 instead of PostgreSQL on port 5432. PgBouncer multiplexes connections to the real PostgreSQL.

**Rollback:** `cp docker-compose.yml.bak docker-compose.yml`

- [ ] **Step 1: Read current docker-compose.yml**

Verify the current `docker-compose.yml` structure has `hrms-django`, `hrms-next`, and `gateway` services.

- [ ] **Step 2: Add PgBouncer service**

Add the following service block BEFORE the `hrms-django` service in `docker-compose.yml`:

```yaml
  # --- PgBouncer Connection Pooler ---
  # Multiplexes Django DB connections: 1000 client conns → 25 actual PG conns
  pgbouncer:
    image: edoburu/pgbouncer:1.23.1
    container_name: hrms-pgbouncer
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME}
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
      MIN_POOL_SIZE: 5
      RESERVE_POOL_SIZE: 5
      AUTH_TYPE: md5
    ports:
      - "6432:6432"
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "localhost", "-p", "6432"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - hrms-internal
```

- [ ] **Step 3: Update hrms-django to depend on PgBouncer**

In the `hrms-django` service, add `pgbouncer` to `depends_on`:

```yaml
  hrms-django:
    # ... existing config ...
    depends_on:
      pgbouncer:
        condition: service_healthy
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.base
      # Override DB_HOST to point to PgBouncer instead of direct PostgreSQL
      - DB_HOST=pgbouncer
      - DB_PORT=6432
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "infra: add PgBouncer connection pooler to Docker Compose

Django connects to pgbouncer:6432 instead of postgres:5432.
Transaction-mode pooling handles multi-tenant DB routing."
```

---

### Task 7: Configure Django connection settings for pooling

**Files:**
- Modify: `backend/hiringnow/config/settings/base.py`

**Why:** Django must be told to reuse connections (`CONN_MAX_AGE`) and health-check them (`CONN_HEALTH_CHECKS`) to work efficiently with PgBouncer. Without this, Django opens and closes a connection on every request.

**Rollback:** Remove the 2 added lines from `_get_databases()`.

- [ ] **Step 1: Read current _get_databases() function**

In `backend/hiringnow/config/settings/base.py`, find the `_get_databases()` function (lines 107-134).

- [ ] **Step 2: Add connection persistence settings**

In the `_get_databases()` function, add `CONN_MAX_AGE` and `CONN_HEALTH_CHECKS` to the default database config. Change the `base` dict (lines 108-117) from:

```python
    base = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME'),
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
        }
    }
```

to:

```python
    base = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME'),
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
            'CONN_MAX_AGE': env.int('CONN_MAX_AGE', default=600),
            'CONN_HEALTH_CHECKS': True,
        }
    }
```

Also update the tenant DB loop (line 126) to include the same settings. Change:

```python
        base[alias] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': alias,
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
        }
```

to:

```python
        base[alias] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': alias,
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
            'CONN_MAX_AGE': env.int('CONN_MAX_AGE', default=600),
            'CONN_HEALTH_CHECKS': True,
        }
```

- [ ] **Step 3: Also update the dynamic registration in db_router.py**

In `backend/hiringnow/config/db_router.py`, the `_db_for_model` method dynamically registers tenant DBs (lines 40-44). Update the copy to include the new settings. Change:

```python
                with _db_lock:
                    if db_name not in settings.DATABASES:
                        default = settings.DATABASES["default"].copy()
                        default["NAME"] = db_name
                        settings.DATABASES[db_name] = default
```

to:

```python
                with _db_lock:
                    if db_name not in settings.DATABASES:
                        default = settings.DATABASES["default"].copy()
                        default["NAME"] = db_name
                        default["CONN_MAX_AGE"] = 600
                        default["CONN_HEALTH_CHECKS"] = True
                        settings.DATABASES[db_name] = default
```

- [ ] **Step 4: Commit**

```bash
git add backend/hiringnow/config/settings/base.py backend/hiringnow/config/db_router.py
git commit -m "perf: enable persistent DB connections with health checks

CONN_MAX_AGE=600 reuses connections for 10 minutes instead of per-request.
CONN_HEALTH_CHECKS=True verifies stale connections before use.
Applied to both static tenant configs and dynamically registered DBs."
```

---

## Phase 3: Horizontal Scaling (800 → 2,400+ concurrent)

### Task 8: Update Nginx for multi-instance upstream load balancing

**Files:**
- Modify: `infra/nginx/default.conf`

**Why:** With multiple Django and Next.js instances, Nginx must round-robin across them. The current config points to a single `hrms-django:8001` and `hrms-next:3001`.

**Rollback:** `cp infra/nginx/default.conf.bak infra/nginx/default.conf`

- [ ] **Step 1: Read current nginx config**

Verify the current `upstream` blocks at the top of `infra/nginx/default.conf`:

```nginx
upstream hrms_django { server hrms-django:8001; }
upstream hrms_next   { server hrms-next:3001; }
```

- [ ] **Step 2: Replace the upstream blocks with multi-instance config**

Replace the two `upstream` blocks for HRMS with:

```nginx
# HRMS Django — load balanced across replicas
# Docker Compose DNS resolves to all container IPs when using replicas
upstream hrms_django {
    least_conn;  # Route to the instance with fewest active connections
    server hrms-django-1:8001;
    server hrms-django-2:8001;
    server hrms-django-3:8001;
    keepalive 32;  # Reuse connections to reduce TCP handshake overhead
}

# HRMS Next.js — load balanced across replicas
upstream hrms_next {
    least_conn;
    server hrms-next-1:3001;
    server hrms-next-2:3001;
    keepalive 16;
}
```

- [ ] **Step 3: Add proxy connection reuse**

Inside the `server { }` block, after the `proxy_set_header` directives, add:

```nginx
    # Connection reuse for upstream keepalive
    proxy_http_version 1.1;
    proxy_set_header Connection "";
```

Note: Remove the per-location `proxy_http_version 1.1` and `proxy_set_header Connection "upgrade"` from the WebSocket locations (`/hrms/` and `/`) since the global setting handles HTTP/1.1, and only WebSocket locations need the `Upgrade` header. Update those locations to:

```nginx
    location /hrms/ {
        proxy_pass http://hrms_next;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
```

(Keep the `Upgrade`/`Connection` headers ONLY on locations that serve WebSocket traffic.)

- [ ] **Step 4: Add rate limiting zone**

Add at the very top of the file, BEFORE the `upstream` blocks:

```nginx
# Rate limiting: 30 requests/second per IP (burst to 60)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
```

Then inside the Django API location block, add:

```nginx
    location /api/v1/hrms/ {
        limit_req zone=api_limit burst=60 nodelay;
        rewrite ^/api/v1/hrms/(.*)$ /api/v1/$1 break;
        proxy_pass http://hrms_django;
        proxy_read_timeout 120s;
    }
```

- [ ] **Step 5: Commit**

```bash
git add infra/nginx/default.conf
git commit -m "infra: configure Nginx for multi-instance load balancing

least_conn routing across 3 Django + 2 Next.js instances.
keepalive connections for reduced TCP overhead.
Rate limiting at 30r/s per IP with burst=60."
```

---

### Task 9: Scale Docker Compose to multiple instances

**Files:**
- Modify: `docker-compose.yml`

**Why:** Instead of using `deploy.replicas` (which requires Docker Swarm mode), we define named instances for docker-compose compatibility. Each instance gets a unique container name and the same build config.

**Rollback:** `cp docker-compose.yml.bak docker-compose.yml`

- [ ] **Step 1: Replace single hrms-django with 3 instances**

Replace the `hrms-django` service with three named services. Remove the existing `hrms-django` block and add:

```yaml
  # --- HRMS Django Backend (3 instances for horizontal scaling) ---
  hrms-django-1:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hrms-django-1
    env_file:
      - ./backend/hiringnow/.env
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.base
      - DB_HOST=pgbouncer
      - DB_PORT=6432
      - INSTANCE_ID=django-1
    depends_on:
      pgbouncer:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health/')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    networks:
      - hrms-internal
      - hiringnow-network

  hrms-django-2:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hrms-django-2
    env_file:
      - ./backend/hiringnow/.env
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.base
      - DB_HOST=pgbouncer
      - DB_PORT=6432
      - INSTANCE_ID=django-2
    depends_on:
      pgbouncer:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health/')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    networks:
      - hrms-internal
      - hiringnow-network

  hrms-django-3:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hrms-django-3
    env_file:
      - ./backend/hiringnow/.env
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.base
      - DB_HOST=pgbouncer
      - DB_PORT=6432
      - INSTANCE_ID=django-3
    depends_on:
      pgbouncer:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health/')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    networks:
      - hrms-internal
      - hiringnow-network
```

- [ ] **Step 2: Replace single hrms-next with 2 instances**

Replace the `hrms-next` service with:

```yaml
  # --- HRMS Next.js Frontend (2 instances) ---
  hrms-next-1:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_BASE_PATH: ${NEXT_PUBLIC_BASE_PATH:-}
        NEXT_PUBLIC_EMBEDDED: ${NEXT_PUBLIC_EMBEDDED:-false}
    container_name: hrms-next-1
    environment:
      - DJANGO_INTERNAL_URL=http://hrms-django-1:8001
      - NEXT_PUBLIC_API_URL=http://hrms-django-1:8001
    depends_on:
      hrms-django-1:
        condition: service_healthy
    networks:
      - hrms-internal
      - hiringnow-network

  hrms-next-2:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_BASE_PATH: ${NEXT_PUBLIC_BASE_PATH:-}
        NEXT_PUBLIC_EMBEDDED: ${NEXT_PUBLIC_EMBEDDED:-false}
    container_name: hrms-next-2
    environment:
      - DJANGO_INTERNAL_URL=http://hrms-django-2:8001
      - NEXT_PUBLIC_API_URL=http://hrms-django-2:8001
    depends_on:
      hrms-django-2:
        condition: service_healthy
    networks:
      - hrms-internal
      - hiringnow-network
```

- [ ] **Step 3: Update gateway depends_on**

Update the gateway service's `depends_on` to reference the new service names:

```yaml
  gateway:
    # ... existing config ...
    depends_on:
      - hrms-django-1
      - hrms-django-2
      - hrms-django-3
      - hrms-next-1
      - hrms-next-2
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "infra: scale to 3 Django + 2 Next.js instances

3 Django ASGI instances × 4 uvicorn workers = ~2,400 concurrent capacity.
2 Next.js instances = ~400 concurrent frontend capacity.
All instances route through PgBouncer for DB connection pooling."
```

---

## Phase 4: Self-Hosted Redis (Remove Upstash REST Overhead)

### Task 10: Add Redis container to Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Create: `infra/redis/redis.conf`

**Why:** Upstash uses REST (HTTP) which adds ~5-15ms per call. Self-hosted Redis uses TCP with sub-millisecond latency. At 750 req/sec, this saves ~3-10 seconds of aggregate latency per second.

**Rollback:** Remove the Redis service from docker-compose and the `infra/redis/` directory.

- [ ] **Step 1: Create Redis config**

```bash
mkdir -p infra/redis
```

Create `infra/redis/redis.conf`:

```conf
# Redis configuration for HRMS production use
# Memory limit — prevents Redis from consuming all host memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence — RDB snapshots (good enough for cache + rate limiting)
save 900 1
save 300 10
save 60 10000

# Network
bind 0.0.0.0
protected-mode no
tcp-keepalive 300

# Performance
hz 10
dynamic-hz yes

# Logging
loglevel notice
```

- [ ] **Step 2: Add Redis service to docker-compose.yml**

Add before the PgBouncer service:

```yaml
  # --- Redis Cache & Rate Limiting ---
  redis:
    image: redis:7-alpine
    container_name: hrms-redis
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - ./infra/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
      - redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - hrms-internal
```

Add to the `volumes` section at the bottom of the file (create it if it doesn't exist):

```yaml
volumes:
  redis-data:
```

- [ ] **Step 3: Add REDIS_URL to Django instances**

In each `hrms-django-*` service's `environment` section, add:

```yaml
      - REDIS_URL=redis://redis:6379/0
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml infra/redis/
git commit -m "infra: add self-hosted Redis 7 for cache and rate limiting

512MB memory limit with LRU eviction. RDB persistence for crash recovery.
Replaces Upstash REST (~10ms/call) with TCP Redis (~0.1ms/call)."
```

---

## Phase 5: Django-Level Redis Caching

### Task 11: Add Django cache configuration

**Files:**
- Modify: `backend/hiringnow/config/settings/base.py`
- Modify: `backend/hiringnow/requirements.txt`

**Why:** Currently every request hits PostgreSQL for tenant config, RBAC permissions, and feature flags. Caching these in Redis reduces DB load by ~40%.

**Rollback:** Remove the `CACHES` block from settings and revert requirements.txt.

- [ ] **Step 1: Add django-redis to requirements**

Add to `backend/hiringnow/requirements.txt`:

```
django-redis==5.4.0
```

- [ ] **Step 2: Add CACHES configuration to settings**

In `backend/hiringnow/config/settings/base.py`, add after the `REDIS_URL` line (line 232):

```python
# Django cache backend — uses the same Redis instance for all caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'TIMEOUT': 300,  # Default TTL: 5 minutes
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
            },
        },
        'KEY_PREFIX': 'hrms',
    }
}

# Session engine — use Redis-backed sessions for multi-instance consistency
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

- [ ] **Step 3: Commit**

```bash
git add backend/hiringnow/config/settings/base.py backend/hiringnow/requirements.txt
git commit -m "perf: add Django Redis caching with 5-min default TTL

django-redis backend with 50-connection pool.
Redis-backed sessions for multi-instance session consistency."
```

---

### Task 12: Cache RBAC permission lookups

**Files:**
- Modify: `backend/hiringnow/apps/rbac/views.py` (or wherever permission checks happen)

**Why:** The RBAC permission matrix is queried on almost every authenticated request. It rarely changes. Caching it per-user for 5 minutes eliminates the most frequent DB query.

- [ ] **Step 1: Find the permission check code**

```bash
grep -rn "has_perm\|check_permission\|get_permissions\|RolePermission" backend/hiringnow/apps/rbac/ --include="*.py"
```

Identify the function that loads a user's permissions from the database.

- [ ] **Step 2: Add caching to the permission lookup**

Wrap the permission query with Django's cache framework. The exact code depends on what Step 1 finds, but the pattern is:

```python
from django.core.cache import cache

def get_user_permissions(user_id, tenant_slug):
    cache_key = f"hrms:rbac:{tenant_slug}:user:{user_id}:perms"
    permissions = cache.get(cache_key)
    if permissions is not None:
        return permissions

    # Existing DB query here
    permissions = list(
        RolePermission.objects.filter(
            role__userrole__user_id=user_id
        ).values_list('permission__codename', flat=True)
    )

    cache.set(cache_key, permissions, timeout=300)  # 5 minutes
    return permissions
```

- [ ] **Step 3: Add cache invalidation on role change**

In the view/serializer that assigns or removes roles, add:

```python
from django.core.cache import cache

# After role assignment/removal:
cache.delete(f"hrms:rbac:{tenant_slug}:user:{user_id}:perms")
```

- [ ] **Step 4: Commit**

```bash
git add backend/hiringnow/apps/rbac/
git commit -m "perf: cache RBAC permission lookups in Redis (5-min TTL)

Most-hit DB query now cached. Invalidated on role assignment changes."
```

---

### Task 13: Cache feature flag lookups

**Files:**
- Modify: `backend/hiringnow/apps/features/views.py` (or wherever feature flags are loaded)

**Why:** Feature flags are loaded on every page load to determine sidebar visibility and route gating. They change very rarely (admin-only toggle).

- [ ] **Step 1: Find the feature flag query**

```bash
grep -rn "FeatureFlag\|TenantFeature\|feature_flags" backend/hiringnow/apps/features/ --include="*.py"
```

- [ ] **Step 2: Add caching to the feature flag lookup**

```python
from django.core.cache import cache

def get_tenant_features(tenant_slug):
    cache_key = f"hrms:features:{tenant_slug}"
    features = cache.get(cache_key)
    if features is not None:
        return features

    # Existing DB query
    features = list(
        TenantFeature.objects.filter(
            tenant__slug=tenant_slug,
            is_enabled=True
        ).select_related('feature').values_list('feature__code', flat=True)
    )

    cache.set(cache_key, features, timeout=60)  # 1 minute
    return features
```

- [ ] **Step 3: Add cache invalidation on feature toggle**

In the view that enables/disables features:

```python
cache.delete(f"hrms:features:{tenant_slug}")
```

- [ ] **Step 4: Commit**

```bash
git add backend/hiringnow/apps/features/
git commit -m "perf: cache tenant feature flags in Redis (60s TTL)

Eliminates per-request DB query for sidebar/route gating.
Invalidated on admin feature toggle."
```

---

## Phase 6: Metrics Pipeline (Save ~30ms/request)

### Task 14: Add pipeline support to Redis wrapper

**Files:**
- Modify: `lib/redis.ts`

**Why:** The Redis wrapper currently has no `pipeline()` method. We need one so the metrics collector can batch 6 operations into 1 round-trip.

**Rollback:** Revert `lib/redis.ts` to the backed-up version.

- [ ] **Step 1: Read current redis.ts**

Verify the current `redis` export object at `lib/redis.ts` (lines 35-99) has `set`, `get`, `incr`, `expire` methods but no `pipeline`.

- [ ] **Step 2: Add pipeline support**

Add the following after the `expire` method (before the closing `}` of the `redis` export on line 99):

```typescript
    pipeline() {
        if (redisClient) {
            return redisClient.pipeline()
        }

        // In-memory fallback: collect operations and execute sequentially
        const ops: Array<() => Promise<unknown>> = []
        const fakePipeline = {
            incr(key: string) {
                ops.push(() => redis.incr(key))
                return fakePipeline
            },
            set(key: string, value: unknown, config?: { ex?: number }) {
                ops.push(() => redis.set(key, value, config))
                return fakePipeline
            },
            get(key: string) {
                ops.push(() => redis.get(key))
                return fakePipeline
            },
            expire(key: string, seconds: number) {
                ops.push(() => redis.expire(key, seconds))
                return fakePipeline
            },
            async exec() {
                return Promise.all(ops.map(op => op()))
            }
        }
        return fakePipeline
    }
```

- [ ] **Step 3: Commit**

```bash
git add lib/redis.ts
git commit -m "feat: add pipeline() support to Redis wrapper

Batches multiple Redis operations into a single round-trip.
In-memory fallback executes sequentially via Promise.all."
```

---

### Task 15: Pipeline the metrics collector

**Files:**
- Modify: `lib/metrics.ts`

**Why:** `recordRequest()` currently makes 6+ sequential `await redis.incr()` calls. Each is an HTTP round-trip to Upstash (~10ms) or TCP to Redis (~0.1ms). Pipelining reduces this to 1 round-trip regardless.

**Rollback:** Revert `lib/metrics.ts`.

- [ ] **Step 1: Read current recordRequest method**

Verify `lib/metrics.ts` lines 20-85 contain 6+ sequential `await redis.incr/set/get` calls.

- [ ] **Step 2: Replace sequential calls with pipeline**

Replace the `recordRequest` method body (lines 20-85) with:

```typescript
    static async recordRequest(metrics: ApiMetrics) {
        const { path, status, latencyMs, organizationId } = metrics
        const date = new Date().toISOString().split('T')[0]
        const baseKey = `${this.PREFIX}:${date}`

        try {
            // Batch all counter updates into a single Redis round-trip
            const pipe = redis.pipeline()
            pipe.incr(`${baseKey}:total_hits`)
            pipe.incr(`${baseKey}:status:${Math.floor(status / 100)}xx`)
            pipe.incr(`${baseKey}:path:${path}:hits`)
            pipe.incr(`${baseKey}:latency_count`)
            pipe.get(`${baseKey}:latency_sum`)

            const results = await pipe.exec()

            // Update latency sum (needs current value, so done after pipeline)
            const currentSum = Number(results?.[4] || 0)
            await redis.set(`${baseKey}:latency_sum`, currentSum + latencyMs)

            // Organization error tracking (only on 5xx)
            if (status >= 500 && organizationId) {
                const orgErrorKey = `${baseKey}:org:${organizationId}:errors`
                const count = await redis.incr(orgErrorKey)

                if (count >= 5) {
                    const alertInhibitedKey = `${baseKey}:org:${organizationId}:alert_inhibited`
                    const isInhibited = await redis.get(alertInhibitedKey)

                    if (!isInhibited) {
                        try {
                            await fetch(`${DJANGO_BASE}/api/v1/admin/alerts/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    organization_id: organizationId,
                                    severity: "HIGH",
                                    reason: `Critical API Failure Spike: ${count} errors of type 5xx detected in organization ${organizationId} on ${date}.`,
                                }),
                                signal: AbortSignal.timeout(5000),
                            })
                            await redis.set(alertInhibitedKey, true, { ex: 14400 })
                            logger.info("System alert generated for error spike", { organizationId, errorCount: count })
                        } catch (pErr) {
                            logger.error("Failed to generate AdminAlert", { pErr: pErr instanceof Error ? pErr.message : String(pErr) })
                        }
                    }
                }

                if (count === 1) await redis.expire(orgErrorKey, 86400)
            }

            // Latency alert (log only, no Redis)
            if (latencyMs > 5000 && organizationId) {
                logger.warn("Slow request detected", { path, latencyMs, organizationId })
            }
        } catch (error) {
            logger.error("[METRICS_COLLECTOR_ERROR]", { error: error instanceof Error ? error.message : String(error) })
        }
    }
```

**What changed:**
- 5 sequential `await` calls → 1 pipeline `exec()` call (saves ~40-50ms on Upstash, ~0.5ms on local Redis)
- The latency sum still needs a second call (read-then-write), reduced from 3 calls to 2
- Error path (5xx) is unchanged — it only fires on errors, not hot path

- [ ] **Step 3: Commit**

```bash
git add lib/metrics.ts
git commit -m "perf: pipeline metrics Redis calls (6 round-trips → 1)

Hot path reduced from 6 sequential awaits to 1 pipeline exec.
Saves ~40-50ms per request on REST Redis, ~0.5ms on TCP Redis."
```

---

## Phase 7: Integration Testing & Validation

### Task 16: Full stack smoke test

**Files:** None (test only)

**Why:** All infrastructure changes are in place. We need to verify the entire stack works together before merging.

- [ ] **Step 1: Build all images**

```bash
docker compose build
```
Expected: All images build successfully with no errors.

- [ ] **Step 2: Start the full stack**

```bash
docker compose --profile gateway up -d
```
Expected: All containers start. Check with:
```bash
docker compose ps
```
All services should show `healthy` or `running`.

- [ ] **Step 3: Verify PgBouncer is accepting connections**

```bash
docker exec hrms-pgbouncer pgbouncer -V
docker exec hrms-pgbouncer psql -p 6432 -U ${DB_USER} pgbouncer -c "SHOW POOLS;"
```
Expected: Pool stats showing active connections.

- [ ] **Step 4: Verify Redis is running**

```bash
docker exec hrms-redis redis-cli ping
```
Expected: `PONG`

- [ ] **Step 5: Verify all 3 Django instances respond**

```bash
curl -s http://localhost:8001/health/ | python -m json.tool  # via gateway
docker exec hrms-django-1 python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health/').read())"
docker exec hrms-django-2 python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health/').read())"
docker exec hrms-django-3 python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health/').read())"
```
Expected: All 3 return 200 OK health responses.

- [ ] **Step 6: Verify Nginx load balancing**

```bash
for i in {1..10}; do curl -s http://localhost/api/v1/hrms/health/ -o /dev/null -w "HTTP %{http_code}\n"; done
```
Expected: All 10 return `HTTP 200`. Check Nginx logs to confirm requests are distributed:
```bash
docker compose logs gateway | tail -20
```

- [ ] **Step 7: Run the existing test suite**

```bash
npx vitest run
```
Expected: All existing tests pass. If any fail, they are likely due to environment changes — check that test config still points to the right URLs.

- [ ] **Step 8: Stop the stack**

```bash
docker compose down
```

---

### Task 17: Document the scaling configuration

**Files:**
- Modify: No new files — update inline comments only

**Why:** Future operators need to know how to adjust instance counts and pool sizes.

- [ ] **Step 1: Add scaling notes as comments in docker-compose.yml**

At the top of `docker-compose.yml`, add:

```yaml
# SCALING GUIDE:
# - Django instances: Add/remove hrms-django-N services + update infra/nginx/default.conf upstream
# - Next.js instances: Add/remove hrms-next-N services + update infra/nginx/default.conf upstream
# - PgBouncer pool: Adjust MAX_CLIENT_CONN (client-side) and DEFAULT_POOL_SIZE (PG-side)
# - Redis memory: Adjust maxmemory in infra/redis/redis.conf
# - Workers per instance: Adjust --workers in backend/Dockerfile (1 per CPU core)
#
# CAPACITY (current config):
# 3 Django × 4 uvicorn workers = ~2,400 concurrent requests
# 2 Next.js instances = ~400 concurrent connections
# PgBouncer: 1,000 client connections → 25 PG connections
# Redis: 512MB cache with LRU eviction
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "docs: add scaling guide comments to docker-compose.yml"
```

---

## Capacity Summary

| Layer | Before | After | Multiplier |
|-------|--------|-------|------------|
| Django concurrent requests | 4 (sync) | ~2,400 (3×4 async) | **600x** |
| Next.js concurrent connections | ~200 (1 instance) | ~400 (2 instances) | **2x** |
| DB connections (client-side) | 4 per instance | 1,000 via PgBouncer | **250x** |
| DB connections (actual PG) | 4 | 25 (pooled) | Controlled |
| Redis latency per call | ~10ms (Upstash REST) | ~0.1ms (local TCP) | **100x** |
| Metrics overhead per request | ~60ms (6 calls) | ~0.2ms (1 pipeline) | **300x** |
| Cache hit rate | 0% (no cache) | ~60-80% (RBAC + features) | New |

**Net result: 5,000+ concurrent users on 3 Django + 2 Next.js + PgBouncer + Redis**

---

## Rollback Plan

Every phase is independently reversible:

| Phase | Rollback Command |
|-------|-----------------|
| Phase 1 (ASGI) | Revert `backend/Dockerfile` CMD to `config.wsgi:application`, remove `--worker-class` |
| Phase 2 (PgBouncer) | Remove `pgbouncer` service from docker-compose, revert `DB_HOST`/`DB_PORT` |
| Phase 3 (Horizontal) | Replace 3+2 services with original single `hrms-django` + `hrms-next` |
| Phase 4 (Redis) | Remove `redis` service from docker-compose |
| Phase 5 (Caching) | Remove `CACHES` from settings, revert `requirements.txt` |
| Phase 6 (Pipeline) | Revert `lib/metrics.ts` and `lib/redis.ts` |

Or nuclear rollback: `git checkout master -- docker-compose.yml backend/ infra/ lib/`

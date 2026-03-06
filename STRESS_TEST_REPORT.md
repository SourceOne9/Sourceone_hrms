# Stress Test Report — EMS Pro

**Date:** 2026-03-06
**Status:** Architectural Review (pending live load testing)
**Schema:** 55 models, 38 enums (Prisma 7.4)
**RBAC:** 5 roles × 18 modules × 8 actions

---

## Current Architecture Limits

| Layer | Capability | Bottleneck Risk |
|---|---|---|
| Next.js API | Serverless — scales horizontally, 82+ route handlers | Cold starts on first request |
| PostgreSQL (Supabase) | Connection pooling via PgBouncer, `max: 2` per instance | 60 connection default limit |
| Redis (Upstash) | 10,000 req/s on paid plan | In-memory mock used locally |
| Gemini AI | 60 RPM (free), 1000 RPM (paid) | Cron agent batch size capped at 50 |
| RBAC | Permission check per request via `withAuth()` | In-memory matrix — negligible overhead |

---

## API Route Performance

| Route Group | Count | Key Optimization |
|---|---|---|
| `/api/employees` | 6 | Paginated with `skip/take`, search support |
| `/api/attendance` | 9 | Bounded queries (`take: 100-200`) |
| `/api/time-tracker` | 7 | `$transaction` on check-in/check-out |
| `/api/payroll` | 6 | CSV upsert, paginated reads |
| `/api/performance` | 1 | Role-scoped GET (CEO/HR: all, TEAM_LEAD: own+created, EMPLOYEE: own) |
| `/api/dashboard` | 2 | 5 min Redis cache, SQL aggregation for salary ranges |
| `/api/admin/*` | 7 | Burnout: raw SQL aggregation with LIMIT 500 |
| Other (30+) | 30+ | All bounded with `take` limits |

---

## Performance Agent Load Projection

| Employees | Gemini API Calls | Estimated Duration |
|---|---|---|
| 50 | 50 | ~2–3 minutes |
| 500 | 500 (10 batches) | ~20–25 minutes |
| 10,000 | 10,000 (200 batches) | Requires Gemini paid tier + parallel batching |

**Mitigation for scale:**

- Increase batch size from 50 → 200 (Gemini Pro has higher RPM)
- Use `Promise.allSettled` for parallel employee evaluation within batch
- Use a queue (BullMQ or Vercel Queues) for large org processing

---

## Rate Limiting

- Current: 60 req/min per IP (Redis-backed)
- Falls back to in-memory if Redis unavailable (non-persistent across restarts)
- Recommended: Configure Upstash for production

---

## Dashboard Polling Impact

| Scenario | Before (v2.0) | After (v3.0+) |
|---|---|---|
| 1,000 users, dashboards open | 400+ req/sec (10s intervals, no visibility check) | ~33 req/sec (30s intervals + visibilitychange pause) |
| TimeTracker active | 3 stacking intervals per user | Consolidated with visibility-aware polling |

---

## Database Connection Strategy

```
Per serverless instance:
  max: 2 connections
  idleTimeoutMillis: 5000
  connectionTimeoutMillis: 3000

With PgBouncer (Supabase):
  Effective capacity: ~200 concurrent instances × 2 = 400 pooled connections
  Supabase Pro limit: 200 direct connections
```

---

## Security Under Load

| Protection | Mechanism | Scalability |
|---|---|---|
| RBAC | In-memory permission matrix (`lib/permissions.ts`) | O(1) lookup per request |
| Rate Limiting | Redis sliding window | Scales with Redis capacity |
| Session Validation | `UserSession.isRevoked` DB check in `withAuth()` | 1 query per request (could be cached) |
| Input Validation | 30+ Zod schemas | CPU-bound, negligible per request |
| Data Isolation | `orgFilter()` appends `WHERE organizationId = ?` | Index-backed, O(log n) |

---

## Recommendations for Production Scale

1. **Database**
   - Enable Prisma connection pooling (PgBouncer mode in Supabase)
   - Add indexes on frequently queried fields (already in schema)
   - Consider read replicas for dashboard analytics queries

2. **Caching**
   - Configure Upstash Redis (`UPSTASH_REDIS_REST_URL` + token)
   - Dashboard cache TTL currently 5 minutes — adequate for most use cases
   - Add `Cache-Control` headers on GET endpoints for CDN caching

3. **AI Agent**
   - Upgrade Gemini to paid plan for 1000+ RPM
   - Consider a progressive rollout cron (weekly per department, not all at once)

4. **Deployment**
   - Use Vercel Pro for 300s function timeout (cron job needs up to 5 min)
   - Set `maxDuration = 300` in cron route (already set)

5. **Session Management**
   - Consider caching session validation in Redis (TTL: 60s) to reduce DB queries under load
   - Monitor `UserSession` table size — add cleanup cron for expired sessions

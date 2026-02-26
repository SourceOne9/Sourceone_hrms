# Stress Test Report — EMS Pro

**Date:** 2026-02-26
**Status:** Architectural Review (pending live load testing)

---

## Current Architecture Limits

| Layer | Capability | Bottleneck Risk |
|---|---|---|
| Next.js API | Serverless — scales horizontally | Cold starts on first request |
| PostgreSQL (Supabase) | Connection pooling via PgBouncer | 60 connection default limit |
| Redis (Upstash) | 10,000 req/s on paid plan | In-memory mock used locally |
| Gemini AI | 60 RPM (free), 1000 RPM (paid) | Cron agent batch size capped at 50 |

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

## Recommendations for Production Scale

1. **Database**
   - Enable Prisma connection pooling (PgBouncer mode in Supabase)
   - Add indexes on frequently queried fields (already in schema)

2. **Caching**
   - Configure Upstash Redis (`UPSTASH_REDIS_REST_URL` + token)
   - Dashboard cache TTL currently 5 minutes — adequate for most use cases

3. **AI Agent**
   - Upgrade Gemini to paid plan for 1000+ RPM
   - Consider a progressive rollout cron (weekly per department, not all at once)

4. **Deployment**
   - Use Vercel Pro for 300s function timeout (cron job needs up to 5 min)
   - Set `maxDuration = 300` in cron route (already set)

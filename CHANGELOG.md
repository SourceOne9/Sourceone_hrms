# Changelog

All notable changes to EMS Pro are documented here.

---

## [Unreleased] — 2026-02-26

### Fixed
- **Employee Creation 500 Error** — Root cause was a stale `.next` Prisma client cache from a long-running `npm run dev` session. Cleared `.next` build cache, regenerated Prisma client, and all employee creation now works correctly.
- **Department Creation 409 Conflict** — Changed Department uniqueness from global `@unique` on `name` to a multi-tenant composite `@@unique([name, organizationId])`. Frontend now displays the correct server error message instead of a generic "Failed" toast.
- **Build Errors Fixed** — Resolved 4 TypeScript/JSX compile errors:
  - Unescaped `>` in `app/admin/performance/page.tsx` JSX text
  - Missing `department` field in `Score` TypeScript interface
  - Wrong `TimeSession` field names (`userId`, `startTime`, `totalWorkSec`, `totalIdleSec`) in cron worker
  - `where: { name }` on Department upserts in both `seed.ts` files (now `findFirst + create`)
- **Organization Chart Edit Fix** — Fixed a crash when editing employees on the org chart by adding missing fields (`dateOfJoining`, `email`, etc.) to the `/api/organization` response.

### Added
- **Department Deletion** — New `DELETE /api/departments/[id]` API route with employee-count guard (blocks deletion if employees are still assigned)
- **Manage Departments Modal** — The "+ New" button now opens a "Manage Departments" panel showing existing departments with individual delete buttons, plus the new department creation form
- **Autonomous Performance Monitoring Agent (Phase 6)**
  - `POST /api/cron/evaluate-performance` — AI cron worker using Gemini 2.0 Flash for weekly performance evaluation
  - `GET /api/admin/performance` — Admin performance dashboard data endpoint
  - `GET /api/employee/performance` — Employee personal performance history endpoint
  - `/admin/performance` page — Admin AI Performance Matrix dashboard
  - `/performance` page — Employee performance history portal

### Changed
- `prisma/schema.prisma` — Added `PerformanceMetrics`, `WeeklyScores`, `AgentExecutionLogs`, `Notifications`, `AdminAlerts` models
- `prisma/seed.ts` — Replaced `upsert({where:{name}})` with `findFirst + create` pattern for Department seeding

---

## [2.0.0] — 2026-02-25

### Added
- AI Chatbot with Gemini 2.0 Flash integration
- Google OAuth sign-in support
- Avatar dropdown profile menu
- Admin payroll tab with CSV/PDF export
- Real-time time tracker with check-in/break/check-out

### Fixed
- Password change loop — mustChangePassword flag now properly reset after first login
- Prisma connection pool exhaustion — singleton pattern enforced

---

## [1.0.0] — 2026-02-24

### Added
- Full Employee CRUD with role-based access
- Department management
- Zod validation on all API routes
- Redis caching layer for dashboard metrics
- Pagination on all list views
- CSV/XLSX bulk import for employees


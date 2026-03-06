# Changelog

All notable changes to EMS Pro are documented here.

---

## [4.0.0] — 2026-03-06

### Added

- **Structured Performance Reviews** — Daily and Monthly review forms with structured `formData` JSON
  - Daily: Activity metrics table (8 defaults), behavioral ratings (1-5, 6 competencies), priorities, blockers, end-of-day summary
  - Monthly: KPI scorecard (10 defaults, auto-calc % achievement, trends), competency ratings (10 areas), overall rating, goals, development plan, manager comments
  - `formType` and `formData` fields added to `PerformanceReview` model
  - New components: `DailyReviewForm.tsx`, `MonthlyReviewForm.tsx`, `ReviewDetailView.tsx`
- **Role-Scoped Performance API** — GET returns reviews based on role (CEO/HR: all, TEAM_LEAD: own + created, EMPLOYEE: own only)
- **Reviewer Tracking** — POST now records `reviewerId`, `reviewType`, `reviewPeriod` on submissions

### Changed

- `AdminPerformanceView.tsx` — Full rewrite with "Daily Review" and "Monthly Review" dialog buttons, filter tabs (All/Daily/Monthly), reviewer column, click-to-view detail
- `EmployeePerformanceView.tsx` — Full rewrite with review history table, type/reviewer columns, click-to-view structured form data
- `app/api/performance/route.ts` — Role-based GET scoping, formType/formData/reviewerId in POST
- `lib/schemas/index.ts` — Added `formType` and `formData` to `performanceReviewSchema`
- `prisma/schema.prisma` — Added `formType String?` and `formData Json?` to PerformanceReview

---

## [3.0.0] — 2026-03-04

### Added

- **RBAC Permission System** — 5 roles (CEO, HR, PAYROLL, TEAM_LEAD, EMPLOYEE) with 18-module permission matrix in `lib/permissions.ts`
- **Role-Based Dashboards** — Dedicated dashboards per role:
  - `PayrollDashboard.tsx` — Personal stats + payroll operations (payout, pending/processed/paid, PF)
  - `TeamLeadDashboard.tsx` — Personal stats + team overview (member attendance status)
  - Updated `app/page.tsx` to route by role
- **Dashboard API Role Branches** — `GET /api/dashboard` returns role-specific data (CEO/HR: admin view, PAYROLL: payroll ops, TEAM_LEAD: team data, EMPLOYEE: personal stats)
- **Custom UI Design System** — 15+ components: Card, Badge, Button, Dialog, Input, Select, Textarea, Avatar, EmptyState, Spinner, StatCard, PageHeader, Tabs, DataTable, Skeleton
- **Structured Logging** — `lib/logger.ts` with JSON logging, `logContext` (AsyncLocalStorage), `MetricsCollector` with auto-alerting
- **Session Management** — `UserSession` model with session revocation, `SessionManager` admin component
- **Normalized API Responses** — `apiSuccess()`/`apiError()` envelope pattern from `lib/api-response.ts`
- **withAuth() Middleware** — Permission-based auth with `{ module, action }` checks replacing legacy role strings
- **Data Scoping** — `scopeEmployeeQuery()` and `scopeEntityQuery()` for role-based data isolation
- **Seed Scripts** — `seed-roles.ts` for creating test users for all 5 roles

### Changed

- `lib/permissions.ts` — TEAM_LEAD no longer has EMPLOYEES module access (removed from sidebar)
- All API routes migrated to `withAuth({ module, action })` pattern
- All toasts migrated from `react-hot-toast` to `sonner`
- All inline CSS variables replaced with Tailwind design tokens

---

## [Unreleased] — 2026-02-26

### Fixed

- **Employee Creation 500 Error** — Stale `.next` Prisma client cache. Cleared cache, regenerated client.
- **Department Creation 409 Conflict** — Changed uniqueness from global `@unique` to `@@unique([name, organizationId])` for multi-tenant scoping.
- **Build Errors Fixed** — 4 TypeScript/JSX compile errors resolved (unescaped `>`, missing field, wrong field names, seed upsert pattern).
- **Organization Chart Edit Fix** — Added missing fields to `/api/organization` response.

### Added

- **Department Deletion** — `DELETE /api/departments/[id]` with employee-count guard
- **Manage Departments Modal** — Delete buttons + creation form in modal
- **Autonomous Performance Monitoring Agent**
  - `POST /api/cron/evaluate-performance` — AI cron worker using Gemini 2.0 Flash
  - Admin and employee performance data endpoints
  - `/admin/performance` and `/performance` pages

### Changed

- `prisma/schema.prisma` — Added `PerformanceMetrics`, `WeeklyScores`, `AgentExecutionLogs`, `Notifications`, `AdminAlerts` models
- Department seeding pattern changed to `findFirst + create`

---

## [2.0.0] — 2026-02-25

### Added

- AI Chatbot with Gemini 2.0 Flash integration
- Google OAuth sign-in support
- Avatar dropdown profile menu
- Admin payroll tab with CSV/PDF export
- Real-time time tracker with check-in/break/check-out

### Fixed

- Password change loop — mustChangePassword flag now properly reset
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

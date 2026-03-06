# EMS Pro — Employee Management System

## Overview
A production-grade, multi-tenant Employee Management System built with **Next.js 16**, **React 19**, **Prisma 7.4 ORM**, **PostgreSQL (Supabase)**, **NextAuth.js v5**, and **Google Gemini AI**. Features a comprehensive RBAC system with 5 roles, 18+ modules, and structured performance reviews.

## Build Status
**All TypeScript checks pass. 100+ routes compiled cleanly. 55 database models, 38 enums.**

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (Turbopack), React 19, TailwindCSS 3.4, Radix UI |
| Backend | Next.js API Routes (App Router), Prisma 7.4 |
| Database | PostgreSQL via Supabase (PrismaPg driver adapter) |
| Auth | NextAuth.js v5 (Credentials + Google OAuth + Auth0) |
| AI | Google Gemini 2.0 Flash (`@ai-sdk/google`) |
| Cache | Upstash Redis (in-memory fallback for local dev) |
| File Storage | Supabase Storage |
| Forms | react-hook-form + Zod validation |
| Charts | Recharts, Reactflow (org chart) |
| Export | XLSX, jsPDF |
| Testing | Vitest, Playwright |

---

## Features

### Core Modules
- **Employee Directory** — Full CRUD with avatar upload, bulk CSV/XLSX import
- **Department Management** — Create/delete departments with employee-guard protection
- **Teams** — Create teams, assign team leads, manage team members
- **Organization Chart** — Interactive org chart with drag-and-drop hierarchy

### HR Operations
- **Attendance & Time Tracking** — Real-time check-in/out with activity logging, break tracking, heartbeat
- **Leave Management** — Apply, approve/reject leaves with duplicate detection
- **Payroll Management** — Monthly payroll with PF calculations, CSV import/export, payslip generation
- **Provident Fund** — PF contribution tracking and management
- **Training Module** — Enroll employees in training programs, track completion

### Performance & Reviews
- **Daily Performance Reviews** — Structured forms with activity metrics, behavioral ratings (1-5), priorities, blockers
- **Monthly Performance Reviews** — KPI scorecards with auto-calculated achievement %, competency ratings, goals, development plans
- **AI Performance Monitoring** — Weekly AI-driven evaluation agent with burnout detection

### Communication & Support
- **Announcements** — Company-wide announcements
- **Help Desk Ticketing** — Employee support tickets
- **Kudos Widget** — Peer recognition system
- **AI Chatbot** — Embedded Gemini-powered HR assistant
- **Notification Center** — In-app notifications

### Admin & Compliance
- **Document Management** — Upload and manage employee documents
- **Asset Management** — Track company assets assigned to employees
- **Recruitment** — Candidate pipeline management
- **Resignation** — Resignation workflow management
- **Workflows** — Configurable approval workflows
- **Reports** — Custom report builder with scheduling and export
- **Session Manager** — Active session monitoring, revocation
- **Calendar** — Company events and scheduling

### Platform
- **RBAC** — 5 roles with 18-module permission matrix (see below)
- **Multi-tenant** — All queries scoped by `organizationId`
- **Custom UI Design System** — 15+ purpose-built components (Card, Badge, Dialog, StatCard, etc.)
- **Dark/Light Theme** — System-aware theme toggle
- **Command Palette** — Cmd+K quick navigation
- **Structured Logging** — JSON logging with request tracing, metrics collection, auto-alerting

---

## Role-Based Access Control (RBAC)

5 roles with granular module-level permissions:

| Role | Access Level |
|---|---|
| **CEO** | Full access to all 18 modules including settings and organization |
| **HR** | Employee management, attendance, leaves, training, recruitment, workflows |
| **PAYROLL** | Payroll CRUD, PF, attendance (view), reports (view/export) |
| **TEAM_LEAD** | Team overview, performance reviews (create/review), leaves (approve), tickets |
| **EMPLOYEE** | Own data: attendance, leaves, feedback, tickets, resignation |

Permission matrix defined in `lib/permissions.ts` with `hasPermission()`, `canAccessModule()`, and `scopeEmployeeQuery()` helpers.

---

## Role-Based Dashboards

Each role gets a tailored dashboard experience:

| Role | Dashboard | Key Features |
|---|---|---|
| CEO / HR | Admin Dashboard | Total employees, active/on-leave counts, department split chart, hiring trends, salary distribution, recent hires |
| PAYROLL | Payroll Dashboard | Personal stats + payroll operations (total payout, pending/processed/paid counts, PF stats), time tracker |
| TEAM_LEAD | Team Lead Dashboard | Personal stats + team overview (member list with live attendance status), quick actions (review, approve leaves) |
| EMPLOYEE | Employee Dashboard | Attendance, leave balance, training, review status, time tracker, kudos, onboarding companion |

---

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY, etc.

# Push schema to database
npx prisma db push

# Create initial admin user
node scripts/create_admin.js

# Start development server
npm run dev
```

## Environment Variables
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AUTH0_CLIENT_ID` | Auth0 client ID (optional) |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret (optional) |
| `AUTH0_ISSUER` | Auth0 issuer URL (optional) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (optional) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token (optional) |
| `CRON_SECRET` | Bearer token for cron endpoints |

---

## Default Credentials
| Role | Email | Password |
|---|---|---|
| CEO | `admin@emspro.com` | `admin123` |
| HR | `hr@emspro.com` | `password123` |
| Payroll | `payroll@emspro.com` | `password123` |
| Team Lead | `teamlead@emspro.com` | `password123` |
| Employee | `employee@emspro.com` | `password123` |

> Additional employees get auto-generated credentials: `{EmployeeCode}@{Year}` (must change on first login)

---

## Architecture
See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) for the full system design.
See [PERFORMANCE_AGENT_ARCHITECTURE.md](./PERFORMANCE_AGENT_ARCHITECTURE.md) for the AI agent design.
See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for the API reference.
See [USER_FLOWS.md](./USER_FLOWS.md) for detailed user workflows.

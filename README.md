# EMS Pro — Employee Management System

## Overview
A production-grade Employee Management System (EMS Pro) built with **Next.js 16**, **Prisma ORM**, **PostgreSQL (Supabase)**, and **Google Gemini AI**. Designed for enterprise teams with 10,000+ concurrent users in mind.

## ✅ Build Status
**All TypeScript checks pass. 72 routes compiled cleanly.**

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (Turbopack), React, TailwindCSS |
| Backend | Next.js API Routes (App Router) |
| Database | PostgreSQL via Supabase (Prisma ORM) |
| Auth | NextAuth.js v5 (Credentials + Google OAuth) |
| AI | Google Gemini 2.0 Flash (`@ai-sdk/google`) |
| Cache | Upstash Redis (in-memory fallback for local dev) |
| File Storage | Supabase Storage |

---

## Features
- 👥 **Employee Directory** — Create, edit, delete, view employees with avatar upload
- 🏢 **Department Management** — Create and delete departments with employee-guard protection
- 📆 **Attendance & Time Tracking** — Real-time check-in/out with activity logging
- 💰 **Payroll Management** — Monthly payroll with CSV import/export
- 📄 **Document Management** — Upload and manage employee documents
- 🎓 **Training Module** — Enroll employees in training programs
- 🏖️ **Leave Management** — Apply and approve leaves
- 🎫 **Help Desk Ticketing** — Employee support tickets
- 📊 **AI Performance Monitoring** — Weekly AI-driven performance evaluation agent
- 🤖 **AI Chatbot** — Embedded Gemini-powered HR assistant
- 🔐 **Role-Based Access Control** — Admin and Employee roles

---

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_GENERATIVE_AI_API_KEY

# Push schema to database
npx prisma db push

# Seed initial data
npx prisma db seed

# Start development server
npm run dev
```

## Environment Variables
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (optional) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token (optional) |
| `CRON_SECRET` | Bearer token for `/api/cron/evaluate-performance` |

---

## Default Credentials
| Role | Email | Password |
|---|---|---|
| Admin | `admin@emspro.com` | `admin123` |

> Employees get auto-generated credentials: `{EmployeeCode}@{Year}` (must change on first login)

---

## Architecture
See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) for the full system design.
See [PERFORMANCE_AGENT_ARCHITECTURE.md](./PERFORMANCE_AGENT_ARCHITECTURE.md) for the AI agent design.

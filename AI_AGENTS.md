# AI Agents — EMS Pro

## Overview

EMS Pro integrates multiple AI agents powered by **Google Gemini 2.0 Flash** (`@ai-sdk/google`). All AI endpoints are protected by `withAuth()` middleware with role-based access control.

---

## 1. AI HR Chatbot

**Endpoint:** `POST /api/chat`
**Permission:** `DASHBOARD.VIEW` (all authenticated roles)

An embedded chat assistant available to all 5 roles (CEO, HR, PAYROLL, TEAM_LEAD, EMPLOYEE). Powered by Gemini 2.0 Flash with a system prompt configuring it as a professional HR assistant.

**Features:**

- Context-aware responses based on user's role and data
- Answers HR policy questions
- Helps employees understand their leave balance, payslips, attendance
- Can create tickets on behalf of the user via chat
- AbortController timeout (15s) prevents hanging requests
- Returns proper error status codes (500, not 200) on failure

---

## 2. Autonomous Performance Monitoring Agent

**Endpoint:** `POST /api/cron/evaluate-performance`
**Trigger:** Weekly cron job or manual `Bearer {CRON_SECRET}` POST

### How It Works

```
1. Fetch all ACTIVE employees (chunked, max 50 per run)
2. For each employee:
   a. Check idempotency (evaluationHash = {employeeId}_{year}_W{week})
   b. Aggregate TimeSession data (active hours, idle hours)
   c. Calculate Rule-Based Base Score (0–100)
      - Perfect = 40 hours/week
      - Penalty: -10 if idle > 20% of active time
   d. AI Qualitative Analysis via Gemini 2.0:
      - aiAdjustment: ±20 based on behavioral patterns
      - Burnout risk detection (>50 hours/week)
      - Behavioral anomaly detection
      - Personalized feedback paragraph
   e. Compute Final Score = clamp(base + aiAdjustment, 0, 100)
   f. In a single transaction:
      - Create WeeklyScore record
      - Queue Notification (APPRECIATION if ≥90, IMPROVEMENT if ≤60)
      - Create AdminAlert if burnout or anomaly detected
3. Log execution in AgentExecutionLogs
```

### Viewing Results

| Role | Endpoint | What They See |
|---|---|---|
| CEO / HR | `GET /api/admin/performance` | All alerts + weekly scores for all employees |
| EMPLOYEE | `GET /api/employee/performance` | Personal score history only |

### Database Models

| Model | Purpose |
|---|---|
| `WeeklyScores` | Per-employee weekly evaluation results |
| `AgentExecutionLogs` | Audit trail for every agent run |
| `Notifications` | Pending messages to employees |
| `AdminAlerts` | Escalations requiring HR intervention |

### Security

- Cron endpoint protected by `Authorization: Bearer {CRON_SECRET}`
- Idempotency enforced via `evaluationHash` unique constraint
- No PII sent to Gemini: only role, score, and hours in prompt
- All results scoped by `organizationId`

---

## 3. AI Onboarding Agent

**Endpoint:** `POST /api/onboarding/agent`
**Permission:** Authenticated users (typically new EMPLOYEE role)

Assists new employees through the onboarding process, answering questions about company policy, benefits, and next steps. Displayed as an Onboarding Companion widget on the Employee Dashboard.

---

## 4. Performance Review System (Manual + AI-Enhanced)

**Endpoint:** `POST /api/performance` / `GET /api/performance`
**Permission:** `PERFORMANCE.CREATE` / `PERFORMANCE.VIEW`

In addition to the autonomous AI agent, EMS Pro supports structured **Daily** and **Monthly** performance reviews created manually by Team Leads, HR, or CEO.

### Daily Review

- 8 activity metrics (Tasks Completed, Meetings Attended, etc.) with target/actual/notes
- 6 behavioral competency ratings (1-5 scale)
- Priorities, blockers, end-of-day summary
- Overall score auto-calculated from behavioral ratings

### Monthly Review

- 10 KPI scorecard items with auto-calculated % achievement and trend
- 10 competency area ratings (1-5 scale)
- Overall performance rating (1-5: Needs Improvement → Outstanding)
- Goals & development plan, manager comments

### Role-Based Access

- **CEO/HR**: Can review any employee, see all reviews
- **TEAM_LEAD**: Can review own team members, see reviews they created + about them
- **EMPLOYEE**: Can view reviews about themselves (read-only)

---

## Configuration

```env
GEMINI_API_KEY=your-gemini-api-key
CRON_SECRET=your-cron-secret
```

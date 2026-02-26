# AI Agents — EMS Pro

## Overview
EMS Pro integrates multiple AI agents powered by **Google Gemini 2.0 Flash** (`@ai-sdk/google`).

---

## 1. AI HR Chatbot

**Endpoint:** `POST /api/chat`

An embedded chat assistant available to both admins and employees. Powered by Gemini 2.0 Flash with a system prompt configuring it as a professional HR assistant with knowledge of the employee's own data.

**Features:**
- Context-aware responses
- Answers HR policy questions
- Helps employees understand their leave balance, payslips, etc.

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

---

## 3. AI Onboarding Agent

**Endpoint:** `POST /api/onboarding/agent`

Assists new employees through the onboarding process, answering questions about company policy, benefits, and next steps.

---

## Configuration

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
CRON_SECRET=your-cron-secret
```

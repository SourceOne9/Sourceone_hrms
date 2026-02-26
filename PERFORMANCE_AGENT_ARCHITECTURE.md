# Performance Agent Architecture

## Overview
The EMS Pro Autonomous Performance Monitoring Agent is a weekly AI-driven evaluation system built on Google Gemini 2.0 Flash. It processes all ACTIVE employees without human intervention, generates performance scores, sends feedback, and escalates critical anomalies to HR.

---

## Agent Lifecycle

```
TRIGGER (Weekly Cron / Manual)
        │
        ▼
Load ACTIVE Employees (max 50 per batch)
        │
        ▼
For Each Employee:
  ├─ Idempotency Check (evaluationHash)
  ├─ Fetch TimeSession data (last 7 days)
  ├─ Calculate Base Score (rule-based)
  │   ├─ 40hr/week = 100 points baseline
  │   └─ Idle penalty: -10 if idle > 20% of active
  ├─ Gemini AI Qualitative Analysis
  │   ├─ aiAdjustment: ±20
  │   ├─ burnoutRisk: boolean (>50 hours)
  │   ├─ behavioralAnomaly: boolean
  │   └─ aiFeedback: personalized paragraph
  ├─ Compute Final Score = clamp(base + adj, 0, 100)
  └─ Atomic Transaction:
      ├─ Create WeeklyScore
      ├─ Create Notification (if score triggers one)
      └─ Create AdminAlert (if anomaly detected)
        │
        ▼
Log Execution in AgentExecutionLogs
```

---

## Scoring Rules

| Condition | Action |
|---|---|
| Base ≥ 40 hrs/week | Full 100 base |
| Idle/Active > 20% | -10 base penalty |
| AI Adj: max +20 | Bonus for quality signals |
| AI Adj: max -20 | Penalty for anomalies |
| Final ≥ 90 | APPRECIATION notification |
| Final ≤ 60 | IMPROVEMENT notification |
| Burnout or Anomaly | AdminAlert (HIGH severity) |

---

## Database Models

### WeeklyScores
```prisma
model WeeklyScores {
  id                String   @id @default(cuid())
  evaluationHash    String   @unique  // idempotency key
  employeeId        String
  weekStartDate     DateTime
  baseScore         Float
  aiAdjustment      Float
  finalScore        Float
  confidenceScore   Float
  burnoutRisk       Boolean
  behavioralAnomaly Boolean
  aiFeedback        String
  organizationId    String?
}
```

### AdminAlerts
```prisma
model AdminAlerts {
  id           String   @id @default(cuid())
  employeeId   String
  severity     AlertSeverity
  reason       String
  resolved     Boolean  @default(false)
  resolvedAt   DateTime?
  organizationId String?
}
```

---

## API Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `POST /api/cron/evaluate-performance` | Bearer CRON_SECRET | Run evaluation matrix |
| `GET /api/admin/performance` | ADMIN session | Fetch alerts + scores |
| `GET /api/employee/performance` | EMPLOYEE session | Personal score history |

---

## Security
- Cron endpoint: `Authorization: Bearer {CRON_SECRET}` required
- Idempotency: `evaluationHash = {employeeId}_{year}_W{weekNum}` (unique constraint)
- No PII sent to Gemini: only role, score, and hours are included in the prompt

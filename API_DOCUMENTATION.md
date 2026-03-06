# API Documentation

## Authentication

All protected routes require a valid NextAuth session cookie. Routes are protected by the `withAuth()` middleware (`lib/security.ts`) which enforces:

1. **Session validation** — Valid NextAuth JWT required
2. **Permission check** — `{ module, action }` verified against the RBAC permission matrix in `lib/permissions.ts`
3. **Session revocation check** — `UserSession.isRevoked` verified against database
4. **Organization scoping** — `organizationId` injected into context
5. **Employee resolution** — `employeeId` resolved eagerly for the authenticated user

### Roles

| Role | Description |
| --- | --- |
| CEO | Full access to all 18 modules |
| HR | Employee management, attendance, leaves, training, recruitment, workflows |
| PAYROLL | Payroll CRUD, PF, attendance (view), reports (view/export) |
| TEAM_LEAD | Team overview, performance reviews (create/review), leave approvals, tickets |
| EMPLOYEE | Own data only: attendance, leaves, feedback, tickets, resignation |

### Cron Routes

Require: `Authorization: Bearer {CRON_SECRET}`

### API Response Envelope

All responses use the normalized envelope from `lib/api-response.ts`:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "message": "...", "code": "VALIDATION_ERROR" } }
```

---

## Endpoints

### Dashboard

#### `GET /api/dashboard`

**Permission:** `DASHBOARD.VIEW`

Returns role-specific dashboard data:

- **CEO/HR**: Total employees, active/on-leave/resigned counts, department split, hiring trend, salary ranges, recent hires
- **PAYROLL**: Personal stats + payroll aggregates (totalPayout, pendingCount, processedCount, paidCount, PF stats)
- **TEAM_LEAD**: Personal stats + team data (members with live attendance status)
- **EMPLOYEE**: Personal stats (attendance, leaves, training, review status) + team colleagues

#### `GET /api/dashboard/logins`

**Permission:** `DASHBOARD.VIEW` (CEO/HR only) — Recent login activity.

---

### Employees

#### `GET /api/employees`

**Permission:** `EMPLOYEES.VIEW`
**Query params:** `page`, `limit`, `search`
**Response:** `{ data: Employee[], total, page, limit }`

#### `POST /api/employees`

**Permission:** `EMPLOYEES.CREATE`
Auto-creates a User account with temp password `{employeeCode}@{year}`.
**Body:** Validated by `employeeSchema`.
**Responses:** `201` Created, `400` Validation error, `409` Duplicate

#### `PUT /api/employees/{id}` — `EMPLOYEES.UPDATE`

#### `DELETE /api/employees/{id}` — `EMPLOYEES.DELETE`

#### `POST /api/employees/{id}/credentials` — `EMPLOYEES.UPDATE` — Reset temp password

---

### Performance Reviews

#### `GET /api/performance`

**Permission:** `PERFORMANCE.VIEW`
**Query params:** `employeeId`, `formType` (DAILY/MONTHLY)

Role-scoped results:

- **CEO/HR**: All reviews in organization
- **TEAM_LEAD**: Reviews they created + reviews about them
- **EMPLOYEE**: Reviews about them only

Includes `employee`, `reviewer`, `formType`, `formData` relations.

#### `POST /api/performance`

**Permission:** `PERFORMANCE.CREATE`
**Body:**

```json
{
  "employeeId": "string (required)",
  "rating": "number (0-5)",
  "formType": "DAILY | MONTHLY (optional)",
  "formData": "JSON (structured form sections)",
  "reviewPeriod": "string (e.g. 'March 2026')",
  "status": "PENDING | COMPLETED | EXCELLENT | GOOD | NEEDS_IMPROVEMENT"
}
```

`reviewerId` auto-set from authenticated user. `reviewType` defaults to `MANAGER`.

---

### Teams

#### `GET /api/teams` — `TEAMS.VIEW` — All teams in org

#### `POST /api/teams` — `TEAMS.CREATE` — Body: `{ name, description?, leadId }`

#### `GET /api/teams/{id}` — `TEAMS.VIEW` — Team with lead + members

#### `GET /api/teams/{id}/members` — `TEAMS.VIEW` — Member list with employee details

---

### Departments

#### `GET /api/departments` — Returns all departments with employee count

#### `POST /api/departments` — `EMPLOYEES.CREATE` — Body: `{ name, color? }`

#### `DELETE /api/departments/{id}` — `EMPLOYEES.DELETE` — Blocked if employees assigned (409)

---

### Time Tracker

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/time-tracker/check-in` | POST | Create new TimeSession |
| `/api/time-tracker/check-out` | POST | Close active TimeSession |
| `/api/time-tracker/break` | POST | Toggle break state |
| `/api/time-tracker/heartbeat` | POST | Idle/active telemetry |
| `/api/time-tracker/status` | GET | Current session state |
| `/api/time-tracker/history` | GET | Past sessions |

---

### AI Performance Agent

#### `POST /api/cron/evaluate-performance`

**Auth:** `Bearer {CRON_SECRET}`
Runs AI evaluation for all ACTIVE employees. Response: `{ success, batchId, processed, errors, timeMs }`

#### `GET /api/admin/performance` — CEO/HR — Alerts + scores

#### `GET /api/employee/performance` — EMPLOYEE — Personal score history

---

### Other Modules

| Route | Method | Module | Description |
| --- | --- | --- | --- |
| `/api/attendance` | GET, POST | ATTENDANCE | Attendance records |
| `/api/attendance/holidays` | GET, POST | ATTENDANCE | Holiday management |
| `/api/attendance/policy` | GET, PUT | ATTENDANCE | Attendance policy |
| `/api/attendance/shifts` | GET, POST | ATTENDANCE | Shift management |
| `/api/attendance/regularization` | GET, POST | ATTENDANCE | Regularization requests |
| `/api/leaves` | GET, POST | LEAVES | Leave applications |
| `/api/payroll` | GET, POST | PAYROLL | Payroll records |
| `/api/payroll/run` | POST | PAYROLL | Run payroll batch |
| `/api/payroll/config` | GET, PUT | PAYROLL | Payroll compliance config |
| `/api/payroll/import` | POST | PAYROLL | CSV import |
| `/api/pf` | GET, POST | PAYROLL | Provident fund records |
| `/api/training` | GET, POST | TRAINING | Training programs |
| `/api/announcements` | GET, POST | ANNOUNCEMENTS | Company announcements |
| `/api/assets` | GET, POST | ASSETS | Asset management |
| `/api/documents` | GET, POST | DOCUMENTS | Document management |
| `/api/tickets` | GET, POST | TICKETS | Help desk tickets |
| `/api/recruitment` | GET, POST | RECRUITMENT | Candidate pipeline |
| `/api/resignation` | GET, POST | RESIGNATION | Resignation workflow |
| `/api/events` | GET, POST | DASHBOARD | Calendar events |
| `/api/kudos` | GET, POST | FEEDBACK | Kudos/recognition |
| `/api/notifications` | GET | DASHBOARD | In-app notifications |
| `/api/workflows/templates` | GET, POST | WORKFLOWS | Workflow templates |
| `/api/workflows/action` | POST | WORKFLOWS | Workflow actions |
| `/api/reports` | GET, POST | REPORTS | Custom reports |
| `/api/webhooks` | GET, POST | SETTINGS | Webhook management |
| `/api/organization` | GET, PUT | ORGANIZATION | Org settings/chart |
| `/api/chat` | POST | DASHBOARD | AI chatbot relay |
| `/api/health` | GET | Public | Health check + DB status |
| `/api/admin/sessions` | GET, DELETE | SETTINGS | Session management |
| `/api/admin/metrics` | GET | REPORTS | API metrics |

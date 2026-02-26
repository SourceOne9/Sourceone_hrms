# API Documentation

## Authentication
All protected routes require a valid NextAuth session cookie. Admin routes additionally require `session.user.role === "ADMIN"`.

Cron routes require: `Authorization: Bearer {CRON_SECRET}`

---

## Endpoints

### Departments

#### `GET /api/departments`
Returns a list of all departments with employee count.

**Response:**
```json
[{ "id": "...", "name": "Engineering", "color": "...", "_count": { "employees": 12 } }]
```

#### `POST /api/departments`
**Role:** ADMIN
**Body:** `{ "name": "string (min 2 chars)", "color": "string (optional)" }`

**Responses:**
- `201` — Created department
- `400` — Validation error (Zod)
- `403` — Forbidden (not admin)
- `409` — Department with this name already exists

#### `DELETE /api/departments/{id}`
**Role:** ADMIN

**Responses:**
- `200` — `{ "success": true }`
- `403` — Forbidden
- `404` — Department not found
- `409` — Cannot delete: employees still assigned

---

### Employees

#### `GET /api/employees`
**Query params:** `page`, `limit`, `search`

**Response:** `{ data: Employee[], total, page, limit }`

#### `POST /api/employees`
**Role:** ADMIN
Auto-creates a User account and sets a temp password of `{employeeCode}@{year}`.

**Body:** Full employee fields validated by `employeeSchema`.

**Responses:**
- `201` — `{ ...employee, username, tempPassword }`
- `400` — Validation error
- `409` — Email or employeeCode already exists

#### `PUT /api/employees/{id}`
**Role:** ADMIN — Updates employee fields.

#### `DELETE /api/employees/{id}`
**Role:** ADMIN — Deletes employee and unlinks User.

#### `POST /api/employees/{id}/credentials`
**Role:** ADMIN — Resets temp password.

---

### Time Tracker

#### `POST /api/time-tracker/check-in`
**Role:** EMPLOYEE — Creates a new TimeSession.

#### `POST /api/time-tracker/check-out`
**Role:** EMPLOYEE — Closes the active TimeSession.

#### `POST /api/time-tracker/break`
**Role:** EMPLOYEE — Toggle break state.

#### `POST /api/time-tracker/heartbeat`
**Role:** EMPLOYEE — Sends idle/active telemetry.

#### `GET /api/time-tracker/status`
**Role:** EMPLOYEE — Returns current session state.

#### `GET /api/time-tracker/history`
**Role:** EMPLOYEE — Returns past sessions.

---

### Performance (AI Agent)

#### `POST /api/cron/evaluate-performance`
**Auth:** `Bearer {CRON_SECRET}`

Runs the full AI evaluation cycle for all ACTIVE employees. Generates `WeeklyScores`, sends notifications, and escalates anomalies to admins.

**Response:** `{ success, batchId, processed, errors, timeMs }`

#### `GET /api/admin/performance`
**Role:** ADMIN
Returns `{ alerts: AdminAlert[], scores: WeeklyScore[] }`

#### `GET /api/employee/performance`
**Role:** EMPLOYEE
Returns `{ scores: WeeklyScore[], notifications: Notification[] }`

---

### Dashboard

#### `GET /api/dashboard`
**Role:** ADMIN — Returns KPI metrics (cached 5 min).

#### `GET /api/dashboard/logins`
**Role:** ADMIN — Recent login activity.

---

### Other Modules

| Route | Method | Description |
|---|---|---|
| `/api/attendance` | GET, POST | Attendance records |
| `/api/leaves` | GET, POST | Leave applications |
| `/api/payroll` | GET, POST, import | Payroll records |
| `/api/performance` | GET | Performance reviews |
| `/api/documents` | GET, POST | Document management |
| `/api/recruitment` | GET, POST | Candidate pipeline |
| `/api/tickets` | GET, POST | Help desk tickets |
| `/api/training` | GET, POST | Training programs |
| `/api/chat` | POST | AI chatbot relay |

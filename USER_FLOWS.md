# User Flows — EMS Pro

## Admin User Flows

### Create Employee
1. Navigate to `/employees`
2. Click **Add Employee**
3. Fill in all fields (name, code, email, department, designation, salary, status)
4. Optionally upload avatar
5. Click **Create Employee**
6. System auto-creates login credentials: `{EmployeeCode}@{Year}`
7. Credentials card shown — copy and share with employee

### Manage Departments
1. Navigate to `/employees` → click **+ New** next to Department field
2. **Manage Departments** modal opens showing:
   - All existing departments with 🗑 Delete buttons
   - Create New form at the bottom
3. To delete: click 🗑 Delete (blocked if employees still assigned)
4. To create: type name, press Create Department

### Reset Employee Password
1. Find employee in table
2. Click 🔑 icon in Actions column
3. Confirm → new temp password generated
4. Credentials card shown for sharing

### View AI Performance Dashboard
1. Navigate to `/admin/performance`
2. Top cards show: Org Avg Score, Active Alerts, Burnout Risks, Top Performers
3. Left panel: Critical AI Escalations with Dismiss/Intervene buttons
4. Right panel: Weekly score table with base/AI adjustment/final scores

---

## Employee User Flows

### Check In / Check Out
1. Dashboard shows Time Tracker widget
2. Click **Check In** → session starts, live timer runs
3. Click **Break** → break timer starts
4. Click **Resume** → breaks ends, work timer resumes
5. Click **Check Out** → session saved

### Apply for Leave
1. Navigate to `/leave`
2. Click **Apply for Leave**
3. Fill in type, date range, reason
4. Submit → HR receives notification

### View Performance History
1. Navigate to `/performance`
2. See latest score with AI feedback
3. View historical weekly scores

### Change Password (First Login)
1. On first login, redirected to `/change-password`
2. Enter current temp password
3. Set new password
4. Redirected to dashboard

---

## Auth Flow

### Login
1. Navigate to `/login`
2. Enter email **or** employee code + password
3. Optional: Google Sign-In button
4. If `mustChangePassword = true` → force to `/change-password`
5. Redirected to dashboard based on role

### Session Expiry
- JWT-based sessions
- If session expires, middleware redirects to `/login`

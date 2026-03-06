# User Flows — EMS Pro

## CEO / HR User Flows

### Dashboard

1. Login with CEO/HR credentials
2. Dashboard shows: total employees, active/on-leave counts, department split chart, hiring trends, salary distribution, recent hires
3. Quick actions: Manage Employees, View Reports

### Create Employee

1. Navigate to `/employees`
2. Click **Add Employee**
3. Fill in all fields (name, code, email, department, designation, salary, status)
4. Optionally upload avatar
5. Click **Create Employee**
6. System auto-creates login credentials: `{EmployeeCode}@{Year}`
7. Credentials card shown — copy and share with employee

### Manage Departments

1. Navigate to `/employees` > click **+ New** next to Department field
2. **Manage Departments** modal opens showing existing departments with Delete buttons
3. To delete: click Delete (blocked if employees still assigned)
4. To create: type name, press Create Department

### Create Performance Review (CEO/HR)

1. Navigate to `/performance`
2. Click **Daily Review** or **Monthly Review** button
3. Select any employee from the organization
4. Fill in the structured form (metrics, ratings, comments)
5. Submit — review visible to employee, team lead, and other admins

### View All Performance Reviews

1. Navigate to `/performance`
2. See stats: Avg Score, Total Reviews, Pending, This Month
3. Filter by: All / Daily / Monthly tabs
4. Click any review row to view full structured form data

### Manage Teams

1. Navigate to `/teams`
2. Create team with name, description, and assigned team lead
3. Add/remove team members

### View AI Performance Dashboard

1. Navigate to `/admin/performance`
2. Top cards: Org Avg Score, Active Alerts, Burnout Risks, Top Performers
3. Left panel: Critical AI Escalations with Dismiss/Intervene buttons
4. Right panel: Weekly score table with base/AI adjustment/final scores

---

## Payroll Admin User Flows

### Dashboard

1. Login with PAYROLL credentials
2. Dashboard shows: personal stats (attendance, leave, training) + payroll operations section
3. Payroll operations: Total Payout, Pending Payrolls, PF This Month
4. Payroll Status Breakdown: progress bars for Pending/Processed/Paid
5. Time Tracker widget for own check-in/out
6. Quick actions: Run Payroll, Manage PF, Export Reports, View Leaves

### Run Payroll

1. Navigate to `/payroll`
2. Select month/year
3. Review employee payroll records
4. Process pending payrolls
5. Export to CSV/PDF

### Manage PF

1. Navigate to `/payroll` > PF tab
2. View/edit provident fund contributions
3. Import PF data via CSV

---

## Team Lead User Flows

### Dashboard

1. Login with TEAM_LEAD credentials
2. Hero banner shows team name and member count
3. Personal stats: Attendance, Leave Balance, Training, Review Status
4. Team Overview card: member list with live attendance status (Active/Away dots)
5. Time Tracker and Kudos widgets
6. Quick actions: Review Team Member, Approve Leaves, Raise Ticket, View Attendance

### Create Daily Performance Review

1. Navigate to `/performance`
2. Click **Daily Review**
3. Select team member from dropdown (only own team members shown)
4. Fill in:
   - **Activity Metrics** — 8 pre-populated rows (Tasks Completed, Meetings Attended, etc.) with Target/Actual/Notes
   - **Behavioral Ratings** — 6 competencies rated 1-5 (Communication, Collaboration, Problem Solving, etc.)
   - **Priorities** — Top 3 priorities for the day
   - **Blockers** — Challenges faced
   - **End-of-Day Summary** — Key wins + action items
5. Overall score auto-calculated from behavioral ratings average
6. Submit — review visible to the employee, HR, and CEO

### Create Monthly Performance Review

1. Navigate to `/performance`
2. Click **Monthly Review**
3. Select team member, review month, review date
4. Fill in:
   - **KPI Scorecard** — 10 pre-populated rows with Target/Actual/% Achievement (auto-calc)/Trend
   - **Competency Ratings** — 10 areas rated 1-5 (Technical, Communication, Leadership, etc.)
   - **Overall Rating** — Select 1-5 (Needs Improvement to Outstanding)
   - **Goals & Development** — Accomplishments, areas for improvement, goals for next month, training plan
   - **Manager Comments** — Overall feedback
5. Submit — review visible to the employee, HR, and CEO

### Approve Leaves

1. Navigate to `/leave`
2. View pending leave requests from team members
3. Approve or reject with comments

---

## Employee User Flows

### Dashboard

1. Login with EMPLOYEE credentials
2. Dashboard shows: personal stats (attendance, leave balance, pending training, review status)
3. Team colleagues with status (Active/Away)
4. Time Tracker widget
5. Kudos widget + Onboarding Companion (for new employees)

### Check In / Check Out

1. Dashboard shows Time Tracker widget
2. Click **Check In** — session starts, live timer runs
3. Click **Break** — break timer starts
4. Click **Resume** — break ends, work timer resumes
5. Click **Check Out** — session saved to attendance

### View Performance Reviews

1. Navigate to `/performance`
2. Hero card: Overall average rating, review count, performance rank
3. Review History table: Date, Type (Daily/Monthly), Rating, Period, Reviewer, Status
4. Click any review to view full structured form data (read-only)

### Apply for Leave

1. Navigate to `/leave`
2. Click **Apply for Leave**
3. Fill in type, date range, reason
4. Submit — team lead/HR receives notification

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
3. Optional: Google Sign-In or Auth0
4. If `mustChangePassword = true` — force redirect to `/change-password`
5. Redirected to role-specific dashboard:
   - CEO/HR → Admin Dashboard
   - PAYROLL → Payroll Dashboard
   - TEAM_LEAD → Team Lead Dashboard
   - EMPLOYEE → Employee Dashboard

### Session Management

- JWT-based sessions via NextAuth v5
- Sessions tracked in `UserSession` model
- Admins can view and revoke active sessions via `/admin/identity`
- If session expires or is revoked, middleware redirects to `/login`

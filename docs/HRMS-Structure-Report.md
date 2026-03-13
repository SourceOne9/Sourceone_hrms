# EMS Pro — HRMS Structure & Permission Report

> Generated: 13 March 2026

---

## 1. Portal Roles

The system has **5 portal roles**. Each user is assigned exactly one role that determines their access level across the platform.

| # | Portal Name | DB Enum Value | Description |
|---|-------------|---------------|-------------|
| 1 | **CEO** | `CEO` | Top-level executive with unrestricted org-wide access |
| 2 | **HR Manager** | `HR` | Human Resources — full people management, org-wide visibility |
| 3 | **Payroll Admin** | `PAYROLL` | Compensation specialist — payroll, PF, reimbursement approval |
| 4 | **Team Lead** | `TEAM_LEAD` | Mid-level manager — sees own + direct reports' data |
| 5 | **Recruiter** | `EMPLOYEE` | Standard portal user — sees own data only |

---

## 2. Modules (20)

### 2.1 People Management
| Module | Description |
|--------|-------------|
| **Employees** | Employee records — CRUD, bulk import/export (XLSX/CSV), avatar upload, credential management |
| **Teams** | Team creation, member assignment, team structure |
| **Organization** | Org chart visualization, department management |

### 2.2 Time & Leave
| Module | Description |
|--------|-------------|
| **Attendance** | Clock in/out, shift management, attendance policy, regularization requests, holiday calendar |
| **Leaves** | Leave application, approval workflow, leave balance tracking |

### 2.3 Compensation
| Module | Description |
|--------|-------------|
| **Payroll** | Payslip generation, salary calculation (basic + HRA + allowances - deductions), tax computation, PF management, bulk finalization |
| **Reimbursement** | Expense claim submission with receipt upload, category-based tracking, approval/rejection workflow, payroll integration |

### 2.4 Growth & Development
| Module | Description |
|--------|-------------|
| **Performance** | Daily & monthly reviews, AI-powered evaluation (Gemini), performance metrics & weekly scores |
| **Training** | Training programs, employee enrollment, progress tracking |
| **Feedback** | Peer-to-peer kudos, feedback submission |

### 2.5 Operations
| Module | Description |
|--------|-------------|
| **Assets** | Company asset tracking (laptops, phones, etc.), assignment to employees |
| **Documents** | Document upload (Aadhaar, PAN, bank proof), Supabase storage, category management |
| **Announcements** | Company-wide announcements, notification dispatch |
| **Help Desk (Tickets)** | Support ticket creation, status tracking, resolution workflow |

### 2.6 Administration
| Module | Description |
|--------|-------------|
| **Recruitment** | Candidate pipeline (Kanban board), application tracking |
| **Resignation** | Resignation request submission, multi-step approval with consent |
| **Reports** | Dynamic report builder (5 entity types), saved reports, CSV/PDF export |
| **Workflows** | Approval workflow templates, step-based routing |
| **Agent Tracking** | Desktop AI agent monitoring — device enrollment, activity snapshots, productivity scoring (backend ready) |
| **Settings** | System configuration, org settings |

---

## 3. Actions

| Action | Code | Description |
|--------|------|-------------|
| View | `VIEW` | Read/list data |
| Create | `CREATE` | Add new records |
| Update | `UPDATE` | Modify existing records (also used for approvals) |
| Delete | `DELETE` | Remove records |
| Review | `REVIEW` | Performance review capability |
| Assign | `ASSIGN` | Assign resources (teams, assets) to employees |
| Export | `EXPORT` | Export data to CSV/PDF/XLSX |
| Import | `IMPORT` | Bulk import from XLSX/CSV |

---

## 4. Full Permission Matrix

Legend: **V** = View, **C** = Create, **U** = Update, **D** = Delete, **R** = Review, **A** = Assign, **E** = Export, **I** = Import, **—** = No access

| Module | CEO | HR Manager | Payroll Admin | Team Lead | Recruiter |
|--------|-----|------------|---------------|-----------|-----------|
| **Dashboard** | V | V | V | V | V |
| **Employees** | V C U D E I | V C U D E I | — | — | — |
| **Teams** | V C U D A | V C U D A | — | V | V |
| **Organization** | V C U D | V C U D | — | — | — |
| **Attendance** | V | V | V | V | V C |
| **Leaves** | V U | V U | V | V U | V C |
| **Payroll** | V | V | V C U D E I | V | V |
| **Reimbursement** | V C | V C | V C U | V C | V C |
| **Performance** | V C R | V C R | — | V C R | V |
| **Training** | V C U D | V C U D | — | V | V |
| **Feedback** | V C | V C | — | V | V C |
| **Assets** | V C U D A | V C U D A | — | V | V |
| **Documents** | V C | V C | V | V | V |
| **Announcements** | V C U D | V C U D | V | V | V |
| **Tickets** | V U | V U | — | V C U | V C U |
| **Recruitment** | V C U D | V C U D | — | — | — |
| **Resignation** | V U | V U | — | V | V C |
| **Reports** | V C U D E | V C U D E | V E | — | — |
| **Workflows** | V C U D | V C U D | — | — | — |
| **Agent Tracking** | V C U D | V C U D | — | V | V |
| **Settings** | V U | V | — | — | — |

---

## 5. Data Scope & Visibility

Determines **which records** a user can see, independent of what actions they can perform.

| Role | Scope | Details |
|------|-------|---------|
| **CEO** | **All org data** | Unrestricted access to every record in the organization |
| **HR Manager** | **All org data** | Same as CEO, except cannot see CEO records in the Employees module |
| **Payroll Admin** | **Module-specific** | Full org scope for: Payroll, Attendance, Leaves, Reimbursement. Blocked on all other modules. |
| **Team Lead** | **Self + reports** | Sees own data + data of employees where `managerId` = self (direct reports) |
| **Recruiter** | **Self only** | Sees only their own records across all modules |

---

## 6. Sidebar Navigation Structure

Items are shown/hidden based on whether the user's role has **any permission** on the module.

```
Dashboard                          [All roles]
│
├── People
│   ├── Employees                  [CEO, HR]
│   ├── Teams                      [CEO, HR, Team Lead, Recruiter]
│   └── Organization               [CEO, HR]
│
├── Time & Leave
│   ├── Attendance                 [All roles]
│   └── Leave                      [All roles]
│
├── Compensation
│   ├── Payroll                    [All roles]
│   └── Reimbursement              [All roles]
│
├── Growth
│   ├── Performance                [CEO, HR, Team Lead, Recruiter]
│   ├── Training                   [CEO, HR, Team Lead, Recruiter]
│   └── Feedback                   [All roles except Payroll]
│
├── Operations
│   ├── Assets                     [CEO, HR, Team Lead, Recruiter]
│   │   ├── Admin view             [CEO, HR]
│   │   └── Employee view          [Team Lead, Recruiter]
│   ├── Documents                  [All roles]
│   │   ├── Admin view             [CEO, HR]
│   │   └── Employee view          [Team Lead, Recruiter, Payroll]
│   ├── Announcements              [All roles]
│   └── Help Desk                  [CEO, HR, Team Lead, Recruiter]
│
└── Admin
    ├── Recruitment                [CEO, HR]
    ├── Resignation                [CEO, HR, Team Lead, Recruiter]
    ├── Reports                    [CEO, HR, Payroll]
    ├── Workflows                  [CEO, HR]
    ├── Agent Tracking             [CEO, HR, Team Lead, Recruiter]
    └── Settings                   [CEO, HR]
```

---

## 7. Key Business Rules

### 7.1 Reimbursement Workflow
1. **Any portal user** can submit a reimbursement request (CREATE)
2. CEO and HR can **view all** requests org-wide but **cannot approve**
3. **Only Payroll Admin** can approve or reject requests (UPDATE permission)
4. Approved reimbursements can be **pulled into payslips** during payroll creation
5. Receipts are uploaded to Supabase Storage (`receipts` bucket) as images or PDFs

### 7.2 Leave Approval Chain
- **CEO, HR, Team Lead** can approve/reject leave requests (UPDATE on Leaves)
- **Recruiter** can only submit leave requests (CREATE)
- Team Lead only sees leaves from their direct reports

### 7.3 Payroll Processing
- **Only Payroll Admin** has full CRUD + export/import on Payroll
- CEO and HR can view payroll data but cannot create/modify
- Payroll includes: basic salary, HRA, allowances, deductions, PF, tax, reimbursements

### 7.4 Performance Reviews
- CEO, HR, and Team Lead can **create and review** performance evaluations
- Recruiter portal users can only **view** their own performance data
- AI-powered evaluation via Google Gemini 2.0 Flash

### 7.5 Reports Access
- Reports module restricted to **CEO, HR, and Payroll** portals
- Supports 5 entity types: Employee, Payroll, Attendance, Leave, Performance
- Dynamic column selection, filters, sorting, saved report templates

### 7.6 Resignation Flow
- **Recruiter** can submit resignation (CREATE) with mandatory fields: reason, last working day, handover notes, exit interview consent, feedback consent, asset return acknowledgment
- **CEO and HR** can approve/reject resignations (UPDATE)
- Team Lead can view resignations from their team

### 7.7 Multi-Tenant Isolation
- All database queries are scoped by `organizationId`
- The `withAuth()` middleware enforces authentication, role checks, and org scoping on every API route
- Uses `scopeEmployeeQuery()` and `scopeEntityQuery()` helper functions for data isolation

---

## 8. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TailwindCSS 3.4, Radix UI |
| **Backend** | Next.js API Routes, Prisma 7.4 ORM |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | NextAuth.js v5 (JWT), Google OAuth, Auth0, SCIM 2.0 |
| **File Storage** | Supabase Storage (5 buckets: avatars, documents, assets, training, receipts) |
| **Cache** | Upstash Redis (with in-memory fallback) |
| **AI** | Google Gemini 2.0 Flash (performance evaluation, chatbot) |
| **Charts** | Recharts, ReactFlow (org chart) |
| **Forms** | react-hook-form + Zod validation |
| **Export** | XLSX, jsPDF |

---

## 9. Database Overview

- **55 Prisma models** with **38 enums**
- **82 API routes** across all modules
- **41 frontend components** + **24 pages**
- Key models: Organization, User, Employee, Department, Attendance, TimeSession, Leave, Payroll, PerformanceReview, Training, Asset, Document, Ticket, Announcement, Candidate, Resignation, Reimbursement, Workflow

---

## 10. Storage Buckets

| Bucket | Purpose | Used By |
|--------|---------|---------|
| `avatars` | Employee profile photos | Employee form, profile page |
| `documents` | Identity documents (Aadhaar, PAN, bank proof) | Employee documents page |
| `assets` | Asset-related files | Asset management |
| `training` | Training materials | Training module |
| `receipts` | Reimbursement receipt uploads (images, PDFs) | Reimbursement form |

All buckets: public access, 10MB file size limit, managed via Supabase Storage Admin API.

---

*This report reflects the current state of EMS Pro as of 13 March 2026.*

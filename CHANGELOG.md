# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-02-20

### Added
-   **Full Backend API** with 17 RESTful endpoints covering all frontend modules.
-   **Prisma Schema** expanded to 18 models: `Attendance`, `Payroll`, `ProvidentFund`, `PerformanceReview`, `Training`, `TrainingEnrollment`, `Announcement`, `Ticket`, `CalendarEvent`, `Candidate`.
-   **NextAuth.js v5** integration with JWT sessions and proper type augmentation (`types/next-auth.d.ts`).
-   **API Routes** for: Employees, Assets, Documents, Departments, Attendance, Payroll, PF, Performance, Training, Leaves, Resignations, Announcements, Tickets, Events, Recruitment.
-   **Role-based access control** — Admin-only write operations; employees see only their own data.
-   **Auto-generated ticket codes** (TKT-YYYY-NNN) for help desk tickets.
-   **`.env.example`** with all required environment variables documented.
-   **`API_DOCUMENTATION.md`** with complete endpoint reference.

### Changed
-   **`README.md`** rewritten to cover full-stack architecture, backend setup, and project structure.
-   **`lib/auth.ts`** refactored to use typed NextAuth callbacks (no `any` casts).
-   **Mobile optimization** for Organization Chart page (responsive container, hidden MiniMap).

### Fixed
-   Eliminated all ESLint errors in backend API files (0 errors, 0 warnings).
-   Fixed `session.user` type safety across all API routes with proper NextAuth type augmentation.

## [0.1.0] - 2024-02-19

### Added
-   Initial project setup using Next.js 16 (App Router).
-   Authentication context with mock login for Admin and Employee roles.
-   **Dashboard**: Comprehensive overview with real-time statistics, hiring trends, and department distribution charts.
-   **Employee Management**: Perform CRUD operations on employee records (Search, Filter, Export to CSV/PDF).
-   **Calendar**: Initial implementation using `react-big-calendar` for tracking events and leaves.
-   **Time Tracker**: Widget for tracking check-in/out times.

### Fixed
-   Resolved `date-fns` v4 import compatibility issues in Calendar page.
-   Fixed TypeScript errors in `AdminDashboard` components (Recharts tooltip formatters, `PieChart` interactions).
-   Addressed missing `actions` prop in `DataTable` component causing build failures.
-   Fixed nested git repository issue with `Employee-management-syatem` directory.

### Changed
-   Updated project documentation (`README.md`, `CONTRIBUTING.md`, `LICENSE`).

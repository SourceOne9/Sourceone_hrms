# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

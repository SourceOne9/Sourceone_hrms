# EMS Pro - Employee Management System

EMS Pro is a modern, comprehensive Employee Management System designed to streamline HR operations. It offers a premium, user-friendly interface for managing employee records, attendance, payroll, and more.

## 🚀 Features

-   **Dashboard Overview**: Real-time insights into employee statistics, hiring trends, and department distribution.
-   **Employee Management**: centralized database to view, edit, and manage employee profiles.
-   **Attendance & Leave**: Track daily attendance, manage leave requests, and view calendar schedules.
-   **Payroll Management**: Manage salaries, bonuses, and generate payroll reports.
-   **Role-Based Access**: Secure login for Admins and Employees with distinct dashboards and permissions.
-   **Interactive Calendar**: Visual team calendar for holidays, leaves, and events.
-   **Responsive Design**: Built with a mobile-first approach ensuring accessibility across all devices.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Directory)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / [Radix UI](https://www.radix-ui.com/)
-   **Charts**: [Recharts](https://recharts.org/)
-   **Calendar**: [React Big Calendar](https://github.com/jquense/react-big-calendar)
-   **State Management**: React Context API
-   **Icons**: [Radix Icons](https://icons.radix-ui.com/)

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

-   Node.js (v18 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Work-Ashish/Employee-directory.git
    cd Employee-directory
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Open the application**
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Default Credentials (Local Environment)

For testing purposes, the following credentials can be used:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@emspro.com` | `admin` |
| **User** | `user@emspro.com` | `user` |

> **Note**: Passwords are currently mocked in the development environment.

## 📂 Project Structure

```
├── app/                  # Next.js App Router pages and layouts
│   ├── calendar/         # Team calendar page
│   ├── dashboard/        # Main dashboard views
│   ├── employees/        # Employee list and management
│   ├── login/            # Authentication page
│   └── ...
├── components/           # Reusable UI components
│   ├── dashboard/        # Dashboard-specific widgets
│   ├── ui/               # Core UI elements (Button, Card, Modal, etc.)
│   └── ...
├── context/              # Global state (AuthContext, etc.)
├── lib/                  # Utilities and helper functions
└── public/               # Static assets
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).

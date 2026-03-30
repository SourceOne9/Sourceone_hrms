export interface DashboardStats {
    stats: {
        totalEmployees: number
        activeEmployees: number
        onLeaveEmployees: number
        monthlyPayroll: number
        attritionRate: number
    }
    deptSplit: Array<{ name: string; count: number; value: number; color: string }>
    hiringTrend: Array<{ month: string; hires: number; details: Array<{ name: string; role: string }> }>
    salaryRanges: Array<{ range: string; count: number }>
    recentHires: Array<{ name: string; initials: string; role: string; date: string; dept: string; color: string }>
    avgSalary: number
}

export interface LoginStats {
    activeTodayCount: number
    recentLogins: Array<{ name: string; lastLoginAt: string; employee?: { designation?: string; department?: { name?: string } } }>
    totalSessions: number
    activeSessions: number
    loginsLast7Days: number
}

import { apiClient } from "@/lib/api-client"

export const DashboardAPI = {
    getStats: async (): Promise<DashboardStats> => {
        const { data } = await apiClient<DashboardStats>("/dashboard/", {
            method: "GET",
            signal: AbortSignal.timeout(30_000),
        })
        return data
    },

    getLogins: async (): Promise<LoginStats> => {
        const { data } = await apiClient<LoginStats>("/dashboard/logins/", {
            method: "GET",
            signal: AbortSignal.timeout(30_000),
        })
        return data
    },
}

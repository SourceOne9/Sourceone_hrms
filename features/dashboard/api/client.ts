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
        // Fetch dashboard stats + employee list in parallel for complete data
        const [dashRes, empRes] = await Promise.all([
            apiClient<Record<string, unknown>>("/dashboard/", { method: "GET", signal: AbortSignal.timeout(30_000) }),
            apiClient<{ results: Record<string, unknown>[]; total: number }>("/employees/?per_page=500", { method: "GET", signal: AbortSignal.timeout(30_000) }),
        ])
        const d = dashRes.data as Record<string, unknown>
        const employees = ((empRes.data as Record<string, unknown>)?.results || []) as Array<Record<string, unknown>>
        const statusCounts = (d.statusCounts || {}) as Record<string, number>
        const totalEmp = (d.totalEmployees || employees.length || 0) as number

        // Build department split from employee data
        const deptMap = new Map<string, number>()
        const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#22c55e","#14b8a6","#06b6d4","#3b82f6"]
        for (const emp of employees) {
            const dept = String(emp.department || "Unassigned")
            deptMap.set(dept, (deptMap.get(dept) || 0) + 1)
        }
        const deptSplit = [...deptMap.entries()].map(([name, count], i) => ({
            name, count, value: Math.round((count / Math.max(totalEmp, 1)) * 100),
            color: COLORS[i % COLORS.length],
        })).sort((a, b) => b.count - a.count)

        // Build hiring trend from date_of_joining (last 6 months)
        const now = new Date()
        const months: Array<{ month: string; hires: number; details: Array<{ name: string; role: string }> }> = []
        for (let i = 5; i >= 0; i--) {
            const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const label = d2.toLocaleDateString("en", { month: "short", year: "2-digit" })
            const hires = employees.filter(e => {
                const doj = e.dateOfJoining ? new Date(String(e.dateOfJoining)) : null
                return doj && doj.getMonth() === d2.getMonth() && doj.getFullYear() === d2.getFullYear()
            })
            months.push({ month: label, hires: hires.length, details: hires.map(h => ({ name: [h.firstName, h.lastName].filter(Boolean).join(" "), role: String(h.designation || "") })) })
        }

        // Build salary ranges
        const salaries = employees.map(e => Number(e.salary || 0)).filter(s => s > 0)
        const ranges = [
            { range: "0-25K", min: 0, max: 25000 },
            { range: "25K-50K", min: 25000, max: 50000 },
            { range: "50K-75K", min: 50000, max: 75000 },
            { range: "75K-1L", min: 75000, max: 100000 },
            { range: "1L+", min: 100000, max: Infinity },
        ].map(r => ({ range: r.range, count: salaries.filter(s => s >= r.min && s < r.max).length }))

        return {
            stats: {
                totalEmployees: totalEmp,
                activeEmployees: (statusCounts.active || 0),
                onLeaveEmployees: (statusCounts.onNotice || 0),
                monthlyPayroll: salaries.reduce((a, b) => a + b, 0),
                attritionRate: 0,
            },
            deptSplit,
            hiringTrend: months,
            salaryRanges: ranges,
            recentHires: ((d.recentHires || []) as Array<Record<string, unknown>>).map((h: Record<string, unknown>) => ({
                name: [h.firstName, h.lastName].filter(Boolean).join(" ") || "?",
                initials: (String(h.firstName || "?")[0] + String(h.lastName || "?")[0]).toUpperCase(),
                role: String(h.designation || ""),
                date: h.createdAt ? new Date(String(h.createdAt)).toLocaleDateString() : "",
                dept: String(h.department || ""),
                color: "from-[#007aff] to-[#5856d6]",
            })),
            avgSalary: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
        }
    },

    getLogins: async (): Promise<LoginStats> => {
        const { data } = await apiClient<LoginStats>("/dashboard/logins/", {
            method: "GET",
            signal: AbortSignal.timeout(30_000),
        })
        return data
    },
}

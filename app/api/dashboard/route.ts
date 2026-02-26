import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { redis } from "@/lib/redis"

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const cacheKey = "admin:dashboard:metrics"
        try {
            const cached = await redis.get(cacheKey)
            if (cached) {
                return NextResponse.json(typeof cached === "string" ? JSON.parse(cached) : cached)
            }
        } catch (e) {
            console.warn("Failed to read dashboard cache from Redis", e)
        }

        // 1. Employee Stats + Payroll — single parallel batch
        const [totalEmployees, activeEmployees, onLeaveEmployees, payroll] = await Promise.all([
            prisma.employee.count(),
            prisma.employee.count({ where: { status: "ACTIVE" } }),
            prisma.employee.count({ where: { status: "ON_LEAVE" } }),
            prisma.employee.aggregate({ _sum: { salary: true } }),
        ])

        // 2. Department Split
        const departments = await prisma.department.findMany({
            include: {
                _count: {
                    select: { employees: true }
                }
            }
        })

        const totalForSplit = departments.reduce((acc: number, d: any) => acc + d._count.employees, 0)
        const colors = ["#007aff", "#38bdf8", "#ec4899", "#f59e0b", "#10b981", "#af52de", "#ff2d55"]
        const deptSplit = departments.map((d: any, i: number) => ({
            name: d.name,
            value: totalForSplit > 0 ? Math.round((d._count.employees / totalForSplit) * 100) : 0,
            count: d._count.employees,
            color: colors[i % colors.length]
        }))

        // 3. Hiring Trend (Last 6 months) — SINGLE query instead of 6 sequential counts
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
        const hiringRaw = await prisma.employee.groupBy({
            by: ["dateOfJoining"],
            where: { dateOfJoining: { gte: sixMonthsAgo } },
            _count: true,
        })

        // Bucket into months
        const hiringMap = new Map<string, number>()
        for (let i = 5; i >= 0; i--) {
            hiringMap.set(format(subMonths(new Date(), i), "MMM"), 0)
        }
        for (const row of hiringRaw) {
            const month = format(new Date(row.dateOfJoining), "MMM")
            if (hiringMap.has(month)) {
                hiringMap.set(month, (hiringMap.get(month) || 0) + row._count)
            }
        }
        const hiringTrend = Array.from(hiringMap, ([month, hires]) => ({ month, hires }))

        // 4. Salary Ranges — SQL aggregation instead of loading all rows
        const salaryStats: any[] = await prisma.$queryRaw`
            SELECT 
                COUNT(*) FILTER (WHERE salary >= 30000 AND salary < 50000)::int as "range_30_50",
                COUNT(*) FILTER (WHERE salary >= 50000 AND salary < 80000)::int as "range_50_80",
                COUNT(*) FILTER (WHERE salary >= 80000 AND salary < 120000)::int as "range_80_120",
                COUNT(*) FILTER (WHERE salary >= 120000)::int as "range_120_plus",
                COALESCE(AVG(salary), 0) as avg_salary
            FROM "Employee"
        `
        const stats = salaryStats[0] || {}
        const salaryRanges = [
            { range: "30-50k", count: Number(stats.range_30_50 || 0) },
            { range: "50-80k", count: Number(stats.range_50_80 || 0) },
            { range: "80-120k", count: Number(stats.range_80_120 || 0) },
            { range: "120k+", count: Number(stats.range_120_plus || 0) },
        ]
        const avgSalary = Number(stats.avg_salary || 0)

        // 5. Recent Hires (bounded — take 5)
        const recentHiresRaw = await prisma.employee.findMany({
            take: 5,
            orderBy: { dateOfJoining: "desc" },
            include: { department: true }
        })
        const recentHires = recentHiresRaw.map((h: any) => ({
            initials: `${h.firstName[0]}${h.lastName[0]}`.toUpperCase(),
            name: `${h.firstName} ${h.lastName}`,
            role: h.designation,
            dept: h.department?.name || "Unassigned",
            date: format(h.dateOfJoining, "MMM d"),
            color: "bg-gradient-to-br from-[#3395ff] to-[#007aff]"
        }))

        const payload = {
            role: "ADMIN",
            stats: {
                totalEmployees,
                activeEmployees,
                onLeaveEmployees,
                monthlyPayroll: payroll._sum.salary || 0,
            },
            deptSplit,
            hiringTrend,
            salaryRanges,
            avgSalary,
            recentHires
        }

        try {
            await redis.set(cacheKey, payload, { ex: 300 }) // Cache for 5 minutes
        } catch (e) {
            console.warn("Failed to write dashboard cache to Redis", e)
        }

        return NextResponse.json(payload)
    } catch (error) {
        console.error("[DASHBOARD_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/admin/agent/dashboard — Agent tracking dashboard summary
export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, async (_req, ctx) => {
    try {
        const orgWhere = { organizationId: ctx.organizationId }
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Device status counts
        const deviceCounts = await prisma.agentDevice.groupBy({
            by: ["status"],
            where: orgWhere,
            _count: true,
        })

        const statusSummary = {
            active: 0, pending: 0, suspended: 0, uninstalled: 0, total: 0,
        }
        for (const row of deviceCounts) {
            const key = row.status.toLowerCase() as keyof typeof statusSummary
            statusSummary[key] = row._count
            statusSummary.total += row._count
        }

        // Today's productivity stats
        const todaySnapshots = await prisma.agentActivitySnapshot.aggregate({
            where: { session: { employee: orgWhere }, timestamp: { gte: today } },
            _avg: { productivityScore: true },
            _sum: { activeSeconds: true, idleSeconds: true, keystrokeCount: true, mouseClickCount: true },
            _count: true,
        })

        // Top apps today
        const topApps = await prisma.appUsageSummary.findMany({
            where: { ...orgWhere, date: { gte: today } },
            orderBy: { totalSeconds: "desc" },
            take: 10,
            select: { appName: true, totalSeconds: true, category: true },
        })

        // Aggregate top apps across employees
        const appMap = new Map<string, { totalSeconds: number; category: string }>()
        for (const app of topApps) {
            const existing = appMap.get(app.appName)
            if (existing) {
                existing.totalSeconds += app.totalSeconds
            } else {
                appMap.set(app.appName, { totalSeconds: app.totalSeconds, category: app.category })
            }
        }
        const aggregatedApps = Array.from(appMap.entries())
            .map(([appName, data]) => ({ appName, ...data }))
            .sort((a, b) => b.totalSeconds - a.totalSeconds)
            .slice(0, 5)

        // Top websites today
        const topWebsites = await prisma.websiteUsageSummary.findMany({
            where: { ...orgWhere, date: { gte: today } },
            orderBy: { totalSeconds: "desc" },
            take: 10,
            select: { domain: true, totalSeconds: true, category: true },
        })

        const domainMap = new Map<string, { totalSeconds: number; category: string }>()
        for (const site of topWebsites) {
            const existing = domainMap.get(site.domain)
            if (existing) {
                existing.totalSeconds += site.totalSeconds
            } else {
                domainMap.set(site.domain, { totalSeconds: site.totalSeconds, category: site.category })
            }
        }
        const aggregatedWebsites = Array.from(domainMap.entries())
            .map(([domain, data]) => ({ domain, ...data }))
            .sort((a, b) => b.totalSeconds - a.totalSeconds)
            .slice(0, 5)

        // Stale devices (no heartbeat in 10+ minutes)
        const staleThreshold = new Date(Date.now() - 10 * 60 * 1000)
        const staleDevices = await prisma.agentDevice.findMany({
            where: {
                ...orgWhere,
                status: "ACTIVE",
                OR: [
                    { lastHeartbeat: { lt: staleThreshold } },
                    { lastHeartbeat: null },
                ],
            },
            include: {
                employee: { select: { firstName: true, lastName: true } },
            },
            take: 20,
        })

        // Today's idle events count
        const idleEventCount = await prisma.idleEvent.count({
            where: { ...orgWhere, createdAt: { gte: today } },
        })

        return apiSuccess({
            devices: statusSummary,
            today: {
                avgProductivity: todaySnapshots._avg.productivityScore ?? 0,
                totalActiveSeconds: todaySnapshots._sum.activeSeconds ?? 0,
                totalIdleSeconds: todaySnapshots._sum.idleSeconds ?? 0,
                totalKeystrokes: todaySnapshots._sum.keystrokeCount ?? 0,
                totalMouseClicks: todaySnapshots._sum.mouseClickCount ?? 0,
                snapshotCount: todaySnapshots._count,
                idleEventCount,
            },
            topApps: aggregatedApps,
            topWebsites: aggregatedWebsites,
            staleDevices: staleDevices.map(d => ({
                id: d.id,
                deviceName: d.deviceName,
                employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
                lastHeartbeat: d.lastHeartbeat,
            })),
        })
    } catch (error: unknown) {
        console.error("[ADMIN_AGENT_DASHBOARD]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

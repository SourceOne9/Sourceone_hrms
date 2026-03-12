import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ActivityCategory } from "@prisma/client"

export const maxDuration = 300

// POST /api/cron/agent-aggregate — Aggregate snapshots into AppUsageSummary + WebsiteUsageSummary
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const dateStr = (body as any).date
        const date = dateStr ? new Date(dateStr) : new Date(Date.now() - 24 * 60 * 60 * 1000)
        date.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        // Get all snapshots for the date
        const snapshots = await prisma.agentActivitySnapshot.findMany({
            where: { timestamp: { gte: date, lte: dayEnd } },
            include: { device: { select: { employeeId: true, organizationId: true } } },
        })

        // Aggregate apps
        const appMap = new Map<string, { employeeId: string; organizationId: string; appName: string; category: ActivityCategory; totalSeconds: number }>()
        const siteMap = new Map<string, { employeeId: string; organizationId: string; domain: string; category: ActivityCategory; totalSeconds: number }>()

        for (const snap of snapshots) {
            if (snap.primaryApp) {
                const key = `${snap.device.employeeId}:${snap.primaryApp}`
                const existing = appMap.get(key)
                if (existing) {
                    existing.totalSeconds += snap.activeSeconds
                } else {
                    appMap.set(key, {
                        employeeId: snap.device.employeeId,
                        organizationId: snap.device.organizationId,
                        appName: snap.primaryApp,
                        category: snap.category,
                        totalSeconds: snap.activeSeconds,
                    })
                }
            }

            if (snap.primaryUrl) {
                try {
                    const domain = new URL(snap.primaryUrl.startsWith("http") ? snap.primaryUrl : `https://${snap.primaryUrl}`).hostname.replace(/^www\./, "")
                    const key = `${snap.device.employeeId}:${domain}`
                    const existing = siteMap.get(key)
                    if (existing) {
                        existing.totalSeconds += snap.activeSeconds
                    } else {
                        siteMap.set(key, {
                            employeeId: snap.device.employeeId,
                            organizationId: snap.device.organizationId,
                            domain,
                            category: snap.category,
                            totalSeconds: snap.activeSeconds,
                        })
                    }
                } catch { /* skip invalid URLs */ }
            }
        }

        // Upsert app summaries
        let appUpserts = 0
        for (const entry of appMap.values()) {
            await prisma.appUsageSummary.upsert({
                where: {
                    employeeId_date_appName: { employeeId: entry.employeeId, date, appName: entry.appName },
                },
                create: { ...entry, date },
                update: { totalSeconds: entry.totalSeconds, category: entry.category },
            })
            appUpserts++
        }

        // Upsert website summaries
        let siteUpserts = 0
        for (const entry of siteMap.values()) {
            await prisma.websiteUsageSummary.upsert({
                where: {
                    employeeId_date_domain: { employeeId: entry.employeeId, date, domain: entry.domain },
                },
                create: { ...entry, date },
                update: { totalSeconds: entry.totalSeconds, category: entry.category },
            })
            siteUpserts++
        }

        return NextResponse.json({
            success: true,
            date: date.toISOString().split("T")[0],
            snapshotsProcessed: snapshots.length,
            appSummaries: appUpserts,
            websiteSummaries: siteUpserts,
        })
    } catch (error) {
        console.error("[CRON_AGENT_AGGREGATE]", error)
        return NextResponse.json({ error: "Failed to aggregate" }, { status: 500 })
    }
}

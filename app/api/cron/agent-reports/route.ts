import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateDailyReport } from "@/lib/agent-report-generator"

export const maxDuration = 300

// POST /api/cron/agent-reports — Generate daily reports for all active-device employees
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const dateStr = (body as any).date
        const date = dateStr ? new Date(dateStr) : new Date(Date.now() - 24 * 60 * 60 * 1000) // default: yesterday
        date.setHours(0, 0, 0, 0)

        // Find employees with active devices
        const employees = await prisma.agentDevice.findMany({
            where: { status: "ACTIVE" },
            select: { employeeId: true },
            distinct: ["employeeId"],
        })

        let processed = 0
        let errors = 0

        for (const { employeeId } of employees) {
            try {
                await generateDailyReport(employeeId, date)
                processed++
            } catch (err) {
                console.error(`[CRON_REPORT] Error for employee ${employeeId}:`, err)
                errors++
            }
        }

        return NextResponse.json({
            success: true,
            date: date.toISOString().split("T")[0],
            processed,
            errors,
        })
    } catch (error) {
        console.error("[CRON_AGENT_REPORTS]", error)
        return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 })
    }
}

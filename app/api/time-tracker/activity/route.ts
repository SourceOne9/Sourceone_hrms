import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

export async function POST(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { appName, windowTitle, url, domain, category } = await req.json()

        const session = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: { in: ["ACTIVE", "BREAK"] } }
        })
        if (!session) {
            return NextResponse.json({ error: "No active session" }, { status: 404 })
        }

        // Wrap close+create in a transaction to prevent orphaned states
        const result = await prisma.$transaction(async (tx) => {
            // Close the previous activity if same session
            const lastActivity = await tx.activityLog.findFirst({
                where: { sessionId: session.id, endedAt: null },
                orderBy: { startedAt: "desc" }
            })

            if (lastActivity) {
                const durationSec = Math.floor((Date.now() - new Date(lastActivity.startedAt).getTime()) / 1000)
                await tx.activityLog.update({
                    where: { id: lastActivity.id },
                    data: { endedAt: new Date(), durationSec }
                })
            }

            // Skip creating a duplicate if same app+url
            if (lastActivity && lastActivity.appName === appName && lastActivity.url === url) {
                // Reopen the same activity instead
                return await tx.activityLog.update({
                    where: { id: lastActivity.id },
                    data: { endedAt: null, durationSec: 0 }
                })
            }

            return await tx.activityLog.create({
                data: {
                    sessionId: session.id,
                    appName: appName || "Unknown",
                    windowTitle,
                    url,
                    domain,
                    category: category || "OTHER",
                }
            })
        })

        return NextResponse.json(result, { status: 201 })
    } catch (error: unknown) {
        console.error("[TIME_TRACKER_ACTIVITY]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

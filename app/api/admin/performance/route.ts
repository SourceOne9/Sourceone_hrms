import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session || session.user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        // Fetch unresolved Admin Alerts
        const alerts = await prisma.adminAlerts.findMany({
            where: { resolved: false },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                        designation: true,
                        department: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        // Fetch latest Weekly Scores
        // Group by employee and get the latest evaluation
        const scores = await prisma.weeklyScores.findMany({
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                        designation: true,
                        department: { select: { name: true } }
                    }
                }
            },
            take: 100,
            orderBy: { weekStartDate: "desc" }
        })

        // Format for frontend
        const formattedAlerts = alerts.map(a => ({
            id: a.id,
            employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
            avatarUrl: a.employee.avatarUrl,
            designation: a.employee.designation,
            department: a.employee.department?.name || 'Unassigned',
            severity: a.severity,
            reason: a.reason,
            createdAt: a.createdAt.toISOString()
        }))

        const formattedScores = scores.map(s => ({
            id: s.id,
            employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
            avatarUrl: s.employee.avatarUrl,
            designation: s.employee.designation,
            baseScore: Number(s.baseScore),
            aiAdjustment: Number(s.aiAdjustment),
            finalScore: Number(s.finalScore),
            burnoutRisk: s.burnoutRisk,
            behavioralAnomaly: s.behavioralAnomaly,
            weekStartDate: s.weekStartDate.toISOString()
        }))

        return NextResponse.json({ alerts: formattedAlerts, scores: formattedScores })

    } catch (error) {
        console.error("[ADMIN_PERFORMANCE_GET]", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

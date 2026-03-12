import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

export async function POST(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { action, reason } = await req.json() as { action: "start" | "end"; reason?: string }

        const session = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: { in: ["ACTIVE", "BREAK"] } }
        })
        if (!session) {
            return NextResponse.json({ error: "No active session" }, { status: 404 })
        }

        if (action === "start") {
            const breakEntry = await prisma.$transaction(async (tx) => {
                // Close any existing open break first
                await tx.breakEntry.updateMany({
                    where: { sessionId: session.id, endedAt: null },
                    data: { endedAt: new Date() }
                })

                const entry = await tx.breakEntry.create({
                    data: {
                        sessionId: session.id,
                        reason: reason || "break",
                    }
                })

                await tx.timeSession.update({
                    where: { id: session.id },
                    data: { status: "BREAK" }
                })

                return entry
            })

            return NextResponse.json(breakEntry, { status: 201 })
        } else {
            await prisma.$transaction(async (tx) => {
                // End break
                const openBreak = await tx.breakEntry.findFirst({
                    where: { sessionId: session.id, endedAt: null }
                })
                if (openBreak) {
                    await tx.breakEntry.update({
                        where: { id: openBreak.id },
                        data: { endedAt: new Date() }
                    })
                }

                await tx.timeSession.update({
                    where: { id: session.id },
                    data: { status: "ACTIVE" }
                })
            })

            return NextResponse.json({ message: "Break ended" })
        }
    } catch (error: unknown) {
        console.error("[TIME_TRACKER_BREAK]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

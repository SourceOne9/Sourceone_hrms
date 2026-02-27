import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"
import { headers } from "next/headers"

export async function POST() {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const headersList = await headers()
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        // Fetch Policy, Shift Assignment, and Holidays
        const [policy, shiftAssignment, holiday] = await Promise.all([
            prisma.attendancePolicy.findUnique({ where: { organizationId: employee.organizationId } }),
            prisma.shiftAssignment.findFirst({
                where: {
                    employeeId: employee.id,
                    startDate: { lte: now },
                    OR: [{ endDate: null }, { endDate: { gte: now } }]
                },
                include: { shift: true }
            }),
            prisma.holiday.findFirst({ where: { organizationId: employee.organizationId, date: startOfDay } })
        ])

        // Fallback policy if none exists
        const effectivePolicy = policy || { lateGracePeriod: 15, earlyExitGrace: 15, otThreshold: 60 } as any

        // Use a transaction to atomically check + create (prevents TOCTOU race)
        const result = await prisma.$transaction(async (tx) => {
            // Check for already-active session inside the transaction
            const existing = await tx.timeSession.findFirst({
                where: { employeeId: employee.id, status: "ACTIVE" }
            })
            if (existing) {
                return { alreadyExists: true, session: existing }
            }

            const session = await tx.timeSession.create({
                data: {
                    employeeId: employee.id,
                    checkIn: now,
                    ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown",
                    userAgent: headersList.get("user-agent") || "unknown",
                }
            })

            // Synchronize with Attendance record for the day
            const attendance = await tx.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    date: startOfDay
                }
            })

            // Policy Evaluation
            let isLate = false
            let status: any = "PRESENT"

            if (holiday) {
                status = "HOLIDAY"
            } else if (shiftAssignment) {
                const dayOfWeek = now.getDay()
                if (!shiftAssignment.shift.workDays.includes(dayOfWeek)) {
                    status = "WEEKEND"
                } else {
                    const shiftStart = new Date(now)
                    const [h, m] = shiftAssignment.shift.startTime.split(":").map(Number)
                    shiftStart.setHours(h, m, 0, 0)

                    const lateMinutes = (now.getTime() - shiftStart.getTime()) / (1000 * 60)
                    isLate = lateMinutes > effectivePolicy.lateGracePeriod
                }
            }

            if (!attendance) {
                await tx.attendance.create({
                    data: {
                        employeeId: employee.id,
                        organizationId: employee.organizationId,
                        date: startOfDay,
                        checkIn: now,
                        status,
                        isLate
                    }
                })
            } else {
                // If attendance already exists (e.g. checked out and back in), update it
                await tx.attendance.update({
                    where: { id: attendance.id },
                    data: { checkIn: attendance.checkIn || now }
                })
            }

            return { alreadyExists: false, session }
        })

        if (result.alreadyExists) {
            return NextResponse.json({ error: "Already checked in", session: result.session }, { status: 409 })
        }

        return NextResponse.json(result.session, { status: 201 })
    } catch (error: any) {
        console.error("[TIME_TRACKER_CHECKIN]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

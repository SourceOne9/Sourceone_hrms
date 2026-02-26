import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { attendanceSchema } from "@/lib/schemas"

// GET /api/attendance – List attendance records
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const date = searchParams.get("date")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = {}
        if (date) where.date = new Date(date)
        if (employeeId) where.employeeId = employeeId

        const records = await prisma.attendance.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, department: { select: { name: true } } } } },
            orderBy: { date: "desc" },
            take: 200,
        })

        return NextResponse.json(records)
    } catch (error) {
        console.error("[ATTENDANCE_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/attendance – Check in / Create record
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = attendanceSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        let employeeId = parsed.data.employeeId
        if (!employeeId) {
            const employee = await prisma.employee.findFirst({
                where: { userId: session.user?.id },
            })
            if (!employee) {
                return NextResponse.json({ error: "No employee profile linked to your account" }, { status: 400 })
            }
            employeeId = employee.id
        } else if (session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Only admins can create attendance for other employees" }, { status: 403 })
        }

        const record = await prisma.attendance.create({
            data: {
                date: parsed.data.date || new Date(),
                checkIn: parsed.data.checkIn || null,
                checkOut: parsed.data.checkOut || null,
                workHours: parsed.data.workHours || null,
                status: parsed.data.status || "PRESENT",
                employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(record, { status: 201 })
    } catch (error) {
        console.error("[ATTENDANCE_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

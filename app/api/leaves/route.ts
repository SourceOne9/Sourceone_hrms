import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { leaveSchema, updateLeaveSchema } from "@/lib/schemas"

// Safe employee select — no salary, bank, Aadhaar, PAN etc.
const SAFE_EMPLOYEE_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    employeeCode: true,
    designation: true,
    department: { select: { name: true } },
} as const

// GET /api/leaves – List leave requests
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 100)
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = {}
        if (status) where.status = status
        if (employeeId) where.employeeId = employeeId

        // Non-admin: only own leaves
        if (session.user?.role !== "ADMIN") {
            const emp = await prisma.employee.findFirst({
                where: { userId: session.user?.id },
                select: { id: true },
            })
            if (!emp) return NextResponse.json({ error: "No employee profile linked" }, { status: 400 })
            where.employeeId = emp.id
        }

        const [leaves, total] = await prisma.$transaction([
            prisma.leave.findMany({
                where,
                include: { employee: { select: SAFE_EMPLOYEE_SELECT } },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.leave.count({ where }),
        ])

        return NextResponse.json({ data: leaves, total, page, limit })
    } catch (error) {
        console.error("[LEAVES_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/leaves – Submit a leave request
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = leaveSchema.safeParse(body)
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
            return NextResponse.json({ error: "Only admins can create leave for other employees" }, { status: 403 })
        }

        // K8: Duplicate check — prevent double-submit for overlapping dates
        const startDate = parsed.data.startDate
        const endDate = parsed.data.endDate

        const existing = await prisma.leave.findFirst({
            where: {
                employeeId,
                status: "PENDING",
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
        })
        if (existing) {
            return NextResponse.json(
                { error: "A pending leave request already exists for these dates" },
                { status: 409 }
            )
        }

        const leave = await prisma.leave.create({
            data: {
                type: parsed.data.type,
                startDate,
                endDate,
                reason: parsed.data.reason,
                status: "PENDING",
                employeeId,
            },
            include: { employee: { select: SAFE_EMPLOYEE_SELECT } },
        })

        return NextResponse.json(leave, { status: 201 })
    } catch (error) {
        console.error("[LEAVES_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/leaves – Approve/Reject a leave
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const parsed = updateLeaveSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        // K13: Optimistic locking — only update if still PENDING
        const leave = await prisma.leave.updateMany({
            where: { id: parsed.data.id, status: "PENDING" },
            data: { status: parsed.data.status },
        })

        if (leave.count === 0) {
            return NextResponse.json(
                { error: "Leave request has already been processed" },
                { status: 409 }
            )
        }

        // Fetch the updated leave to return
        const updated = await prisma.leave.findUnique({
            where: { id: parsed.data.id },
            include: { employee: { select: SAFE_EMPLOYEE_SELECT } },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("[LEAVES_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

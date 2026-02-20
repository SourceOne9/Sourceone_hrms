import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/tickets – List help desk tickets
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = {}
        if (status) where.status = status
        if (employeeId) where.employeeId = employeeId
        if (session.user?.role !== "ADMIN") where.employeeId = session.user?.id

        const tickets = await prisma.ticket.findMany({
            where,
            include: { employee: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(tickets)
    } catch (error) {
        console.error("[TICKETS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/tickets – Create a ticket
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        // Auto-generate ticket code
        const count = await prisma.ticket.count()
        const ticketCode = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`

        const ticket = await prisma.ticket.create({
            data: {
                ticketCode,
                subject: body.subject,
                description: body.description,
                category: body.category,
                priority: body.priority || "MEDIUM",
                status: "OPEN",
                employeeId: body.employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(ticket, { status: 201 })
    } catch (error) {
        console.error("[TICKETS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/tickets – Update ticket status
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        const ticket = await prisma.ticket.update({
            where: { id: body.id },
            data: {
                status: body.status,
                priority: body.priority,
            },
            include: { employee: true },
        })

        return NextResponse.json(ticket)
    } catch (error) {
        console.error("[TICKETS_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

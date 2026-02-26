import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { candidateSchema } from "@/lib/schemas"

// GET /api/recruitment – List candidates
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const stage = searchParams.get("stage")

        const where: Record<string, unknown> = {}
        if (stage) where.stage = stage

        const candidates = await prisma.candidate.findMany({
            where,
            include: { department: true },
            orderBy: { createdAt: "desc" },
            take: 200,
        })

        return NextResponse.json(candidates)
    } catch (error) {
        console.error("[RECRUITMENT_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/recruitment – Add a candidate
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const parsed = candidateSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        const candidate = await prisma.candidate.create({
            data: {
                name: parsed.data.name,
                email: parsed.data.email,
                phone: parsed.data.phone,
                role: parsed.data.role,
                stage: parsed.data.stage,
                status: parsed.data.status,
                interviewDate: parsed.data.interviewDate,
                notes: parsed.data.notes,
                departmentId: parsed.data.departmentId,
            },
            include: { department: true },
        })

        return NextResponse.json(candidate, { status: 201 })
    } catch (error) {
        console.error("[RECRUITMENT_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/recruitment – Update candidate stage/status
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        // We can reuse candidateSchema with .partial() for updates
        const partialParsed = candidateSchema.partial().safeParse(body)
        if (!partialParsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: partialParsed.error.format() },
                { status: 400 }
            )
        }

        const candidate = await prisma.candidate.update({
            where: { id: body.id },
            data: {
                stage: partialParsed.data.stage,
                status: partialParsed.data.status,
                interviewDate: partialParsed.data.interviewDate,
                notes: partialParsed.data.notes,
            },
            include: { department: true },
        })

        return NextResponse.json(candidate)
    } catch (error) {
        console.error("[RECRUITMENT_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

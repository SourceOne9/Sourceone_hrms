import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/training – List all trainings
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const trainings = await prisma.training.findMany({
            include: {
                enrollments: {
                    include: { employee: true },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(trainings)
    } catch (error) {
        console.error("[TRAINING_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/training – Create a training
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const training = await prisma.training.create({
            data: {
                name: body.name,
                type: body.type,
                description: body.description,
                status: body.status || "UPCOMING",
                progress: parseInt(body.progress || "0"),
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                participants: parseInt(body.participants || "0"),
            },
        })

        return NextResponse.json(training, { status: 201 })
    } catch (error) {
        console.error("[TRAINING_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { trainingSchema } from "@/lib/schemas"

// GET /api/training – List all trainings
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")

        const trainings = await prisma.training.findMany({
            where: employeeId ? {
                enrollments: {
                    some: { employeeId }
                }
            } : {},
            include: {
                enrollments: {
                    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
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
        console.log("Session User Role:", (session?.user as any)?.role)

        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        console.log("POST Body:", body)

        const parsed = trainingSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        const { assignedEmployeeIds, assignToAll } = body

        const training = await (prisma.training as any).create({
            data: {
                name: parsed.data.name,
                type: parsed.data.type,
                description: parsed.data.description,
                status: "UPCOMING",
                progress: 0,
                dueDate: parsed.data.dueDate,
                participants: 0, // Will be updated by enrollments
                videoUrl: parsed.data.videoUrl,
            },
        })

        // Handle Assignments
        let targetEmployeeIds: string[] = []
        if (assignToAll) {
            const allEmployees = await prisma.employee.findMany({
                where: { status: "ACTIVE" },
                select: { id: true }
            })
            targetEmployeeIds = allEmployees.map((e: { id: string }) => e.id)
        } else if (assignedEmployeeIds && Array.isArray(assignedEmployeeIds)) {
            targetEmployeeIds = assignedEmployeeIds
        }

        if (targetEmployeeIds.length > 0) {
            await prisma.trainingEnrollment.createMany({
                data: targetEmployeeIds.map(empId => ({
                    trainingId: training.id,
                    employeeId: empId,
                    completed: false,
                })),
                skipDuplicates: true
            })

            // Update participant count
            await prisma.training.update({
                where: { id: training.id },
                data: { participants: targetEmployeeIds.length }
            })
        }

        return NextResponse.json(training, { status: 201 })
    } catch (error: any) {
        console.error("[TRAINING_POST] Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/training – Update a training
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const { id, assignedEmployeeIds, assignToAll, ...data } = body

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        const training = await (prisma.training as any).update({
            where: { id },
            data: {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                progress: data.progress !== undefined ? parseInt(data.progress) : undefined,
                participants: data.participants !== undefined ? parseInt(data.participants) : undefined,
            },
        })

        // Handle Assignments (Additive)
        let targetEmployeeIds: string[] = []
        if (assignToAll) {
            const allEmployees = await prisma.employee.findMany({
                where: { status: "ACTIVE" },
                select: { id: true }
            })
            targetEmployeeIds = allEmployees.map((e: { id: string }) => e.id)
        } else if (assignedEmployeeIds && Array.isArray(assignedEmployeeIds)) {
            targetEmployeeIds = assignedEmployeeIds
        }

        if (targetEmployeeIds.length > 0) {
            await prisma.trainingEnrollment.createMany({
                data: targetEmployeeIds.map(empId => ({
                    trainingId: id,
                    employeeId: empId,
                    completed: false,
                })),
                skipDuplicates: true
            })

            // Recalculate participant count
            const count = await prisma.trainingEnrollment.count({
                where: { trainingId: id }
            })
            await prisma.training.update({
                where: { id },
                data: { participants: count }
            })
        }

        return NextResponse.json(training)
    } catch (error) {
        console.error("[TRAINING_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/training – Delete a training
export async function DELETE(req: Request) {
    try {
        const session = await auth()
        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        // Delete enrollments first
        await prisma.trainingEnrollment.deleteMany({
            where: { trainingId: id }
        })

        await prisma.training.delete({
            where: { id },
        })

        return NextResponse.json({ message: "Training deleted" })
    } catch (error) {
        console.error("[TRAINING_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

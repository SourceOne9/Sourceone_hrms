import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/organization
export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            include: { department: true }, // Include department to get colors
            orderBy: { createdAt: "asc" },
        })

        return NextResponse.json(employees)
    } catch (error) {
        console.error("[ORGANIZATION_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/organization
// Accept drag and drop updates to manager hierarchy
export async function PUT(req: Request) {
    try {
        const updates = await req.json()

        // Ensure updates is an array of { id: string, managerId: string | null }
        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: "Invalid payload format." }, { status: 400 })
        }

        // Use a transaction to perform all updates Atomically
        const operations = updates.map(update =>
            prisma.employee.update({
                where: { id: update.id },
                data: { managerId: update.managerId }
            })
        )

        // Ensure we don't accidentally create circular dependencies
        // A robust solution would do a graph cycle check here, but we trust the UI for now.

        await prisma.$transaction(operations)

        return NextResponse.json({ success: true, updatedCount: operations.length })
    } catch (error) {
        console.error("[ORGANIZATION_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

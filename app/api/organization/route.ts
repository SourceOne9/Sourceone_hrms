import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/organization
export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                employeeCode: true,
                email: true,
                phone: true,
                dateOfJoining: true,
                salary: true,
                status: true,
                avatarUrl: true,
                managerId: true,
                departmentId: true,
                department: { select: { id: true, name: true, color: true } },
            },
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

        // K9: Cycle detection — walk up the manager chain to ensure no circular dependencies
        for (const update of updates) {
            if (!update.managerId || update.managerId === update.id) {
                if (update.managerId === update.id) {
                    return NextResponse.json({ error: `Employee cannot be their own manager` }, { status: 400 })
                }
                continue
            }

            // Build a map of proposed changes
            const proposedManagers = new Map(updates.map((u: any) => [u.id, u.managerId]))

            // Walk up the chain from the proposed manager
            let current = update.managerId
            const visited = new Set<string>([update.id])
            let depth = 0

            while (current && depth < 50) {
                if (visited.has(current)) {
                    return NextResponse.json(
                        { error: `Circular dependency detected: assigning this manager would create a loop` },
                        { status: 400 }
                    )
                }
                visited.add(current)
                // Check proposed changes first, then DB
                if (proposedManagers.has(current)) {
                    current = proposedManagers.get(current) || null
                } else {
                    const parent = await prisma.employee.findUnique({
                        where: { id: current },
                        select: { managerId: true }
                    })
                    current = parent?.managerId || null
                }
                depth++
            }
        }

        // Use a transaction to perform all updates atomically
        const operations = updates.map((update: any) =>
            prisma.employee.update({
                where: { id: update.id },
                data: { managerId: update.managerId }
            })
        )

        await prisma.$transaction(operations)

        return NextResponse.json({ success: true, updatedCount: operations.length })
    } catch (error) {
        console.error("[ORGANIZATION_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

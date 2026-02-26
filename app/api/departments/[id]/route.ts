import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// DELETE /api/departments/[id] – Delete a department
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        // Check if any employees are still assigned to this department
        const employeeCount = await prisma.employee.count({
            where: { departmentId: id }
        })

        if (employeeCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete department", details: `${employeeCount} employee(s) are still assigned to this department. Reassign them first.` },
                { status: 409 }
            )
        }

        await prisma.department.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("[DEPARTMENT_DELETE]", error)
        if (error.code === "P2025") {
            return NextResponse.json({ error: "Department not found" }, { status: 404 })
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

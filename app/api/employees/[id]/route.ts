import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/employees/[id] – Get single employee
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                assets: true,
                documents: true,
                leaves: true,
                resignations: true,
            },
        })

        if (!employee) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }

        return NextResponse.json(employee)
    } catch (error) {
        console.error("[EMPLOYEE_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/employees/[id] – Update employee
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await req.json()

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                ...body,
                ...(body.dateOfJoining && { dateOfJoining: new Date(body.dateOfJoining) }),
                ...(body.salary && { salary: parseFloat(body.salary) }),
            },
            include: { department: true },
        })

        return NextResponse.json(employee)
    } catch (error) {
        console.error("[EMPLOYEE_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/employees/[id] – Delete employee
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        await prisma.employee.delete({ where: { id } })

        return NextResponse.json({ message: "Deleted" })
    } catch (error) {
        console.error("[EMPLOYEE_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

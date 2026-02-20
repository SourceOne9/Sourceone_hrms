import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/employees – List all employees
export async function GET() {
    try {
        // Disabled Auth check for Dashboard UI mock:
        // const session = await auth()
        // if (!session) {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        // }

        const employees = await prisma.employee.findMany({
            include: { department: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(employees)
    } catch (error) {
        console.error("[EMPLOYEES_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/employees – Create a new employee
export async function POST(req: Request) {
    try {
        // Disabled Auth check for Dashboard UI mock:
        // const session = await auth()
        // if (!session || session.user?.role !== "ADMIN") {
        //     return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        // }

        const body = await req.json()
        const {
            employeeCode,
            firstName,
            lastName,
            email,
            phone,
            designation,
            departmentId,
            dateOfJoining,
            salary,
            status,
            address,
        } = body

        const employee = await prisma.employee.create({
            data: {
                employeeCode,
                firstName,
                lastName,
                email,
                phone,
                designation,
                departmentId,
                dateOfJoining: new Date(dateOfJoining),
                salary: parseFloat(salary),
                status: status || "ACTIVE",
                address,
            },
            include: { department: true },
        })

        return NextResponse.json(employee, { status: 201 })
    } catch (error) {
        console.error("[EMPLOYEES_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

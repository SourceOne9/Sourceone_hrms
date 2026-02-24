import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET /api/employees – List all employees
export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                department: true,
                user: { select: { lastLoginAt: true, mustChangePassword: true } },
            },
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(employees)
    } catch (error) {
        console.error("[EMPLOYEES_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/employees – Create a new employee + auto-create login credentials
export async function POST(req: Request) {
    try {
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
            managerId,
        } = body

        // Generate temp password: EmployeeCode@Year (e.g. EMP001@2026)
        const year = new Date().getFullYear()
        const tempPassword = `${employeeCode}@${year}`
        const hashedPassword = await bcrypt.hash(tempPassword, 12)

        // Create User account first
        const user = await prisma.user.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                hashedPassword,
                role: "EMPLOYEE",
                mustChangePassword: true,
            },
        })

        // Create Employee and link to User
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
                managerId: managerId || null,
                userId: user.id,
            },
            include: { department: true },
        })

        // Return employee + temp credentials (one-time only)
        return NextResponse.json(
            { ...employee, tempPassword, username: employeeCode },
            { status: 201 }
        )
    } catch (error) {
        console.error("[EMPLOYEES_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

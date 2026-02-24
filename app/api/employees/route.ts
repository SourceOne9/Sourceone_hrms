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

        // Use a transaction to ensure both User and Employee are created or none
        const result = await prisma.$transaction(async (tx) => {
            // Create User account first
            const user = await tx.user.create({
                data: {
                    name: `${firstName} ${lastName}`,
                    email,
                    hashedPassword,
                    role: "EMPLOYEE",
                    mustChangePassword: true,
                    avatar: body.avatarUrl || null,
                },
            })

            // Create Employee and link to User
            const employee = await tx.employee.create({
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
                    avatarUrl: body.avatarUrl || null,
                },
                include: { department: true },
            })

            return { ...employee, tempPassword, username: employeeCode }
        })

        // Return employee + temp credentials (one-time only)
        return NextResponse.json(result, { status: 201 })
    } catch (error: any) {
        console.error("[EMPLOYEES_POST] FULL ERROR:", error)

        // Handle unique constraint violations (Prisma P2002)
        if (error.code === 'P2002') {
            const target = error.meta?.target || []
            let message = "A conflict occurred."

            if (target.includes('email')) {
                message = "An account or employee with this email already exists."
            } else if (target.includes('employeeCode')) {
                message = "An employee with this code already exists."
            }

            return NextResponse.json(
                { error: "Conflict", details: message },
                { status: 409 }
            )
        }

        // Handle foreign key constraint violations (Prisma P2003)
        if (error.code === 'P2003') {
            return NextResponse.json(
                { error: "Foreign Key Error", details: "Invalid department or manager selected." },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        )
    }
}

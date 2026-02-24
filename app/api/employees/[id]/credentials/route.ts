import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

interface RouteParams { params: Promise<{ id: string }> }

// GET /api/employees/:id/credentials
export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const { id } = await params

        const employee = await prisma.employee.findUnique({ where: { id } })
        if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })
        if (!employee.userId) return NextResponse.json({ error: "No user account linked" }, { status: 404 })

        const user = await prisma.user.findUnique({
            where: { id: employee.userId },
            select: { mustChangePassword: true, lastLoginAt: true },
        })
        if (!user) return NextResponse.json({ error: "User account not found" }, { status: 404 })

        return NextResponse.json({
            username: employee.employeeCode,
            hasPendingLogin: user.mustChangePassword,
            lastLoginAt: user.lastLoginAt,
        })
    } catch (error) {
        console.error("[CREDENTIALS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/employees/:id/credentials – reset credentials
export async function POST(_req: Request, { params }: RouteParams) {
    try {
        const { id } = await params

        const employee = await prisma.employee.findUnique({ where: { id } })
        if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })
        if (!employee.userId) return NextResponse.json({ error: "No user account linked" }, { status: 404 })

        const year = new Date().getFullYear()
        const tempPassword = `${employee.employeeCode}@${year}`
        const hashedPassword = await bcrypt.hash(tempPassword, 12)

        await prisma.user.update({
            where: { id: employee.userId },
            data: { hashedPassword, mustChangePassword: true },
        })

        return NextResponse.json({
            username: employee.employeeCode,
            tempPassword,
            message: "Credentials reset successfully",
        })
    } catch (error) {
        console.error("[CREDENTIALS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

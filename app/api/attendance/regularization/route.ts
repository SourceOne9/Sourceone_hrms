import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { regularizationSchema } from "@/lib/schemas/attendance"
import { getSessionEmployee } from "@/lib/session-employee"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        const employee = await getSessionEmployee()
        if (!session?.user || !employee) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")

        const where: any = { organizationId: employee.organizationId }

        // If not ADMIN, can only see own requests
        if (session.user.role !== "ADMIN") {
            where.employeeId = employee.id
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const requests = await prisma.attendanceRegularization.findMany({
            where,
            include: { attendance: true, employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { createdAt: "desc" }
        })

        return apiSuccess(requests)
    } catch (error) {
        console.error("[REGULARIZATION_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        const employee = await getSessionEmployee()
        if (!session?.user || !employee) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const body = await req.json()
        const validatedData = regularizationSchema.parse(body)

        // Verify attendance record exists and belongs to the employee or org
        const attendance = await prisma.attendance.findFirst({
            where: { id: validatedData.attendanceId, organizationId: employee.organizationId }
        })

        if (!attendance) {
            return apiError("Attendance record not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Only the employee who owns the record (or an ADMIN) can request regularization
        if (session.user.role !== "ADMIN" && attendance.employeeId !== employee.id) {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        const request = await prisma.attendanceRegularization.create({
            data: {
                ...validatedData,
                employeeId: attendance.employeeId,
                organizationId: employee.organizationId
            }
        })

        return apiSuccess(request, { message: "Regularization request submitted" }, 201)
    } catch (error: any) {
        console.error("[REGULARIZATION_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

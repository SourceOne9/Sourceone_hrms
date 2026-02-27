import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { shiftAssignmentSchema } from "@/lib/schemas/attendance"

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const body = await req.json()
        const validatedData = shiftAssignmentSchema.parse(body)

        // Check if shift exists in the organization
        const shift = await prisma.shift.findFirst({
            where: { id: validatedData.shiftId, organizationId: session.user.organizationId! }
        })

        if (!shift) {
            return apiError("Shift not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const assignment = await prisma.shiftAssignment.create({
            data: {
                ...validatedData,
                organizationId: session.user.organizationId!
            }
        })

        return apiSuccess(assignment, { message: "Shift assigned successfully" }, 201)
    } catch (error: any) {
        console.error("[SHIFT_ASSIGN_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { shiftSchema } from "@/lib/schemas/attendance"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const shifts = await prisma.shift.findMany({
            where: { organizationId: session.user.organizationId! },
            orderBy: { createdAt: "desc" }
        })

        return apiSuccess(shifts)
    } catch (error) {
        console.error("[SHIFTS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const body = await req.json()
        const validatedData = shiftSchema.parse(body)

        const shift = await prisma.shift.create({
            data: {
                ...validatedData,
                organizationId: session.user.organizationId!
            }
        })

        return apiSuccess(shift, { message: "Shift created successfully" }, 201)
    } catch (error: any) {
        console.error("[SHIFTS_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

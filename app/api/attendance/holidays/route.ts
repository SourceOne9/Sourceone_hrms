import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { holidaySchema } from "@/lib/schemas/attendance"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const holidays = await prisma.holiday.findMany({
            where: { organizationId: session.user.organizationId! },
            orderBy: { date: "asc" }
        })

        return apiSuccess(holidays)
    } catch (error) {
        console.error("[HOLIDAYS_GET]", error)
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
        const validatedData = holidaySchema.parse(body)

        const holiday = await prisma.holiday.create({
            data: {
                ...validatedData,
                organizationId: session.user.organizationId!
            }
        })

        return apiSuccess(holiday, { message: "Holiday created successfully" }, 201)
    } catch (error: any) {
        console.error("[HOLIDAYS_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

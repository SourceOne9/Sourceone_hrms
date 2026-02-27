import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { attendancePolicySchema } from "@/lib/schemas/attendance"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return apiError(ApiErrorCode.UNAUTHORIZED, "Unauthorized", 401)
        }

        const policy = await prisma.attendancePolicy.findUnique({
            where: { organizationId: session.user.organizationId! }
        })

        if (!policy) {
            // Return default settings if none exist
            return apiSuccess({
                lateGracePeriod: 15,
                earlyExitGrace: 15,
                otThreshold: 60,
                name: "DEFAULT"
            })
        }

        return apiSuccess(policy)
    } catch (error) {
        console.error("[POLICY_GET]", error)
        return apiError(ApiErrorCode.INTERNAL_ERROR, "Internal Server Error", 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return apiError(ApiErrorCode.UNAUTHORIZED, "Unauthorized", 401)
        }

        const body = await req.json()
        const validatedData = attendancePolicySchema.parse(body)

        const policy = await prisma.attendancePolicy.upsert({
            where: { organizationId: session.user.organizationId! },
            update: validatedData,
            create: {
                ...validatedData,
                organizationId: session.user.organizationId!
            }
        })

        return apiSuccess(policy, { message: "Attendance policy updated" }, 200)
    } catch (error: any) {
        console.error("[POLICY_POST]", error)
        if (error.name === "ZodError") {
            return apiError(ApiErrorCode.BAD_REQUEST, error.errors[0].message, 400)
        }
        return apiError(ApiErrorCode.INTERNAL_ERROR, "Internal Server Error", 500)
    }
}

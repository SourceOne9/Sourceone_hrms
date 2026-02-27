import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { webhookSchema } from "@/lib/schemas/integrations"
import { getSessionEmployee } from "@/lib/session-employee"

export async function GET() {
    try {
        const session = await auth()
        const employee = await getSessionEmployee()
        if (!session?.user?.id || !employee) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        // Only ADMIN/HR can manage webhooks
        if (session.user.role !== "ADMIN" && session.user.role !== "HR_MANAGER") {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        const webhooks = await prisma.webhook.findMany({
            where: { organizationId: employee.organizationId },
            orderBy: { createdAt: "desc" }
        })

        return apiSuccess(webhooks)
    } catch (error) {
        console.error("[WEBHOOKS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        const employee = await getSessionEmployee()
        if (!session?.user?.id || !employee) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "HR_MANAGER") {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        const body = await req.json()
        const validatedData = webhookSchema.parse(body)

        const webhook = await prisma.webhook.create({
            data: {
                ...validatedData,
                organizationId: employee.organizationId
            }
        })

        return apiSuccess(webhook, { message: "Webhook created successfully" }, 201)
    } catch (error: any) {
        console.error("[WEBHOOKS_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

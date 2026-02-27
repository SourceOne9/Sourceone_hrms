import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { webhookUpdateSchema } from "@/lib/schemas/integrations"
import { getSessionEmployee } from "@/lib/session-employee"

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const { id } = params
        const session = await auth()
        const employee = await getSessionEmployee()
        if (!session?.user?.id || !employee) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "HR_MANAGER") {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        const body = await req.json()
        const validatedData = webhookUpdateSchema.parse(body)

        const webhook = await prisma.webhook.update({
            where: { id, organizationId: employee.organizationId },
            data: validatedData
        })

        return apiSuccess(webhook, { message: "Webhook updated successfully" })
    } catch (error: any) {
        console.error("[WEBHOOK_PATCH]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const { id } = params
        const session = await auth()
        const employee = await getSessionEmployee()
        if (!session?.user?.id || !employee) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "HR_MANAGER") {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        await prisma.webhook.delete({
            where: { id, organizationId: employee.organizationId }
        })

        return apiSuccess(null, { message: "Webhook deleted successfully" })
    } catch (error) {
        console.error("[WEBHOOK_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

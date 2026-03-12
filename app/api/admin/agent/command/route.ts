import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { adminAgentCommandSchema } from "@/lib/schemas/agent"

// POST /api/admin/agent/command — Issue a command to a desktop agent device
export const POST = withAuth({ module: Module.AGENT_TRACKING, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = adminAgentCommandSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        // Verify device belongs to this organization
        const device = await prisma.agentDevice.findFirst({
            where: orgFilter(ctx, { id: parsed.data.deviceId }),
        })
        if (!device) {
            return apiError("Device not found in this organization", ApiErrorCode.NOT_FOUND, 404)
        }

        const expiresAt = parsed.data.expiresInMinutes
            ? new Date(Date.now() + parsed.data.expiresInMinutes * 60 * 1000)
            : null

        const command = await prisma.agentCommand.create({
            data: {
                deviceId: parsed.data.deviceId,
                type: parsed.data.type,
                payload: parsed.data.payload ? (parsed.data.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
                issuedBy: ctx.userId,
                expiresAt,
            },
        })

        // For KILL_SWITCH, immediately suspend the device to block further API calls
        if (parsed.data.type === "KILL_SWITCH" || parsed.data.type === "SUSPEND") {
            await prisma.agentDevice.update({
                where: { id: parsed.data.deviceId },
                data: { status: "SUSPENDED" },
            })
        }

        return apiSuccess({ commandId: command.id, type: command.type, status: command.status })
    } catch (error: unknown) {
        console.error("[ADMIN_AGENT_COMMAND]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

import { prisma } from "@/lib/prisma"
import { withAgentAuth } from "@/lib/agent-auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { agentCommandConfirmSchema } from "@/lib/schemas/agent"

// PUT /api/agent/commands/[id] — Agent confirms command execution
export const PUT = withAgentAuth(async (req, ctx) => {
    try {
        const url = new URL(req.url)
        const id = url.pathname.split("/").pop()
        if (!id) {
            return apiError("Command ID required", ApiErrorCode.BAD_REQUEST, 400)
        }

        const body = await req.json()
        const parsed = agentCommandConfirmSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const command = await prisma.agentCommand.findFirst({
            where: { id, deviceId: ctx.deviceId },
        })
        if (!command) {
            return apiError("Command not found", ApiErrorCode.NOT_FOUND, 404)
        }

        await prisma.agentCommand.update({
            where: { id },
            data: {
                status: parsed.data.status,
                executedAt: new Date(),
                result: parsed.data.result ?? null,
            },
        })

        // Update device status based on command type
        if (parsed.data.status === "EXECUTED") {
            if (command.type === "SUSPEND") {
                await prisma.agentDevice.update({
                    where: { id: ctx.deviceId },
                    data: { status: "SUSPENDED" },
                })
            } else if (command.type === "UNINSTALL" || command.type === "KILL_SWITCH") {
                await prisma.agentDevice.update({
                    where: { id: ctx.deviceId },
                    data: { status: "UNINSTALLED" },
                })
            } else if (command.type === "RESUME") {
                await prisma.agentDevice.update({
                    where: { id: ctx.deviceId },
                    data: { status: "ACTIVE" },
                })
            }
        }

        return apiSuccess({ ok: true })
    } catch (error: unknown) {
        console.error("[AGENT_COMMAND_CONFIRM]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

import { prisma } from "@/lib/prisma"
import { withAgentAuth } from "@/lib/agent-auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { agentHeartbeatSchema } from "@/lib/schemas/agent"

// POST /api/agent/heartbeat — Desktop agent alive check
export const POST = withAgentAuth(async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = agentHeartbeatSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const updateData: Record<string, unknown> = {
            lastHeartbeat: new Date(),
        }
        if (parsed.data.agentVersion) {
            updateData.agentVersion = parsed.data.agentVersion
        }

        await prisma.agentDevice.update({
            where: { id: ctx.deviceId },
            data: updateData,
        })

        return apiSuccess({ ok: true, serverTime: new Date().toISOString() })
    } catch (error: unknown) {
        console.error("[AGENT_HEARTBEAT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

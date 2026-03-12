import { prisma } from "@/lib/prisma"
import { withAgentAuth } from "@/lib/agent-auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/agent/commands — Agent polls for pending commands
export const GET = withAgentAuth(async (_req, ctx) => {
    try {
        const commands = await prisma.agentCommand.findMany({
            where: { deviceId: ctx.deviceId, status: "PENDING_CMD" },
            orderBy: { issuedAt: "asc" },
            take: 10,
        })

        // Mark as DELIVERED
        if (commands.length > 0) {
            await prisma.agentCommand.updateMany({
                where: { id: { in: commands.map(c => c.id) } },
                data: { status: "DELIVERED", deliveredAt: new Date() },
            })
        }

        return apiSuccess({
            commands: commands.map(c => ({
                id: c.id,
                type: c.type,
                payload: c.payload,
                issuedAt: c.issuedAt,
                expiresAt: c.expiresAt,
            })),
        })
    } catch (error: unknown) {
        console.error("[AGENT_COMMANDS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

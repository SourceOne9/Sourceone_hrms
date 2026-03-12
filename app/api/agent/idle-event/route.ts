import { prisma } from "@/lib/prisma"
import { withAgentAuth } from "@/lib/agent-auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { agentIdleEventSchema } from "@/lib/schemas/agent"

// POST /api/agent/idle-event — Record an idle detection event from the desktop agent
export const POST = withAgentAuth(async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = agentIdleEventSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const event = await prisma.idleEvent.create({
            data: {
                sessionId: parsed.data.sessionId,
                employeeId: ctx.employeeId,
                organizationId: ctx.organizationId,
                startedAt: parsed.data.startedAt,
                endedAt: parsed.data.endedAt ?? null,
                durationSec: parsed.data.durationSec,
                response: parsed.data.response,
                notes: parsed.data.notes ?? null,
            },
        })

        return apiSuccess({ id: event.id })
    } catch (error: unknown) {
        console.error("[AGENT_IDLE_EVENT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

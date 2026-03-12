import { prisma } from "@/lib/prisma"
import { withAgentAuth } from "@/lib/agent-auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { agentActivityBatchSchema } from "@/lib/schemas/agent"
import { classifyActivity, computeProductivityScore } from "@/lib/activity-classifier"

// POST /api/agent/activity — Batch upload activity snapshots from desktop agent
export const POST = withAgentAuth(async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = agentActivityBatchSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const records = parsed.data.snapshots.map(snap => {
            const category = snap.category !== "OTHER"
                ? snap.category
                : classifyActivity(snap.primaryApp, snap.primaryUrl)
            const score = computeProductivityScore(snap.activeSeconds, snap.idleSeconds, category)

            return {
                sessionId: snap.sessionId,
                deviceId: ctx.deviceId,
                timestamp: snap.timestamp,
                keystrokeCount: snap.keystrokeCount,
                mouseClickCount: snap.mouseClickCount,
                mouseDistance: snap.mouseDistance,
                scrollCount: snap.scrollCount,
                activeSeconds: snap.activeSeconds,
                idleSeconds: snap.idleSeconds,
                productivityScore: score,
                primaryApp: snap.primaryApp ?? null,
                primaryUrl: snap.primaryUrl ?? null,
                category,
            }
        })

        const result = await prisma.agentActivitySnapshot.createMany({ data: records })

        // Update last sync time
        prisma.agentDevice.update({
            where: { id: ctx.deviceId },
            data: { lastSyncAt: new Date() },
        }).catch(() => {})

        return apiSuccess({ inserted: result.count })
    } catch (error: unknown) {
        console.error("[AGENT_ACTIVITY]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

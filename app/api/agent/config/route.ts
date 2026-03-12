import { prisma } from "@/lib/prisma"
import { withAgentAuth } from "@/lib/agent-auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

const DEFAULT_CONFIG = {
    idleTimeoutSeconds: 600,      // 10 minutes
    syncIntervalSeconds: 300,     // 5 minutes
    snapshotIntervalSeconds: 30,  // 30-second micro-batches
    excludedApps: ["1Password", "KeePass", "LastPass", "Bitwarden"],
    excludedDomains: [] as string[],
    screenshotEnabled: false,
    maxBatchSize: 100,
}

// GET /api/agent/config — Agent fetches current configuration
export const GET = withAgentAuth(async (_req, ctx) => {
    try {
        const device = await prisma.agentDevice.findUnique({
            where: { id: ctx.deviceId },
            select: { configJson: true },
        })

        const deviceOverrides = (device?.configJson as Record<string, unknown>) ?? {}
        const config = { ...DEFAULT_CONFIG, ...deviceOverrides }

        return apiSuccess(config)
    } catch (error: unknown) {
        console.error("[AGENT_CONFIG]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

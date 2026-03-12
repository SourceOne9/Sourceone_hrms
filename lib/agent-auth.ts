import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { NextResponse } from "next/server"

export interface AgentContext {
    deviceId: string
    employeeId: string
    organizationId: string
}

type AgentHandler = (req: Request, ctx: AgentContext) => Promise<NextResponse | Response>

/**
 * withAgentAuth: wraps agent-facing API routes.
 * Authenticates via X-Agent-Key header against AgentDevice.apiKey.
 */
export function withAgentAuth(handler: AgentHandler) {
    return async (req: Request) => {
        const apiKey = req.headers.get("x-agent-key")
        if (!apiKey) {
            return apiError("Missing X-Agent-Key header", ApiErrorCode.UNAUTHORIZED, 401)
        }

        try {
            const device = await prisma.agentDevice.findUnique({
                where: { apiKey },
                select: { id: true, status: true, employeeId: true, organizationId: true },
            })

            if (!device) {
                logger.warn("Invalid agent API key", { keyPrefix: apiKey.slice(0, 8) })
                return apiError("Invalid agent API key", ApiErrorCode.UNAUTHORIZED, 401)
            }

            if (device.status !== "ACTIVE") {
                return apiError(`Device is ${device.status}`, ApiErrorCode.FORBIDDEN, 403)
            }

            // Update lastHeartbeat in background (non-blocking)
            prisma.agentDevice.update({
                where: { id: device.id },
                data: { lastHeartbeat: new Date() },
            }).catch(() => {})

            return handler(req, {
                deviceId: device.id,
                employeeId: device.employeeId,
                organizationId: device.organizationId,
            })
        } catch (error: unknown) {
            logger.error("Agent auth error", { error: error instanceof Error ? error.message : "unknown" })
            return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
        }
    }
}

import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export async function GET() {
    try {
        // Test database connectivity
        await prisma.$queryRaw`SELECT 1`

        return apiSuccess({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: "connected",
        })
    } catch (error) {
        console.error("[HEALTH_CHECK]", error)
        return apiError("unhealthy", ApiErrorCode.INTERNAL_ERROR, 503, {
            database: "disconnected",
            timestamp: new Date().toISOString()
        })
    }
}

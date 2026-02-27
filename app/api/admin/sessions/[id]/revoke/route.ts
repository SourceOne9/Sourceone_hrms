import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// POST /api/admin/sessions/[id]/revoke - Revoke a specific user session
export const POST = withAuth("ADMIN", async (req, ctx) => {
    try {
        const session = await prisma.userSession.findFirst({
            where: {
                id: ctx.params.id,
                organizationId: ctx.organizationId // Ensure scoping
            }
        })

        if (!session) {
            return apiError("Session not found", ApiErrorCode.NOT_FOUND, 404)
        }

        await prisma.userSession.update({
            where: { id: session.id },
            data: { isRevoked: true }
        })

        return apiSuccess({ message: "Session revoked successfully" })
    } catch (error) {
        console.error("[ADMIN_SESSIONS_REVOKE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

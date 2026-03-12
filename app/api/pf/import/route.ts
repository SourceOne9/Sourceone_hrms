import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { queue } from "@/lib/queue"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// POST /api/pf/import
export const POST = withAuth({ module: Module.PAYROLL, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { rows } = await req.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            return apiError("No rows provided", ApiErrorCode.BAD_REQUEST, 400)
        }

        const jobId = await queue.enqueue("PF_IMPORT", { rows, organizationId: ctx.organizationId })

        return apiSuccess(
            { message: `Accepted ${rows.length} rows for background processing`, jobId, status: "queued" },
            undefined,
            202
        )
    } catch (error) {
        console.error("[PF_IMPORT]", error)
        return apiError("Job enqueue failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

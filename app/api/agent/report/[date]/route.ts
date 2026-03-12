import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/agent/report/[date] — Employee views own daily report
export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, async (_req, ctx) => {
    try {
        const date = new Date(ctx.params.date)
        if (isNaN(date.getTime())) {
            return apiError("Invalid date format", ApiErrorCode.VALIDATION_ERROR, 400)
        }
        date.setHours(0, 0, 0, 0)

        const report = await prisma.dailyActivityReport.findFirst({
            where: {
                ...orgFilter(ctx),
                employeeId: ctx.employeeId,
                date,
            },
        })

        if (!report) {
            return apiError("Report not found for this date", ApiErrorCode.NOT_FOUND, 404)
        }

        return apiSuccess(report)
    } catch (error: unknown) {
        console.error("[AGENT_REPORT_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

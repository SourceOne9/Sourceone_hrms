import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// POST /api/resignations/import
export const POST = withAuth({ module: Module.RESIGNATION, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { rows } = await req.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            return apiError("No rows provided", ApiErrorCode.BAD_REQUEST, 400)
        }

        let inserted = 0
        let skipped = 0

        for (const row of rows) {
            try {
                const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                const employee = await prisma.employee.findFirst({
                    where: {
                        organizationId: ctx.organizationId,
                        ...(employeeCode
                            ? { employeeCode }
                            : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" as const } })
                    }
                })
                if (!employee) { skipped++; continue }

                const reason = String(row["reason"] || row["Reason"] || "").trim()
                const lastDayRaw = String(row["lastDay"] || row["Last Day"] || "").trim()
                const lastDay = lastDayRaw ? new Date(lastDayRaw) : null
                if (!lastDay || isNaN(lastDay.getTime())) { skipped++; continue }

                const statusRaw = String(row["status"] || row["Status"] || "UNDER_REVIEW").trim().toUpperCase()
                const validStatuses = ["UNDER_REVIEW", "NOTICE_PERIOD", "PROCESSED"]
                const status = validStatuses.includes(statusRaw) ? statusRaw as any : "UNDER_REVIEW"

                await prisma.resignation.create({
                    data: { employeeId: employee.id, organizationId: ctx.organizationId, reason, lastDay, status }
                })
                inserted++
            } catch { skipped++ }
        }

        return apiSuccess({ inserted, skipped })
    } catch (error) {
        console.error("[RESIGNATION_IMPORT]", error)
        return apiError("Import failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

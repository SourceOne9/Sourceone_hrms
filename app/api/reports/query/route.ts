import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action, hasPermission } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

/**
 * POST /api/reports/query
 * Dynamically queries the database based on a report configuration.
 */
export const POST = withAuth({ module: Module.REPORTS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const body = await req.json()
        const { entityType, columns, filters, sortBy, sortOrder = "desc", limit = 100 } = body

        if (!entityType) {
            return apiError("entityType is required", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        if (!columns || !Array.isArray(columns) || columns.length === 0) {
            return apiError("columns are required", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        let result: any[] = []
        let total = 0

        // Build base where clause — models without deletedAt won't use it
        const baseWhere: any = { organizationId: ctx.organizationId }

        // Apply common filters
        if (filters && typeof filters === "object") {
            // Department filter — applies to Employee directly, or via employee relation
            if (filters.departmentId) {
                if (entityType === "EMPLOYEE") {
                    baseWhere.departmentId = filters.departmentId
                }
                // For other entities, we filter via employee relation below
            }

            // Status filter (equality)
            if (filters.status) {
                baseWhere.status = filters.status
            }

            // Month filter for payroll
            if (filters.month && entityType === "PAYROLL") {
                baseWhere.month = filters.month
            }

            // Review period filter for performance
            if (filters.reviewPeriod && entityType === "PERFORMANCE") {
                baseWhere.reviewPeriod = filters.reviewPeriod
            }

            // Date range filters
            if (filters.dateFrom || filters.dateTo) {
                const dateField = entityType === "ATTENDANCE" ? "date" : entityType === "LEAVE" ? "startDate" : null
                if (dateField) {
                    baseWhere[dateField] = {}
                    if (filters.dateFrom) baseWhere[dateField].gte = new Date(filters.dateFrom)
                    if (filters.dateTo) baseWhere[dateField].lte = new Date(filters.dateTo + "T23:59:59.999Z")
                }
            }
        }

        // Department filter for non-Employee entities via employee relation
        if (filters?.departmentId && entityType !== "EMPLOYEE") {
            baseWhere.employee = { departmentId: filters.departmentId }
        }

        // Soft-delete scope for Employee
        if (entityType === "EMPLOYEE") {
            baseWhere.deletedAt = null
        }

        // Validate sortBy — only allow non-nested fields
        const safeSortBy = sortBy && !sortBy.includes(".") ? sortBy : undefined
        const safeSortOrder = sortOrder === "asc" ? "asc" : "desc"

        switch (entityType) {
            case "EMPLOYEE": {
                const select = buildSelect(columns, ["department", "manager"])
                ;[result, total] = await Promise.all([
                    prisma.employee.findMany({
                        where: baseWhere,
                        select,
                        orderBy: safeSortBy ? { [safeSortBy]: safeSortOrder } : { createdAt: "desc" },
                        take: Math.min(limit, 500),
                    }),
                    prisma.employee.count({ where: baseWhere }),
                ])
                break
            }

            case "PAYROLL": {
                if (!hasPermission(ctx.role, Module.PAYROLL, Action.VIEW)) {
                    return apiError("Insufficient permissions for Payroll reports", ApiErrorCode.FORBIDDEN, 403)
                }
                const select = buildSelect(columns, ["employee"])
                ;[result, total] = await Promise.all([
                    prisma.payroll.findMany({
                        where: baseWhere,
                        select,
                        orderBy: safeSortBy ? { [safeSortBy]: safeSortOrder } : { month: "desc" },
                        take: Math.min(limit, 500),
                    }),
                    prisma.payroll.count({ where: baseWhere }),
                ])
                break
            }

            case "ATTENDANCE": {
                if (!hasPermission(ctx.role, Module.ATTENDANCE, Action.VIEW)) {
                    return apiError("Insufficient permissions for Attendance reports", ApiErrorCode.FORBIDDEN, 403)
                }
                const select = buildSelect(columns, ["employee"])
                ;[result, total] = await Promise.all([
                    prisma.attendance.findMany({
                        where: baseWhere,
                        select,
                        orderBy: safeSortBy ? { [safeSortBy]: safeSortOrder } : { date: "desc" },
                        take: Math.min(limit, 500),
                    }),
                    prisma.attendance.count({ where: baseWhere }),
                ])
                break
            }

            case "LEAVE": {
                if (!hasPermission(ctx.role, Module.LEAVES, Action.VIEW)) {
                    return apiError("Insufficient permissions for Leave reports", ApiErrorCode.FORBIDDEN, 403)
                }
                const select = buildSelect(columns, ["employee"])
                ;[result, total] = await Promise.all([
                    prisma.leave.findMany({
                        where: baseWhere,
                        select,
                        orderBy: safeSortBy ? { [safeSortBy]: safeSortOrder } : { startDate: "desc" },
                        take: Math.min(limit, 500),
                    }),
                    prisma.leave.count({ where: baseWhere }),
                ])
                break
            }

            case "PERFORMANCE": {
                if (!hasPermission(ctx.role, Module.PERFORMANCE, Action.VIEW)) {
                    return apiError("Insufficient permissions for Performance reports", ApiErrorCode.FORBIDDEN, 403)
                }
                const select = buildSelect(columns, ["employee"])
                ;[result, total] = await Promise.all([
                    prisma.performanceReview.findMany({
                        where: baseWhere,
                        select,
                        orderBy: safeSortBy ? { [safeSortBy]: safeSortOrder } : { reviewDate: "desc" },
                        take: Math.min(limit, 500),
                    }),
                    prisma.performanceReview.count({ where: baseWhere }),
                ])
                break
            }

            default:
                return apiError(`Unsupported entity type: ${entityType}`, ApiErrorCode.VALIDATION_ERROR, 400)
        }

        return apiSuccess({
            data: result,
            meta: { total, count: result.length, entityType }
        })

    } catch (error) {
        console.error("[REPORT_QUERY_POST]", error)
        return apiError("Failed to execute report query", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

/**
 * Builds a Prisma select object from column names.
 * Supports nested relations like "employee.firstName", "department.name", "manager.firstName".
 */
function buildSelect(columns: string[], includes: string[] = []) {
    if (!columns || columns.length === 0) return undefined

    const select: any = {}
    columns.forEach(col => {
        if (col.includes(".")) {
            const [rel, field] = col.split(".")
            if (!select[rel]) select[rel] = { select: {} }
            select[rel].select[field] = true
        } else {
            select[col] = true
        }
    })

    // Ensure default relation includes if not already covered by columns
    includes.forEach(rel => {
        if (!select[rel]) {
            if (rel === "employee") {
                select[rel] = {
                    select: {
                        firstName: true, lastName: true, employeeCode: true,
                        department: { select: { name: true } }
                    }
                }
            } else if (rel === "department") {
                select[rel] = { select: { name: true } }
            } else if (rel === "manager") {
                select[rel] = { select: { firstName: true, lastName: true } }
            }
        }
    })

    return select
}

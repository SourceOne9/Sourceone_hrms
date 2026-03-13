import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { NextResponse } from "next/server"

// Column label map for CSV headers
const COLUMN_LABELS: Record<string, string> = {
    "employeeCode": "Emp Code", "firstName": "First Name", "lastName": "Last Name",
    "email": "Email", "phone": "Phone", "designation": "Designation",
    "department.name": "Department", "salary": "Salary", "dateOfJoining": "Joining Date",
    "status": "Status", "manager.firstName": "Manager", "address": "Address",
    "employee.employeeCode": "Emp Code", "employee.firstName": "First Name",
    "employee.lastName": "Last Name", "month": "Month", "basicSalary": "Basic Salary",
    "allowances": "Allowances", "pfDeduction": "PF Deduction", "tax": "Tax",
    "otherDed": "Other Deductions", "arrears": "Arrears", "reimbursements": "Reimbursements",
    "netSalary": "Net Salary", "isFinalized": "Finalized", "date": "Date",
    "checkIn": "Check In", "checkOut": "Check Out", "workHours": "Work Hours",
    "overtime": "Overtime (min)", "isLate": "Late", "isEarlyExit": "Early Exit",
    "type": "Leave Type", "startDate": "Start Date", "endDate": "End Date",
    "reason": "Reason", "rating": "Rating", "progress": "Progress %",
    "reviewPeriod": "Period", "reviewType": "Review Type", "comments": "Comments",
    "reviewDate": "Review Date",
}

// POST /api/reports/export - Generate CSV export
export const POST = withAuth({ module: Module.REPORTS, action: Action.EXPORT }, async (req, ctx) => {
    try {
        const body = await req.json()
        const { reportId, format = "CSV" } = body

        let config: any
        let name = "Export"

        if (reportId) {
            const savedReport = await prisma.savedReport.findUnique({
                where: { id: reportId, organizationId: ctx.organizationId }
            })
            if (!savedReport) return apiError("Report not found", ApiErrorCode.NOT_FOUND, 404)
            config = savedReport.config
            name = savedReport.name
        } else {
            config = body.config
        }

        if (!config) return apiError("Report configuration is required", ApiErrorCode.VALIDATION_ERROR, 400)

        const data = await runReportQuery(config, ctx.organizationId)

        if (format === "CSV") {
            const csv = convertToCSV(data, config.columns || [])
            const fileName = `${(name || config.entityType).replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${fileName}"`
                }
            })
        }

        return apiError("Format not supported", ApiErrorCode.VALIDATION_ERROR, 400)

    } catch (error) {
        console.error("[REPORT_EXPORT_POST]", error)
        return apiError("Failed to generate export", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

async function runReportQuery(config: any, organizationId: string) {
    const { entityType, columns, filters, sortBy, sortOrder } = config
    const where: any = { organizationId }

    // Apply filters
    if (filters && typeof filters === "object") {
        if (filters.departmentId) {
            if (entityType === "EMPLOYEE") where.departmentId = filters.departmentId
            else where.employee = { departmentId: filters.departmentId }
        }
        if (filters.status) where.status = filters.status
        if (filters.month && entityType === "PAYROLL") where.month = filters.month
        if (filters.reviewPeriod && entityType === "PERFORMANCE") where.reviewPeriod = filters.reviewPeriod
        if (filters.dateFrom || filters.dateTo) {
            const dateField = entityType === "ATTENDANCE" ? "date" : entityType === "LEAVE" ? "startDate" : null
            if (dateField) {
                where[dateField] = {}
                if (filters.dateFrom) where[dateField].gte = new Date(filters.dateFrom)
                if (filters.dateTo) where[dateField].lte = new Date(filters.dateTo + "T23:59:59.999Z")
            }
        }
    }

    if (entityType === "EMPLOYEE") where.deletedAt = null

    const select = buildSelect(columns || [])
    const safeSortBy = sortBy && !sortBy.includes(".") ? sortBy : undefined
    const order = sortOrder === "asc" ? "asc" : "desc"
    const take = 5000 // Export limit

    switch (entityType) {
        case "EMPLOYEE":
            return prisma.employee.findMany({
                where, select: select || undefined,
                orderBy: safeSortBy ? { [safeSortBy]: order } : { createdAt: "desc" }, take
            })
        case "PAYROLL":
            return prisma.payroll.findMany({
                where, select: select || undefined,
                orderBy: safeSortBy ? { [safeSortBy]: order } : { month: "desc" }, take
            })
        case "ATTENDANCE":
            return prisma.attendance.findMany({
                where, select: select || undefined,
                orderBy: safeSortBy ? { [safeSortBy]: order } : { date: "desc" }, take
            })
        case "LEAVE":
            return prisma.leave.findMany({
                where, select: select || undefined,
                orderBy: safeSortBy ? { [safeSortBy]: order } : { startDate: "desc" }, take
            })
        case "PERFORMANCE":
            return prisma.performanceReview.findMany({
                where, select: select || undefined,
                orderBy: safeSortBy ? { [safeSortBy]: order } : { reviewDate: "desc" }, take
            })
        default:
            return []
    }
}

function buildSelect(columns: string[]) {
    if (!columns || columns.length === 0) return null
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
    // Ensure employee relation has dept info when included
    if (select.employee && !select.employee.select.department) {
        select.employee.select.department = { select: { name: true } }
    }
    if (select.department === undefined && columns.some(c => c.startsWith("department."))) {
        // Already handled by nested
    }
    if (!select.manager && columns.some(c => c.startsWith("manager."))) {
        // Already handled by nested
    }
    return Object.keys(select).length > 0 ? select : null
}

// CSV formula injection prevention
function sanitizeCsvValue(val: string): string {
    if (/^[=+\-@\t\r]/.test(val)) return "'" + val
    return val
}

function csvQuote(val: string): string {
    const sanitized = sanitizeCsvValue(val)
    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
        return `"${sanitized.replace(/"/g, '""')}"`
    }
    return sanitized
}

function convertToCSV(data: any[], columns: string[]) {
    if (!columns || columns.length === 0) return ""

    // Use human-readable headers
    const header = columns.map(c => csvQuote(COLUMN_LABELS[c] || c)).join(",") + "\n"

    if (!data || data.length === 0) return header

    const rows = data.map(item => {
        return columns.map(col => {
            let val = item
            if (col.includes(".")) {
                col.split(".").forEach(p => val = val?.[p])
            } else {
                val = item[col]
            }
            if (val === null || val === undefined) return ""
            if (val instanceof Date) return csvQuote(val.toISOString().split("T")[0])
            if (typeof val === "string") {
                // Format dates
                if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return csvQuote(val.split("T")[0])
                return csvQuote(val)
            }
            if (typeof val === "boolean") return val ? "Yes" : "No"
            return String(val)
        }).join(",")
    }).join("\n")

    return header + rows
}

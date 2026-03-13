import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action, hasPermission } from "@/lib/permissions"
import { z } from "zod"

const reimbursementCreateSchema = z.object({
    category: z.enum(["TRAVEL", "MEALS", "OFFICE_SUPPLIES", "MEDICAL", "TRAINING_EXPENSE", "CONFERENCE", "RELOCATION", "OTHER"]),
    amount: z.number().positive("Amount must be positive"),
    description: z.string().min(5, "Description must be at least 5 characters"),
    receiptUrl: z.string().optional().nullable(),
    expenseDate: z.coerce.date(),
    employeeId: z.string().optional(),
})

// GET /api/reimbursements - List reimbursement requests (scoped by role)
export const GET = withAuth({ module: Module.REIMBURSEMENT, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, any> = { organizationId: ctx.organizationId }

        if (status) where.status = status

        // Payroll, CEO, HR see all; others see only their own
        const canSeeAll = hasPermission(ctx.role, Module.REIMBURSEMENT, Action.UPDATE)
            || ctx.role === "CEO" || ctx.role === "HR"

        if (!canSeeAll) {
            if (ctx.employeeId) where.employeeId = ctx.employeeId
            else return apiError("No employee profile found", ApiErrorCode.BAD_REQUEST, 400)
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const records = await prisma.reimbursement.findMany({
            where,
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, department: { select: { name: true } } } }
            },
            orderBy: { createdAt: "desc" },
            take: 300,
        })

        return apiSuccess(records)
    } catch (error) {
        console.error("[REIMBURSEMENT_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/reimbursements - Create a new reimbursement request
export const POST = withAuth({ module: Module.REIMBURSEMENT, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = reimbursementCreateSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const targetEmployeeId = parsed.data.employeeId || ctx.employeeId
        if (!targetEmployeeId) {
            return apiError("Employee ID is required", ApiErrorCode.BAD_REQUEST, 400)
        }

        const record = await prisma.reimbursement.create({
            data: {
                category: parsed.data.category,
                amount: parsed.data.amount,
                description: parsed.data.description,
                receiptUrl: parsed.data.receiptUrl || null,
                expenseDate: parsed.data.expenseDate,
                employeeId: targetEmployeeId,
                organizationId: ctx.organizationId,
            },
            include: {
                employee: { select: { firstName: true, lastName: true, employeeCode: true } }
            },
        })

        return apiSuccess(record, undefined, 201)
    } catch (error) {
        console.error("[REIMBURSEMENT_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

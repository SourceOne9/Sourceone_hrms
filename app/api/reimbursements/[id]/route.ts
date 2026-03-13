import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { z } from "zod"

const updateSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionNote: z.string().optional(),
})

// PUT /api/reimbursements/[id] - Approve or reject (PAYROLL only via UPDATE permission)
export const PUT = withAuth({ module: Module.REIMBURSEMENT, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const id = ctx.params?.id as string
        if (!id) return apiError("ID is required", ApiErrorCode.BAD_REQUEST, 400)

        const body = await req.json()
        const parsed = updateSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        // Verify the record exists and belongs to this org
        const existing = await prisma.reimbursement.findFirst({
            where: { id, organizationId: ctx.organizationId }
        })

        if (!existing) return apiError("Reimbursement not found", ApiErrorCode.NOT_FOUND, 404)
        if (existing.status !== "PENDING") {
            return apiError("Only pending requests can be updated", ApiErrorCode.BAD_REQUEST, 400)
        }

        const record = await prisma.reimbursement.update({
            where: { id },
            data: {
                status: parsed.data.status,
                rejectionNote: parsed.data.status === "REJECTED" ? (parsed.data.rejectionNote || null) : null,
                approvedBy: parsed.data.status === "APPROVED" ? ctx.userId : null,
                approvedAt: parsed.data.status === "APPROVED" ? new Date() : null,
            },
            include: {
                employee: { select: { firstName: true, lastName: true, employeeCode: true } }
            },
        })

        return apiSuccess(record)
    } catch (error) {
        console.error("[REIMBURSEMENT_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/reimbursements/[id] - Delete own pending request
export const DELETE = withAuth({ module: Module.REIMBURSEMENT, action: Action.CREATE }, async (req, ctx) => {
    try {
        const id = ctx.params?.id as string
        if (!id) return apiError("ID is required", ApiErrorCode.BAD_REQUEST, 400)

        const existing = await prisma.reimbursement.findFirst({
            where: { id, organizationId: ctx.organizationId }
        })

        if (!existing) return apiError("Reimbursement not found", ApiErrorCode.NOT_FOUND, 404)

        // Only allow deleting own pending requests (unless payroll admin)
        if (existing.employeeId !== ctx.employeeId && ctx.role !== "PAYROLL") {
            return apiError("Cannot delete others' requests", ApiErrorCode.FORBIDDEN, 403)
        }
        if (existing.status !== "PENDING") {
            return apiError("Only pending requests can be deleted", ApiErrorCode.BAD_REQUEST, 400)
        }

        await prisma.reimbursement.delete({ where: { id } })
        return apiSuccess({ message: "Reimbursement request deleted" })
    } catch (error) {
        console.error("[REIMBURSEMENT_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

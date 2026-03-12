import { z } from 'zod'
import { withAuth, orgFilter } from '@/lib/security'
import { Module, Action } from '@/lib/permissions'
import { apiError, apiSuccess, ApiErrorCode } from '@/lib/api-response'
import { WorkflowEngine } from '@/lib/workflow-engine'
import { prisma } from '@/lib/prisma'

const workflowActionBody = z.object({
    instanceId: z.string().min(1),
    action: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES"]),
    comments: z.string().optional(),
})

export const POST = withAuth({ module: Module.WORKFLOWS, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = workflowActionBody.safeParse(body)

        if (!parsed.success) {
            return apiError('Validation Error', ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const { instanceId, action, comments } = parsed.data

        // Find employee mapping scoped to org
        const employee = await prisma.employee.findFirst({
            where: { userId: ctx.userId, organizationId: ctx.organizationId }
        })

        if (!employee) {
            return apiError('Employee profile not found', ApiErrorCode.NOT_FOUND, 404)
        }

        const result = await WorkflowEngine.processAction(instanceId, employee.id, ctx.organizationId, action as any, comments)

        return apiSuccess(result)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (message === 'Workflow instance not found') {
            return apiError('Not Found', ApiErrorCode.NOT_FOUND, 404)
        }
        if (message.includes('already completed') || message.includes('missing') || message.includes('Not authorized')) {
            return apiError(message, ApiErrorCode.BAD_REQUEST, 400)
        }
        console.error("[WORKFLOW_ACTION]", err)
        return apiError('Internal Server Error', ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

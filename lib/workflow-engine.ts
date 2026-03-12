import { prisma } from '@/lib/prisma'
import { ApprovalAction } from '@prisma/client'

export class WorkflowEngine {

    static async initiateWorkflow(templateId: string, entityId: string, requesterId: string, organizationId: string) {
        return prisma.workflowInstance.create({
            data: {
                templateId,
                entityId,
                requesterId,
                organizationId,
                status: 'PENDING',
                currentStep: 1
            }
        })
    }

    static async processAction(instanceId: string, actorId: string, organizationId: string, action: ApprovalAction, comments?: string) {
        const instance = await prisma.workflowInstance.findFirst({
            where: { id: instanceId, organizationId },
            include: { template: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } }
        })

        if (!instance) throw new Error('Workflow instance not found')
        if (instance.status !== 'PENDING') throw new Error('Workflow is already completed or rejected')

        const currentStepConfig = instance.template.steps.find(s => s.stepOrder === instance.currentStep)
        if (!currentStepConfig) throw new Error('Step configuration missing')

        // Verify actor belongs to the same organization
        const actor = await prisma.employee.findFirst({
            where: { id: actorId, organizationId },
            include: { user: { select: { role: true } } }
        })
        if (!actor) throw new Error('Not authorized to act on this workflow')

        return prisma.$transaction(async (tx) => {
            await tx.workflowAction.create({
                data: {
                    instanceId,
                    stepId: currentStepConfig.id,
                    actorId,
                    action,
                    comments
                }
            })

            if (action === 'REJECT') {
                return tx.workflowInstance.update({
                    where: { id: instanceId },
                    data: { status: 'REJECTED' }
                })
            }

            if (action === 'APPROVE') {
                const nextStepOrder = instance.currentStep + 1
                const nextStepConfig = instance.template.steps.find(s => s.stepOrder === nextStepOrder)

                if (nextStepConfig) {
                    return tx.workflowInstance.update({
                        where: { id: instanceId },
                        data: { currentStep: nextStepOrder }
                    })
                } else {
                    return tx.workflowInstance.update({
                        where: { id: instanceId },
                        data: { status: 'APPROVED' }
                    })
                }
            }

            return instance
        })
    }
}

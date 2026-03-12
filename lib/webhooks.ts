import { prisma } from "./prisma"
import crypto from "node:crypto"
import { queue } from "./queue"

export const WEBHOOK_EVENTS = {
    EMPLOYEE_CREATED: "employee.created",
    EMPLOYEE_UPDATED: "employee.updated",
    PAYROLL_FINALIZED: "payroll.finalized",
    ATTENDANCE_LATE: "attendance.late",
} as const

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS]

/**
 * Creates an HMAC-SHA256 signature for the given payload and secret.
 */
export function createHmacSignature(payload: string, secret: string): string {
    return crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex")
}

/**
 * Dispatches a webhook event by finding matching active webhooks for an organization
 * and enqueuing delivery jobs.
 */
export async function dispatchWebhookEvent(
    organizationId: string,
    event: WebhookEventType,
    data: unknown
) {
    try {
        // Find active webhooks for this org subscribed to this event
        const webhooks = await prisma.webhook.findMany({
            where: {
                organizationId,
                isActive: true,
                events: {
                    has: event
                }
            }
        })

        if (webhooks.length === 0) return

        const payload = {
            id: `wh_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
            event,
            data,
            timestamp: new Date().toISOString()
        }

        // Create delivery records and enqueue jobs
        for (const webhook of webhooks) {
            const delivery = await prisma.webhookDelivery.create({
                data: {
                    webhookId: webhook.id,
                    event,
                    payload: payload as any,
                    status: "PENDING"
                }
            })

            await queue.enqueue("WEBHOOK_DELIVERY", {
                deliveryId: delivery.id,
                webhookId: webhook.id,
                payload
            })
        }
    } catch (error) {
        console.error("[WEBHOOK_DISPATCH_ERROR]", error)
    }
}

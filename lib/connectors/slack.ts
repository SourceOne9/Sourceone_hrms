import { WebhookEventType } from "../webhooks"

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export async function sendSlackNotification(webhookUrl: string, event: WebhookEventType, data: any) {
    const blocks = []

    blocks.push({
        type: "header",
        text: {
            type: "plain_text",
            text: `EMS Event: ${event}`,
            emoji: true
        }
    })

    let detailText = ""
    switch (event) {
        case "employee.created":
            detailText = `*New Employee:* ${data.firstName} ${data.lastName} (${data.employeeCode})\n*Department:* ${data.department?.name || "N/A"}`
            break
        case "payroll.finalized":
            detailText = `*Payroll Finalized:* ${data.month}\n*Total Employees:* ${data._count?.employee || "N/A"}`
            break
        case "attendance.late":
            detailText = `*Late Arrival Check:* ${data.firstName} ${data.lastName}\n*Check-in:* ${new Date(data.checkIn).toLocaleTimeString()}`
            break
        default:
            detailText = `A new event has occurred: *${event}*`
    }

    blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: detailText }
    })

    blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `Timestamp: ${new Date().toLocaleString()}` }]
    })

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 10000)

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blocks }),
                signal: controller.signal
            })

            clearTimeout(timeout)

            if (response.ok) return true

            if (response.status >= 500 && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
                continue
            }

            console.error("[SLACK_NOTIFICATION_ERROR]", response.status, await response.text())
            return false
        } catch (error) {
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
                continue
            }
            console.error("[SLACK_NOTIFICATION_EXCEPTION]", error)
            return false
        }
    }
    return false
}

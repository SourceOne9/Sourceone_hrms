import { WebhookEventType } from "../webhooks"

export async function sendSlackNotification(webhookUrl: string, event: WebhookEventType, data: any) {
    const blocks = []

    // Header
    blocks.push({
        type: "header",
        text: {
            type: "plain_text",
            text: `🚀 EMS Event: ${event}`,
            emoji: true
        }
    })

    // Content Based on Event
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
        text: {
            type: "mrkdwn",
            text: detailText
        }
    })

    // Footer/Context
    blocks.push({
        type: "context",
        elements: [
            {
                type: "mrkdwn",
                text: `Timestamp: ${new Date().toLocaleString()}`
            }
        ]
    })

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blocks })
        })

        if (!response.ok) {
            console.error("[SLACK_NOTIFICATION_ERROR]", await response.text())
            return false
        }
        return true
    } catch (error) {
        console.error("[SLACK_NOTIFICATION_EXCEPTION]", error)
        return false
    }
}

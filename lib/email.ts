import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null

const FROM = process.env.EMAIL_FROM || "SourceOne Hr <noreply@sourceone.app>"

export interface EmailOptions {
    to: string | string[]
    subject: string
    html: string
}

/**
 * Send an email via Resend. Falls back to console logging when API key is not configured.
 */
export async function sendEmail(opts: EmailOptions): Promise<boolean> {
    try {
        if (!resend) {
            console.log("[EMAIL_FALLBACK]", { to: opts.to, subject: opts.subject })
            return true
        }

        const { error } = await resend.emails.send({
            from: FROM,
            to: Array.isArray(opts.to) ? opts.to : [opts.to],
            subject: opts.subject,
            html: opts.html,
        })

        if (error) {
            console.error("[EMAIL_SEND_ERROR]", error)
            return false
        }
        return true
    } catch (error) {
        console.error("[EMAIL_SEND_ERROR]", error)
        return false
    }
}

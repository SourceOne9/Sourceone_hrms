/**
 * /api/cron/agent-aggregate — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/cron/agent-aggregate/ does not exist yet.
 */
import { NextResponse } from "next/server"
import { verifyBearerSecret } from "@/lib/security"

export async function POST(req: Request) {
    if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

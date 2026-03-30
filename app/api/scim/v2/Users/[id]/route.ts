/**
 * /api/scim/v2/Users/[id] — Django proxy (Sprint 14).
 * SCIM endpoint handles its own auth via Bearer token.
 *
 * NOTE: Django endpoint /api/v1/scim/v2/Users/{id}/ does not exist yet.
 */
import { NextResponse } from "next/server"
import { verifyBearerSecret } from "@/lib/security"

function validateScimToken(req: Request): NextResponse | null {
    if (!verifyBearerSecret(req.headers.get("authorization"), process.env.SCIM_TOKEN)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return null
}

export async function GET(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PUT(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PATCH(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function DELETE(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

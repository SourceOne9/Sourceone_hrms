/**
 * /api/employees/[id]/credentials — Credential reset handler.
 *
 * Django's UserUpdateSerializer doesn't accept password changes.
 * Workaround: Delete old User → Create new User with new password → Re-link to Employee.
 */
import { NextResponse } from "next/server"

function getDjangoBase(): string {
    return (
        process.env.DJANGO_GATEWAY_URL ||
        process.env.DJANGO_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://127.0.0.1:8000"
    )
}

function forwardHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth = req.headers.get("authorization")
    if (auth) headers["Authorization"] = auth
    const slug = req.headers.get("x-tenant-slug") || req.headers.get("X-Tenant-Slug")
    if (slug) headers["X-Tenant-Slug"] = slug
    return headers
}

function generateTempPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let password = ""
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const base = getDjangoBase()
    const headers = forwardHeaders(req)

    try {
        // Step 1: Fetch employee from Django
        const empRes = await fetch(`${base}/api/v1/employees/${id}/`, {
            headers,
            signal: AbortSignal.timeout(15_000),
        })

        if (!empRes.ok) {
            return NextResponse.json(
                { error: { detail: "Employee not found" } },
                { status: empRes.status }
            )
        }

        const empJson = await empRes.json()
        const employee = empJson.data || empJson
        const email = employee.email
        const firstName = employee.first_name || ""
        const lastName = employee.last_name || ""

        if (!email) {
            return NextResponse.json(
                { error: { detail: "Employee has no email address" } },
                { status: 400 }
            )
        }

        const tempPassword = generateTempPassword()
        const oldUserId = employee.user

        // Step 2: Delete old user (if exists) so email becomes available
        let deleteSucceeded = false
        if (oldUserId) {
            try {
                const delRes = await fetch(`${base}/api/v1/users/${oldUserId}/`, {
                    method: "DELETE",
                    headers,
                    signal: AbortSignal.timeout(15_000),
                })
                deleteSucceeded = delRes.ok || delRes.status === 404
                if (!deleteSucceeded) {
                    const delErr = await delRes.json().catch(() => ({}))
                    console.error(`DELETE user ${oldUserId} failed (${delRes.status}):`, JSON.stringify(delErr))
                }
            } catch (e) {
                console.error(`DELETE user ${oldUserId} network error:`, e)
            }

            // If delete failed, we can't create a new user with the same email
            if (!deleteSucceeded) {
                return NextResponse.json(
                    { error: { detail: "Could not remove old user account. Please try again." } },
                    { status: 500 }
                )
            }
        }

        // Step 3: Create new user with the temp password
        let newUserId: string | null = null
        const createRes = await fetch(`${base}/api/v1/users/`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                email,
                password: tempPassword,
                first_name: firstName,
                last_name: lastName,
                is_tenant_admin: false,
            }),
            signal: AbortSignal.timeout(15_000),
        })

        if (createRes.ok) {
            const createJson = await createRes.json()
            const userData = createJson.data || createJson
            newUserId = (userData.id as string) || null
        } else {
            const errJson = await createRes.json().catch(() => ({}))
            const detail = JSON.stringify(errJson)
            console.error(`CREATE user for ${email} failed:`, detail)
            return NextResponse.json(
                { error: { detail: `Failed to create user account. ${detail.includes("already exists") ? "A user with this email already exists." : "Please try again."}` } },
                { status: 500 }
            )
        }

        // Step 4: Link new user to employee
        if (newUserId) {
            try {
                const linkRes = await fetch(`${base}/api/v1/employees/${id}/`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ user: newUserId }),
                    signal: AbortSignal.timeout(15_000),
                })
                if (!linkRes.ok) {
                    console.error(`Link user ${newUserId} to employee ${id} failed`)
                }
            } catch {
                console.error(`Link user network error`)
            }
        }

        return NextResponse.json({
            data: {
                employeeId: id,
                email,
                tempPassword,
                userCreated: !!newUserId,
            },
        })
    } catch (err) {
        console.error("Credentials route error:", err)
        return NextResponse.json(
            { error: { detail: "Failed to reach Django backend" } },
            { status: 502 }
        )
    }
}

export async function GET() {
    return NextResponse.json(
        { error: { detail: "Use POST to reset credentials" } },
        { status: 405 }
    )
}

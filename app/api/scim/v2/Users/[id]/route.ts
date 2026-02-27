import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function verifyScim(req: Request) {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return null
    const token = authHeader.substring(7)
    return await prisma.organization.findFirst({ where: { scimSecret: token } })
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const org = await verifyScim(req)
    if (!org) return new Response(JSON.stringify({ detail: "Unauthorized", status: "401" }), { status: 401 })

    try {
        const user = await prisma.user.findFirst({
            where: { id: params.id, organizationId: org.id },
            include: { employee: true }
        })

        if (!user) return new Response(JSON.stringify({ detail: "Not Found", status: "404" }), { status: 404 })

        return NextResponse.json({
            schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
            id: user.id,
            userName: user.email,
            name: {
                formatted: user.name,
                familyName: user.employee?.lastName || "",
                givenName: user.employee?.firstName || ""
            },
            emails: [{ value: user.email, primary: true }],
            active: user.employee?.status === "ACTIVE",
            meta: {
                resourceType: "User",
                created: user.createdAt,
                lastModified: user.updatedAt,
                location: `${req.url}`
            }
        })
    } catch (error) {
        return new Response(JSON.stringify({ detail: "Internal Error", status: "500" }), { status: 500 })
    }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const org = await verifyScim(req)
    if (!org) return new Response(JSON.stringify({ detail: "Unauthorized", status: "401" }), { status: 401 })

    try {
        const body = await req.json()
        const user = await prisma.user.findFirst({ where: { id: params.id, organizationId: org.id } })
        if (!user) return new Response(JSON.stringify({ detail: "Not Found", status: "404" }), { status: 404 })

        // Simplify PATCH handling for 'active' attribute
        const activeOp = body.Operations?.find((op: any) => op.path === "active")
        if (activeOp) {
            const isActive = activeOp.value === true || activeOp.value === "true"
            await prisma.employee.update({
                where: { userId: user.id },
                data: { status: isActive ? "ACTIVE" : "TERMINATED" }
            })
        }

        return new Response(null, { status: 204 })
    } catch (error) {
        return new Response(JSON.stringify({ detail: "Internal Error", status: "500" }), { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const org = await verifyScim(req)
    if (!org) return new Response(JSON.stringify({ detail: "Unauthorized", status: "401" }), { status: 401 })

    try {
        const user = await prisma.user.findFirst({ where: { id: params.id, organizationId: org.id } })
        if (!user) return new Response(JSON.stringify({ detail: "Not Found", status: "404" }), { status: 404 })

        // In HRMS, we usually soft-delete or Terminate instead of hard deleting
        await prisma.employee.update({
            where: { userId: user.id },
            data: { status: "TERMINATED" }
        })

        return new Response(null, { status: 204 })
    } catch (error) {
        return new Response(JSON.stringify({ detail: "Internal Error", status: "500" }), { status: 500 })
    }
}

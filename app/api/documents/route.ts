import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { documentSchema } from "@/lib/schemas"

// GET /api/documents – List documents (scoped by role)
// Admin: sees all documents | Employee: sees only their own
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const isAdmin = session.user.role === "ADMIN"

        let where = {}
        if (!isAdmin) {
            // Employee: only their own documents + public documents
            const employee = await prisma.employee.findFirst({
                where: { userId: session.user.id },
                select: { id: true },
            })
            if (!employee) {
                return NextResponse.json({ error: "No employee profile linked" }, { status: 400 })
            }
            where = {
                OR: [
                    { employeeId: employee.id },
                    { isPublic: true },
                ],
            }
        }

        const documents = await prisma.document.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { uploadDate: "desc" },
        })
        return NextResponse.json(documents)
    } catch (error) {
        console.error("[DOCUMENTS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/documents – Upload document metadata (admin only for bulk, employees for self)
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const isAdmin = session.user.role === "ADMIN"
        const body = await req.json()

        // Bulk mode: admin only
        if (Array.isArray(body.employeeIds) && body.employeeIds.length > 0) {
            if (!isAdmin) {
                return NextResponse.json({ error: "Only admins can bulk-assign documents" }, { status: 403 })
            }
            // For bulk, we validate the base document schema (omitting employeeId since we iterate)
            const parseResult = documentSchema.omit({ employeeId: true }).safeParse(body)
            if (!parseResult.success) {
                return NextResponse.json(
                    { error: "Validation Error", details: parseResult.error.format() },
                    { status: 400 }
                )
            }
            const data = parseResult.data

            const docs = await Promise.all(
                body.employeeIds.map((empId: string) =>
                    prisma.document.create({
                        data: {
                            title: data.title,
                            category: data.category,
                            url: data.url,
                            size: data.size || null,
                            isPublic: data.isPublic ?? false,
                            employeeId: empId,
                        },
                        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
                    })
                )
            )
            return NextResponse.json(docs, { status: 201 })
        }

        const singleParse = documentSchema.safeParse(body)
        if (!singleParse.success) {
            return NextResponse.json(
                { error: "Validation Error", details: singleParse.error.format() },
                { status: 400 }
            )
        }

        // Single document — employees can only create for themselves
        let employeeId = singleParse.data.employeeId || null
        if (!isAdmin) {
            const employee = await prisma.employee.findFirst({
                where: { userId: session.user.id },
                select: { id: true },
            })
            if (!employee) {
                return NextResponse.json({ error: "No employee profile linked" }, { status: 400 })
            }
            employeeId = employee.id // Force to own ID
        }

        const document = await prisma.document.create({
            data: {
                title: singleParse.data.title,
                category: singleParse.data.category,
                url: singleParse.data.url,
                size: singleParse.data.size || null,
                isPublic: singleParse.data.isPublic ?? false,
                employeeId,
            },
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        })

        return NextResponse.json(document, { status: 201 })
    } catch (error) {
        console.error("[DOCUMENTS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

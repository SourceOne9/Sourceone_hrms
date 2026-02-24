import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/documents – List all documents
export async function GET() {
    try {
        const documents = await prisma.document.findMany({
            include: { employee: true },
            orderBy: { uploadDate: "desc" },
        })
        return NextResponse.json(documents)
    } catch (error) {
        console.error("[DOCUMENTS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/documents – Upload document metadata (supports bulk: employeeIds array)
export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Bulk mode: create one document per employee
        if (Array.isArray(body.employeeIds) && body.employeeIds.length > 0) {
            const docs = await Promise.all(
                body.employeeIds.map((empId: string) =>
                    prisma.document.create({
                        data: {
                            title: body.title,
                            category: body.category,
                            url: body.url,
                            size: body.size || null,
                            isPublic: body.isPublic ?? false,
                            employeeId: empId,
                        },
                        include: { employee: true },
                    })
                )
            )
            return NextResponse.json(docs, { status: 201 })
        }

        // Single document
        const document = await prisma.document.create({
            data: {
                title: body.title,
                category: body.category,
                url: body.url,
                size: body.size || null,
                isPublic: body.isPublic ?? false,
                employeeId: body.employeeId || null,
            },
            include: { employee: true },
        })

        return NextResponse.json(document, { status: 201 })
    } catch (error) {
        console.error("[DOCUMENTS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

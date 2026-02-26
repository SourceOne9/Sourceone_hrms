import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { announcementSchema } from "@/lib/schemas"

// GET /api/announcements – List announcements
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const announcements = await prisma.announcement.findMany({
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            take: 100,
        })

        return NextResponse.json(announcements, {
            headers: {
                "Cache-Control": "s-maxage=60, stale-while-revalidate=300"
            }
        })
    } catch (error) {
        console.error("[ANNOUNCEMENTS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/announcements – Create an announcement
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const parsed = announcementSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        const announcement = await prisma.announcement.create({
            data: {
                title: parsed.data.title,
                content: parsed.data.content,
                author: parsed.data.author || session.user?.name || "Admin",
                category: parsed.data.category,
                priority: parsed.data.priority,
                isPinned: parsed.data.isPinned,
            },
        })

        return NextResponse.json(announcement, { status: 201 })
    } catch (error) {
        console.error("[ANNOUNCEMENTS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/announcements – Delete an announcement (by id in query)
export async function DELETE(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        await prisma.announcement.delete({ where: { id } })

        return NextResponse.json({ message: "Deleted" })
    } catch (error) {
        console.error("[ANNOUNCEMENTS_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
// PUT /api/announcements – Update an announcement
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const { id, ...data } = body

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        // Ensure author field is preserved on updates if required
        const partialParsed = announcementSchema.partial().safeParse(data)
        if (!partialParsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: partialParsed.error.format() },
                { status: 400 }
            )
        }

        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                title: partialParsed.data.title,
                content: partialParsed.data.content,
                category: partialParsed.data.category,
                priority: partialParsed.data.priority,
                isPinned: partialParsed.data.isPinned,
            },
        })

        return NextResponse.json(announcement)
    } catch (error) {
        console.error("[ANNOUNCEMENTS_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

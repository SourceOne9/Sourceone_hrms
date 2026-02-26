import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { eventSchema } from "@/lib/schemas"

// GET /api/events – List calendar events
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const events = await prisma.calendarEvent.findMany({
            orderBy: { start: "asc" },
            take: 200,
        })

        return NextResponse.json(events, {
            headers: {
                "Cache-Control": "s-maxage=60, stale-while-revalidate=300"
            }
        })
    } catch (error) {
        console.error("[EVENTS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/events – Create a calendar event
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const parsed = eventSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        const event = await prisma.calendarEvent.create({
            data: {
                title: parsed.data.title,
                start: parsed.data.start,
                end: parsed.data.end,
                allDay: parsed.data.allDay,
                type: parsed.data.type,
            },
        })

        return NextResponse.json(event, { status: 201 })
    } catch (error) {
        console.error("[EVENTS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/events – Delete an event
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

        await prisma.calendarEvent.delete({ where: { id } })

        return NextResponse.json({ message: "Deleted" })
    } catch (error) {
        console.error("[EVENTS_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

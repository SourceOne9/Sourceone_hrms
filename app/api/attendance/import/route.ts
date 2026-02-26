import { NextResponse } from "next/server"
import { queue } from "@/lib/queue"

// POST /api/attendance/import
export async function POST(req: Request) {
    try {
        const { rows } = await req.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No rows provided" }, { status: 400 })
        }

        const jobId = await queue.enqueue("ATTENDANCE_IMPORT", rows)

        // Return immediately with 202 Accepted, and notify client that jobs are queued.
        return NextResponse.json(
            { message: `Accepted ${rows.length} rows for background processing`, jobId, status: "queued" },
            { status: 202 }
        )
    } catch (error) {
        console.error("[ATTENDANCE_IMPORT]", error)
        return NextResponse.json({ error: "Job enqueue failed" }, { status: 500 })
    }
}


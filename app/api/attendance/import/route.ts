import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/attendance/import
export async function POST(req: Request) {
    try {
        const { rows } = await req.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No rows provided" }, { status: 400 })
        }

        let inserted = 0
        let skipped = 0

        for (const row of rows) {
            try {
                const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                const employee = await prisma.employee.findFirst({
                    where: employeeCode
                        ? { employeeCode }
                        : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" } }
                })
                if (!employee) { skipped++; continue }

                const dateRaw = String(row["date"] || row["Date"] || "").trim()
                const date = dateRaw ? new Date(dateRaw) : null
                if (!date || isNaN(date.getTime())) { skipped++; continue }

                const checkInRaw = row["checkIn"] || row["Check In"]
                const checkOutRaw = row["checkOut"] || row["Check Out"]
                const checkIn = checkInRaw ? new Date(checkInRaw) : null
                const checkOut = checkOutRaw ? new Date(checkOutRaw) : null
                const workHours = parseFloat(String(row["workHours"] || row["Work Hours"] || 0)) || null
                const statusRaw = String(row["status"] || row["Status"] || "PRESENT").trim().toUpperCase()
                const validStatuses = ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "WEEKEND"]
                const status = validStatuses.includes(statusRaw) ? statusRaw as any : "PRESENT"

                await prisma.attendance.create({
                    data: {
                        employeeId: employee.id,
                        date,
                        checkIn: checkIn && !isNaN(checkIn.getTime()) ? checkIn : null,
                        checkOut: checkOut && !isNaN(checkOut.getTime()) ? checkOut : null,
                        workHours,
                        status,
                    }
                })
                inserted++
            } catch { skipped++ }
        }

        return NextResponse.json({ inserted, skipped })
    } catch (error) {
        console.error("[ATTENDANCE_IMPORT]", error)
        return NextResponse.json({ error: "Import failed" }, { status: 500 })
    }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/pf/import
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

                const month = String(row["month"] || row["Month"] || "").trim()
                const accountNumber = String(row["accountNumber"] || row["Account Number"] || "").trim()
                const basicSalary = parseFloat(String(row["basicSalary"] || row["Basic Salary"] || 0))
                const employeeContribution = parseFloat(String(row["employeeContribution"] || row["Employee Contribution"] || 0))
                const employerContribution = parseFloat(String(row["employerContribution"] || row["Employer Contribution"] || 0))
                const totalContribution = parseFloat(String(row["totalContribution"] || row["Total Contribution"] || 0)) || employeeContribution + employerContribution
                const status = String(row["status"] || row["Status"] || "Credited").trim()

                await prisma.providentFund.create({
                    data: { employeeId: employee.id, month, accountNumber, basicSalary, employeeContribution, employerContribution, totalContribution, status }
                })
                inserted++
            } catch { skipped++ }
        }

        return NextResponse.json({ inserted, skipped })
    } catch (error) {
        console.error("[PF_IMPORT]", error)
        return NextResponse.json({ error: "Import failed" }, { status: 500 })
    }
}

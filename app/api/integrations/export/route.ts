import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { getSessionEmployee } from "@/lib/session-employee"
import { generateExport } from "@/lib/export/accounting"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        const employee = await getSessionEmployee()
        if (!session?.user?.id || !employee) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "HR_MANAGER") {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        const { searchParams } = new URL(req.url)
        const platform = searchParams.get("platform")?.toUpperCase() as "QUICKBOOKS" | "XERO"
        const month = searchParams.get("month") // e.g., "2024-03"

        if (!platform || (platform !== "QUICKBOOKS" && platform !== "XERO")) {
            return apiError("Invalid platform", ApiErrorCode.BAD_REQUEST, 400)
        }

        if (!month) {
            return apiError("Month is required", ApiErrorCode.BAD_REQUEST, 400)
        }

        const payrolls = await prisma.payroll.findMany({
            where: {
                organizationId: employee.organizationId,
                month,
                status: "PAID"
            },
            include: {
                employee: {
                    select: {
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        })

        if (payrolls.length === 0) {
            return apiError("No finalized payroll found for this month", ApiErrorCode.NOT_FOUND, 404)
        }

        const csvContent = generateExport(platform, payrolls)

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename=payroll_${platform.toLowerCase()}_${month}.csv`
            }
        })
    } catch (error) {
        console.error("[EXPORT_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

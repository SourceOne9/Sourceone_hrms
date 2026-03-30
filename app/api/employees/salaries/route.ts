/**
 * /api/employees/salaries — File-backed salary store.
 *
 * Django's Employee model has no salary field. This route manages salary
 * data via a JSON file that persists across server restarts.
 *
 * GET  → { data: Record<employeeId, number> }
 * POST → { employeeId, salary } or { entries: [{ employeeId, salary }] }
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { salaryStore } from "@/lib/salary-store"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

const salarySingleSchema = z.object({
    employeeId: z.string().uuid(),
    salary: z.union([z.number(), z.string()]),
})

const salaryBatchSchema = z.object({
    entries: z.array(z.object({
        employeeId: z.string().uuid(),
        salary: z.union([z.number(), z.string()]),
    })).min(1).max(5000),
})

async function handleGET() {
    return NextResponse.json({ data: salaryStore.getAll() })
}

async function handlePOST(req: Request) {
    try {
        const body = await req.json()

        // Batch mode: { entries: [{ employeeId, salary }] }
        if (Array.isArray(body.entries)) {
            const parsed = salaryBatchSchema.safeParse(body)
            if (!parsed.success) {
                return NextResponse.json(
                    { error: { detail: parsed.error.issues.map(i => i.message).join("; ") } },
                    { status: 400 }
                )
            }
            salaryStore.setBatch(
                parsed.data.entries.map((e) => ({
                    employeeId: e.employeeId,
                    salary: Number(e.salary) || 0,
                }))
            )
            return NextResponse.json({ data: { updated: parsed.data.entries.length } })
        }

        // Single mode: { employeeId, salary }
        const parsed = salarySingleSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: { detail: parsed.error.issues.map(i => i.message).join("; ") } },
                { status: 400 }
            )
        }
        salaryStore.set(parsed.data.employeeId, Number(parsed.data.salary) || 0)
        return NextResponse.json({ data: { employeeId: parsed.data.employeeId, salary: Number(parsed.data.salary) } })
    } catch {
        return NextResponse.json(
            { error: { detail: "Invalid request body" } },
            { status: 400 }
        )
    }
}

export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, handlePOST)

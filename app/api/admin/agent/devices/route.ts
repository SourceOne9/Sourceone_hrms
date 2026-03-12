import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { adminDeviceListSchema, adminDeviceUpdateSchema } from "@/lib/schemas/agent"

// GET /api/admin/agent/devices — List all agent devices for the organization
export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const parsed = adminDeviceListSchema.safeParse(Object.fromEntries(searchParams))
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const { status, search, page, limit } = parsed.data
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = orgFilter(ctx)
        if (status) where.status = status
        if (search) {
            where.OR = [
                { deviceName: { contains: search, mode: "insensitive" } },
                { employee: { firstName: { contains: search, mode: "insensitive" } } },
                { employee: { lastName: { contains: search, mode: "insensitive" } } },
            ]
        }

        const [devices, total] = await Promise.all([
            prisma.agentDevice.findMany({
                where,
                include: {
                    employee: {
                        select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.agentDevice.count({ where }),
        ])

        return apiSuccess(devices, { total, page, limit })
    } catch (error: unknown) {
        console.error("[ADMIN_AGENT_DEVICES_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PATCH /api/admin/agent/devices — Approve or suspend a device
export const PATCH = withAuth({ module: Module.AGENT_TRACKING, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = adminDeviceUpdateSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const device = await prisma.agentDevice.findFirst({
            where: orgFilter(ctx, { id: parsed.data.deviceId }),
        })
        if (!device) {
            return apiError("Device not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const updated = await prisma.agentDevice.update({
            where: { id: parsed.data.deviceId },
            data: { status: parsed.data.status },
        })

        return apiSuccess(updated)
    } catch (error: unknown) {
        console.error("[ADMIN_AGENT_DEVICES_PATCH]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

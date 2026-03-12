import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { agentRegisterSchema } from "@/lib/schemas/agent"
import crypto from "node:crypto"

// POST /api/agent/register — Employee registers a desktop agent device
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const { id: userId, organizationId } = session.user as {
            id: string; organizationId: string | null
        }
        if (!organizationId) {
            return apiError("Organization required", ApiErrorCode.FORBIDDEN, 403)
        }

        const body = await req.json()
        const parsed = agentRegisterSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        // Find the employee record for this user
        const employee = await prisma.employee.findFirst({
            where: { userId, organizationId },
            select: { id: true },
        })
        if (!employee) {
            return apiError("Employee record not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Check if fingerprint already registered
        const existing = await prisma.agentDevice.findUnique({
            where: { fingerprint: parsed.data.fingerprint },
        })
        if (existing) {
            return apiError("Device already registered", ApiErrorCode.CONFLICT, 409)
        }

        const apiKey = `agent_${crypto.randomUUID()}`

        const device = await prisma.agentDevice.create({
            data: {
                employeeId: employee.id,
                organizationId,
                deviceName: parsed.data.deviceName,
                platform: parsed.data.platform,
                fingerprint: parsed.data.fingerprint,
                apiKey,
                agentVersion: parsed.data.agentVersion,
                status: "ACTIVE", // Auto-approve; change to PENDING if admin approval needed
            },
        })

        return apiSuccess({
            deviceId: device.id,
            apiKey,
            status: device.status,
        })
    } catch (error: unknown) {
        console.error("[AGENT_REGISTER]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}

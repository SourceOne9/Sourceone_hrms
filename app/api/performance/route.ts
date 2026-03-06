import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action, Roles } from "@/lib/permissions"
import { performanceReviewSchema } from "@/lib/schemas"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/performance – List performance reviews (role-scoped)
export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")
        const formType = searchParams.get("formType")

        const where: Record<string, unknown> = orgFilter(ctx)

        // Role-based scoping
        if (ctx.role === Roles.TEAM_LEAD) {
            // Team lead sees reviews they created + reviews about them
            if (ctx.employeeId) {
                where.OR = [
                    { reviewerId: ctx.employeeId },
                    { employeeId: ctx.employeeId },
                ]
            }
        } else if (ctx.role === Roles.EMPLOYEE) {
            // Employee sees only reviews about them
            if (ctx.employeeId) {
                where.employeeId = ctx.employeeId
            }
        }
        // CEO/HR see all reviews in org (no additional filter)

        if (employeeId) where.employeeId = employeeId
        if (formType) where.formType = formType

        const reviews = await prisma.performanceReview.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        designation: true,
                        department: { select: { name: true } },
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { reviewDate: "desc" },
            take: 200,
        })

        return apiSuccess(reviews)
    } catch (error) {
        console.error("[PERFORMANCE_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/performance – Create a performance review
export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = performanceReviewSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const review = await prisma.performanceReview.create({
            data: {
                rating: parsed.data.rating,
                progress: parsed.data.progress,
                comments: parsed.data.comments,
                reviewDate: parsed.data.reviewDate || new Date(),
                status: parsed.data.status,
                employeeId: parsed.data.employeeId,
                organizationId: ctx.organizationId,
                reviewerId: ctx.employeeId || parsed.data.reviewerId,
                reviewType: parsed.data.reviewType,
                reviewPeriod: parsed.data.reviewPeriod,
                formType: parsed.data.formType,
                formData: parsed.data.formData,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        })

        return apiSuccess(review, undefined, 201)
    } catch (error) {
        console.error("[PERFORMANCE_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

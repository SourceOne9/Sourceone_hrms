import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { assetSchema } from "@/lib/schemas"

// GET /api/assets – List all assets
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const assets = await prisma.asset.findMany({
            include: { assignedTo: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(assets)
    } catch (error) {
        console.error("[ASSETS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/assets – Create a new asset
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const parsed = assetSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        const asset = await prisma.asset.create({
            data: {
                name: parsed.data.name,
                type: parsed.data.type,
                serialNumber: parsed.data.serialNumber,
                status: body.status || "AVAILABLE", // Status is not in create schema payload natively
                purchaseDate: parsed.data.purchaseDate,
                value: parsed.data.value,
                image: parsed.data.image,
                assignedToId: parsed.data.assignedToId || null,
                assignedDate: body.assignedDate ? new Date(body.assignedDate) : null,
            },
            include: { assignedTo: true },
        })

        return NextResponse.json(asset, { status: 201 })
    } catch (error) {
        console.error("[ASSETS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File
        const bucket = formData.get("bucket") as string

        if (!file || !bucket) {
            return NextResponse.json({ error: "File and bucket are required" }, { status: 400 })
        }

        // Validate bucket name against allowed buckets
        const allowedBuckets = ["avatars", "documents", "assets", "training"]
        if (!allowedBuckets.includes(bucket)) {
            return NextResponse.json({ error: "Invalid bucket name" }, { status: 400 })
        }

        // Create a unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: false
            })

        if (error) {
            console.error("[UPLOAD_ERROR]", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return NextResponse.json({
            url: publicUrl,
            path: data.path,
            name: file.name,
            size: file.size,
            type: file.type
        })

    } catch (error: any) {
        console.error("[UPLOAD_API_ERROR]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

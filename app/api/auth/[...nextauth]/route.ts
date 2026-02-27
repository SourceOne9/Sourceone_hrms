import { handlers } from "@/lib/auth"

export const runtime = "nodejs"

// Wrap NextAuth to capture swallowed exceptions
const GET = async (req: any, ctx: any) => {
    try {
        return await handlers.GET(req, ctx)
    } catch (e) {
        console.error("NEXTAUTH_GET_CRASH:", e)
        throw e
    }
}

const POST = async (req: any, ctx: any) => {
    try {
        return await handlers.POST(req, ctx)
    } catch (e) {
        console.error("NEXTAUTH_POST_CRASH:", e)
        throw e
    }
}

export { GET, POST }

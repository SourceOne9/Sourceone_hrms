import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import * as dotenv from 'dotenv'

// Load environment variables for scripts that import this file outside of Next.js
dotenv.config()

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set!")
    }

    const isDev = process.env.NODE_ENV === "development"
    const logOptions: any = isDev ? ["error", "warn"] : ["error"]

    console.log("[Prisma] Initializing PrismaClient with driver-adapter.")

    // We intentionally don't keep a global connection pool in serverless except via cache,
    // but Next.js hot-reloads execute this module multiple times.
    const pool = new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 3000,
    })
    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        adapter,
        log: logOptions,
    })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma


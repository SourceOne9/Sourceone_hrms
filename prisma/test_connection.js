const { PrismaClient } = require("@prisma/client")
require('dotenv').config()

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL
        }
    }
})

async function test() {
    try {
        console.log("Connecting to:", process.env.DIRECT_URL)
        const result = await prisma.$queryRaw`SELECT 1`
        console.log("Connection successful:", result)
    } catch (err) {
        console.error("Connection failed:", err.message)
    } finally {
        await prisma.$disconnect()
    }
}

test()
